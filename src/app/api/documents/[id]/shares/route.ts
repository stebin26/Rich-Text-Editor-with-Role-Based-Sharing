import { NextResponse } from "next/server";

import {
  crossOrigin,
  firstIssue,
  jsonError,
  notFoundDocument,
  readJson,
  unauthorized,
} from "@/lib/api";
import { canManageSharing } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { isSameOrigin } from "@/lib/csrf";
import { db } from "@/lib/db";
import { getAccess, listShares } from "@/lib/documents";
import {
  SELF_SHARE_MESSAGE,
  SHARE_GRANTED_MESSAGE,
  grantShare,
} from "@/lib/sharing";
import { revokeShareSchema, shareRequestSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Owner-only invite / role change. The response is identical whether or not the
 * email has an account, so this endpoint cannot be used to enumerate users.
 * The collaborator list in the same response is what keeps the dialog accurate.
 */
export async function POST(request: Request, context: RouteContext) {
  if (!isSameOrigin(request)) return crossOrigin();

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  const access = await getAccess(user.id, id);
  if (!access) return notFoundDocument();
  if (!canManageSharing(access)) {
    return jsonError(403, "Only the owner can manage sharing.");
  }

  const parsed = shareRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, firstIssue(parsed.error));

  if (parsed.data.email.trim().toLowerCase() === user.email.toLowerCase()) {
    return jsonError(400, SELF_SHARE_MESSAGE);
  }

  await grantShare({
    documentId: id,
    callerEmail: user.email,
    email: parsed.data.email,
    role: parsed.data.role,
  });

  return NextResponse.json({
    message: SHARE_GRANTED_MESSAGE,
    shares: await listShares(id),
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!isSameOrigin(request)) return crossOrigin();

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  const access = await getAccess(user.id, id);
  if (!access) return notFoundDocument();
  if (!canManageSharing(access)) {
    return jsonError(403, "Only the owner can manage sharing.");
  }

  const parsed = revokeShareSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, firstIssue(parsed.error));

  const removed = await db.share.deleteMany({
    where: { documentId: id, userId: parsed.data.userId },
  });

  if (removed.count === 0) {
    return jsonError(404, "That person doesn't have access to this document.");
  }

  return NextResponse.json({ shares: await listShares(id) });
}
