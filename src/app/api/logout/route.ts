import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { crossOrigin } from "@/lib/api";
import { isSameOrigin } from "@/lib/csrf";
import { SESSION_COOKIE, deleteSession } from "@/lib/session";

/** Deletes this device's session row, then clears the cookie. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOrigin();

  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  await deleteSession(token);

  store.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
