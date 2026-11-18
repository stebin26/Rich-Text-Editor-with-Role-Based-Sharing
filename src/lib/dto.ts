/**
 * Response shapes. Every query that reaches a route serializes users through
 * these selects, so a password hash or session token can never be selected by
 * accident. Deliberately free of "server-only" so tests and route handlers can
 * share it.
 */

export const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
} as const;

/** Owners shown to editors/viewers: display name only, no email. */
export const OWNER_PUBLIC_SELECT = {
  id: true,
  name: true,
} as const;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
};

export type OwnerPublic = {
  id: string;
  name: string;
};

export function toPublicUser(user: PublicUser): PublicUser {
  return { id: user.id, name: user.name, email: user.email };
}
