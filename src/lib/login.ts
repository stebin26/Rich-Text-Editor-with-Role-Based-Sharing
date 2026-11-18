import bcrypt from "bcryptjs";

import { db } from "./db";
import type { PublicUser } from "./dto";
import { createSession } from "./session";

/**
 * Password authentication with a persistent lockout. Everything here is pure
 * DB + bcrypt (no cookies), so the route handler only has to set the cookie and
 * tests can drive it directly.
 */

export const BCRYPT_COST = 12;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

export const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";
export const LOCKED_MESSAGE =
  "Too many failed attempts. This account is temporarily locked — try again in about 15 minutes.";

/**
 * A real bcrypt hash (cost 12) of a throwaway string. Unknown emails still pay
 * for one compare so the response time does not advertise whether the account
 * exists. It is not a credential and matches no user's password.
 */
export const DUMMY_PASSWORD_HASH =
  "$2b$12$IUIc1WqvtA3glzuofNK/ouaS6oL1hxVDYT7cCh.b.j9r5N.OCRm4G";

export type AuthSuccess = {
  ok: true;
  user: PublicUser;
  token: string;
};

export type AuthFailure = {
  ok: false;
  status: 401 | 429;
  message: string;
};

export type AuthResult = AuthSuccess | AuthFailure;

export async function authenticate(
  emailInput: string,
  password: string,
): Promise<AuthResult> {
  const email = emailInput.trim().toLowerCase();
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      failedAttempts: true,
      lockedUntil: true,
    },
  });

  const now = new Date();

  if (!user) {
    // Same cost as a real check; the result is discarded.
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    return { ok: false, status: 401, message: INVALID_CREDENTIALS_MESSAGE };
  }

  if (user.lockedUntil && user.lockedUntil > now) {
    return { ok: false, status: 429, message: LOCKED_MESSAGE };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    // A past lockedUntil means that lockout has expired, so counting restarts.
    const previous = user.lockedUntil ? 0 : user.failedAttempts;
    const attempts = previous + 1;
    const locked = attempts >= MAX_FAILED_ATTEMPTS;

    await db.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: locked ? 0 : attempts,
        lockedUntil: locked ? new Date(now.getTime() + LOCKOUT_MS) : null,
      },
      select: { id: true },
    });

    return locked
      ? { ok: false, status: 429, message: LOCKED_MESSAGE }
      : { ok: false, status: 401, message: INVALID_CREDENTIALS_MESSAGE };
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null },
    select: { id: true },
  });

  const { token } = await createSession(user.id);

  return {
    ok: true,
    user: { id: user.id, name: user.name, email: user.email },
    token,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}
