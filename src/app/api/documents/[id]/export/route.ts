import { NextResponse } from "next/server";

import { notFoundDocument, unauthorized } from "@/lib/api";
import { canExport } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccess } from "@/lib/documents";
import { exportFilename, htmlToMarkdown } from "@/lib/export";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/documents/:id/export — Markdown download. Owners, editors and
 * viewers may export; anyone else gets the same 404 as a missing document.
 */
export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  const access = await getAccess(user.id, id);
  if (!canExport(access)) return notFoundDocument();

  const document = await db.document.findUnique({
    where: { id },
    select: { title: true, content: true },
  });

  if (!document) return notFoundDocument();

  return new NextResponse(htmlToMarkdown(document.content), {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${exportFilename(document.title)}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
