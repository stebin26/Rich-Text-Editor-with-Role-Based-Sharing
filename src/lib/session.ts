import { createHash, randomBytes } from "node:crypto";

import { SESSION_COOKIE } from "./cookies";
import { db } from "./db";
import { PUBLIC_USER_SELECT, type PublicUser } from "./dto";

export { SESSION_COOKIE };

/**
 * DB-backed sessions. The cookie holds a random 32-byte token; only its SHA-256
 * hash is stored, so a database leak does not hand over usable sessions and a
 * cookie containing a user id is worthless.
 */

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const SESSION_TTL_MS = SESSION_MAX_AGE_SECONDS * 1000;

export type SessionUser = PublicUser;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createSession(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
    select: { id: true },
  });

  return { token, expiresAt };
}

/**
 * Looks the token hash up in the database and rejects missing, forged,
 * tampered or expired tokens. Expired rows are ignored rather than deleted:
 * this also runs during server-component render, where cookies/DB cleanup must
 * not be attempted.
 */
export async function resolveSession(
  token: string | null | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      user: { select: PUBLIC_USER_SELECT },
    },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;

  return session.user;
}

/** Deletes exactly one session row; logout never affects other devices. */
export async function deleteSession(token: string | null | undefined): Promise<void> {
  if (!token) return;
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}
