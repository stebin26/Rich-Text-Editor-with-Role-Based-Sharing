import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { crossOrigin, firstIssue, jsonError, readJson } from "@/lib/api";
import { isSameOrigin } from "@/lib/csrf";
import { db } from "@/lib/db";
import { PUBLIC_USER_SELECT } from "@/lib/dto";
import { hashPassword } from "@/lib/login";
import { checkPassword } from "@/lib/password";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSession } from "@/lib/session";
import { signupSchema } from "@/lib/validation";

/**
 * Creates an account, signs it in, and sets the session cookie. The policy is
 * the same `checkPassword` the client checklist renders, so the UI cannot
 * promise something the server rejects.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOrigin();

  const parsed = signupSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, firstIssue(parsed.error));

  const { name } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const policy = checkPassword(parsed.data.password, email);
  if (!policy.ok) {
    return jsonError(400, policy.failures[0]?.message ?? "Choose a stronger password.");
  }

  const passwordHash = await hashPassword(parsed.data.password);

  try {
    const user = await db.user.create({
      data: { name, email, passwordHash },
      select: PUBLIC_USER_SELECT,
    });

    const { token } = await createSession(user.id);
    const store = await cookies();
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(409, "An account with that email already exists.");
    }

    // Never log the request body: it contains a plaintext password.
    console.error("Signup failed.");
    return jsonError(500, "We couldn't create your account. Please try again.");
  }
}
