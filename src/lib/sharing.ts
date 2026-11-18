import { db } from "./db";
import type { ShareRole } from "./types";

/**
 * Owner-only sharing. The route always returns the same message whether or not
 * the email belongs to an account; see ARCHITECTURE.md for the UX tradeoff.
 */
export const SHARE_GRANTED_MESSAGE =
  "If that account exists, access has been granted.";

export const SELF_SHARE_MESSAGE = "You can't share a document with yourself.";

/**
 * Grants (or updates) access when the email belongs to an existing account.
 * Returns false without creating anything when it does not, or when the caller
 * is targeting themselves.
 */
export async function grantShare(input: {
  documentId: string;
  callerEmail: string;
  email: string;
  role: ShareRole;
}): Promise<boolean> {
  const email = input.email.trim().toLowerCase();

  if (email === input.callerEmail.trim().toLowerCase()) return false;

  const invitee = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!invitee) return false;

  // Re-sharing an existing collaborator updates their role.
  await db.share.upsert({
    where: {
      documentId_userId: { documentId: input.documentId, userId: invitee.id },
    },
    update: { role: input.role },
    create: {
      documentId: input.documentId,
      userId: invitee.id,
      role: input.role,
    },
    select: { id: true },
  });

  return true;
}
