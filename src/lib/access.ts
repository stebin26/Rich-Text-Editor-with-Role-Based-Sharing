/**
 * Pure permission rules. Kept free of database imports so they can be unit
 * tested without Prisma or a live database.
 */

export type Access = "OWNER" | "EDITOR" | "VIEWER" | null;

export type AccessRole = "EDITOR" | "VIEWER";

export type ShareLike = {
  userId: string;
  role: AccessRole;
};

/**
 * Owner always wins, otherwise the caller's share role decides. A stranger
 * gets null — callers translate that into a 404 so document existence is not
 * leaked.
 */
export function resolveAccess(
  ownerId: string,
  shares: readonly ShareLike[],
  userId: string,
): Access {
  if (ownerId === userId) return "OWNER";
  return shares.find((share) => share.userId === userId)?.role ?? null;
}

export function canEdit(access: Access): boolean {
  return access === "OWNER" || access === "EDITOR";
}

export function canManageSharing(access: Access): boolean {
  return access === "OWNER";
}

/** Owners, editors and viewers may export; strangers have no access at all. */
export function canExport(access: Access): boolean {
  return access === "OWNER" || access === "EDITOR" || access === "VIEWER";
}
