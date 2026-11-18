import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/cookies";

/**
 * Next 16 renamed the `middleware` file convention to `proxy`.
 *
 * This is only a cheap gate: if there is no session cookie at all, redirect
 * before the page shell (and its loading skeleton) streams. The cookie is not
 * a credential — every page and API route still resolves the token against the
 * Session table, so a forged or expired token is rejected there.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  const target = `${url.pathname}${url.search}`;

  url.pathname = "/login";
  url.search = "";

  if (target !== "/") {
    url.searchParams.set("next", target);
  }

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/", "/docs/:path*"],
};
