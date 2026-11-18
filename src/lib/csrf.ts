/**
 * Minimal CSRF defence for cookie-authenticated mutations: a browser sends
 * `Origin` on every same-origin POST/PATCH/DELETE, and a cross-site page cannot
 * forge it. Requests without an Origin are rejected too — a legitimate browser
 * fetch always includes one.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }

  const host = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    ""
  )
    .split(",")[0]
    .trim()
    .toLowerCase();

  if (!host) return false;
  return originHost === host;
}
