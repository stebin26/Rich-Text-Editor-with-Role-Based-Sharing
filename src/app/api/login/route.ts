import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { crossOrigin, firstIssue, jsonError, readJson } from "@/lib/api";
import { isSameOrigin } from "@/lib/csrf";
import { authenticate } from "@/lib/login";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

/**
 * Email + password sign-in. The response deliberately says
 * "Invalid email or password" for both an unknown email and a wrong password,
 * and unknown emails still pay for one bcrypt compare.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOrigin();

  const parsed = loginSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, firstIssue(parsed.error));

  const result = await authenticate(parsed.data.email, parsed.data.password);
  if (!result.ok) return jsonError(result.status, result.message);

  const store = await cookies();
  store.set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return NextResponse.json({ user: result.user });
}
