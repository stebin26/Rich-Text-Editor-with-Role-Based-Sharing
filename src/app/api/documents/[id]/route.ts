import { NextResponse } from "next/server";

import {
  crossOrigin,
  firstIssue,
  jsonError,
  notFoundDocument,
  readJson,
  unauthorized,
} from "@/lib/api";
import { canEdit, canManageSharing } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { isSameOrigin } from "@/lib/csrf";
import { db } from "@/lib/db";
import { getAccess, listShares } from "@/lib/documents";
import { PUBLIC_USER_SELECT } from "@/lib/dto";
import { sanitizeDocumentHtml } from "@/lib/sanitize";
import { updateDocumentSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  const access = await getAccess(user.id, id);
  // 404 rather than 403 so strangers cannot probe for document ids.
  if (!access) return notFoundDocument();

  const document = await db.document.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      updatedAt: true,
      owner: { select: { id: true, name: true } },
    },
  });

  if (!document) return notFoundDocument();

  // Only the owner sees collaborator emails; editors and viewers get the
  // owner's display name and nothing about anyone else.
  if (access === "OWNER") {
    const [shares, owner] = await Promise.all([
      listShares(id),
      db.user.findUnique({ where: { id: document.owner.id }, select: PUBLIC_USER_SELECT }),
    ]);

    return NextResponse.json({
      document: { ...document, owner: owner ?? document.owner, access, shares },
    });
  }

  return NextResponse.json({
    document: { ...document, access, shares: [] },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!isSameOrigin(request)) return crossOrigin();

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  const access = await getAccess(user.id, id);
  if (!access) return notFoundDocument();
  if (!canEdit(access)) {
    return jsonError(403, "You have view-only access to this document.");
  }

  const parsed = updateDocumentSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, firstIssue(parsed.error));

  const data: { title?: string; content?: string } = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.content !== undefined) {
    // Stored HTML is always sanitized server-side, never trusted from the client.
    data.content = sanitizeDocumentHtml(parsed.data.content);
  }

  const document = await db.document.update({
    where: { id },
    data,
    select: { id: true, title: true, content: true, updatedAt: true },
  });

  return NextResponse.json({ document });
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!isSameOrigin(request)) return crossOrigin();

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  const access = await getAccess(user.id, id);
  if (!access) return notFoundDocument();
  if (!canManageSharing(access)) {
    return jsonError(403, "Only the owner can delete this document.");
  }

  await db.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
