import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/** Body parsing must never throw a 500 for malformed or missing JSON. */
export async function readJson(request: Request): Promise<unknown | null> {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

export function firstIssue(error: ZodError): string {
  return error.issues[0]?.message ?? "Invalid request.";
}

export function unauthorized() {
  return jsonError(401, "You need to sign in to do that.");
}

export const CROSS_ORIGIN_MESSAGE = "Cross-origin request rejected.";

/** Every cookie-authenticated mutation answers this when Origin doesn't match Host. */
export function crossOrigin() {
  return jsonError(403, CROSS_ORIGIN_MESSAGE);
}

export function notFoundDocument() {
  return jsonError(404, "Document not found.");
}
