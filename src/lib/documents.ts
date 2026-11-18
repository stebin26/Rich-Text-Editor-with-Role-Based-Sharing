import { db } from "./db";
import { resolveAccess, type Access } from "./access";
import type { ShareView } from "./types";

/**
 * The single access check every document route/page funnels through.
 * Returns null when the document is missing *or* the user has no access, so
 * callers can answer 404 for both.
 */
export async function getAccess(
  userId: string,
  documentId: string,
): Promise<Access> {
  const document = await db.document.findUnique({
    where: { id: documentId },
    select: {
      ownerId: true,
      shares: { select: { userId: true, role: true } },
    },
  });

  if (!document) return null;
  return resolveAccess(document.ownerId, document.shares, userId);
}

/**
 * Owner-facing collaborator list. Emails are included because only the owner
 * may call this (the share routes and the owner's document page).
 */
export async function listShares(documentId: string): Promise<ShareView[]> {
  const shares = await db.share.findMany({
    where: { documentId },
    orderBy: { user: { name: "asc" } },
    select: {
      userId: true,
      role: true,
      user: { select: { name: true, email: true } },
    },
  });

  return shares.map((share) => ({
    userId: share.userId,
    name: share.user.name,
    email: share.user.email,
    role: share.role,
  }));
}
