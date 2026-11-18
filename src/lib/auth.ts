import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  SESSION_COOKIE,
  resolveSession,
  type SessionUser,
} from "./session";

export { SESSION_COOKIE };
export type { SessionUser };

/**
 * Reads the session token from the httpOnly cookie and resolves it against the
 * Session table. A cookie containing a raw user id (the previous mock) no
 * longer authenticates anyone.
 */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  return resolveSession(await getSessionToken());
}

/** For pages: send anonymous visitors to the login screen, preserving the path. */
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  return user;
}
