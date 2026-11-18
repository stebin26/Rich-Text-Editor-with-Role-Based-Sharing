import { NextResponse } from "next/server";

import { crossOrigin, jsonError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { isSameOrigin } from "@/lib/csrf";
import { db } from "@/lib/db";
import {
  convertFileToHtml,
  getExtension,
  hasZipSignature,
  isSupportedExtension,
  MAX_IMPORT_BYTES,
  titleFromFilename,
} from "@/lib/import";

// mammoth needs Node APIs, so this handler must not run on the edge runtime.
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOrigin();

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "Expected a multipart form upload.");
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return jsonError(400, "Attach a file to import.");
  }

  if (file.size === 0) {
    return jsonError(400, "That file is empty.");
  }

  if (file.size > MAX_IMPORT_BYTES) {
    return jsonError(413, "File is too large. Maximum size is 2 MB.");
  }

  const extension = getExtension(file.name);
  if (!isSupportedExtension(extension)) {
    return jsonError(400, "Unsupported file type. Supported: .txt, .md, .docx");
  }

  let content: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // A .docx is a ZIP container; reject anything else before mammoth sees it.
    if (extension === ".docx" && !hasZipSignature(buffer)) {
      return jsonError(
        400,
        "That file isn't a valid .docx document (missing ZIP signature).",
      );
    }

    content = await convertFileToHtml(file.name, buffer);
  } catch {
    // No file contents, names or buffers in logs.
    console.error("Import failed");
    return jsonError(
      422,
      "We couldn't read that file. Is it a valid .txt, .md or .docx document?",
    );
  }

  const document = await db.document.create({
    data: {
      title: titleFromFilename(file.name),
      content,
      ownerId: user.id,
    },
    select: { id: true, title: true },
  });

  return NextResponse.json({ id: document.id, title: document.title }, { status: 201 });
}
