# Architecture

## What this is optimizing for

The assignment rewards a small app that is **correct end to end** over a large app with gaps. I prioritized:

1. **Security that holds up to inspection.** Real passwords, database-backed sessions, a single server-side access gate, CSRF checks and non-enumerating responses. A demo that trusts a client-supplied identity is worth very little.
2. **Data safety.** Documents are HTML, so both the save path and the import path sanitize with the same allowlist before anything is stored.
3. **A complete, calm editing loop.** Create → edit → autosave → refresh → persist, including visible save state, a retry path and a flush on page leave.
4. **Boring, debuggable choices.** Postgres + Prisma, hashed session tokens in a cookie, route handlers, no background workers.

## Scope

**In:** password signup/login/logout, lockout, document CRUD, rich-text formatting (bold, italic, underline, H1/H2, bullet/numbered lists), autosave, `.txt`/`.md`/`.docx` import, sharing with Viewer/Editor roles, revocation, owner-only collaborator list, Markdown export, print stylesheet, server-enforced access.

**Out (on purpose):** real-time collaboration, comments, version history, OAuth, email verification, password reset, attachment storage, pagination/search, document folders.

Each cut removes a subsystem that would have doubled the surface area without improving the core demo: a CRDT/WebSocket server, a comments data model, an auth provider, an email sender, and object storage.

## Data model

```
User 1 ──< Document (owner)      Document 1 ──< Share >── 1 User
User 1 ──< Share                  User 1 ──< Session
```

Prisma schema (`prisma/schema.prisma`):

- **User**: `id` (cuid), unique `email`, `name`, `passwordHash`, `failedAttempts` (default 0), `lockedUntil?`, `createdAt`.
- **Session**: `id`, unique `tokenHash`, `userId` (cascade), `expiresAt`, `createdAt`; indexes on `userId` and `expiresAt`.
- **Document**: `id`, `title` (default "Untitled document"), `content` (sanitized HTML), `ownerId`, `createdAt`, `updatedAt`. Indexed on `ownerId`.
- **Share**: `id`, `documentId`, `userId`, `role` (`EDITOR` | `VIEWER`), unique on `(documentId, userId)`, index on `userId`. Deleting a document or user cascades.

`content` is HTML because TipTap produces and consumes HTML and the assignment is explicitly a Docs-style editor. A JSON document model would be better for collaboration and versioning, but worse for this scope: import/export, sanitization and rendering all become bespoke.

## Sessions and authentication

`src/lib/session.ts` owns the token mechanics:

```
login → randomBytes(32).toString("base64url")
      → session.create({ tokenHash: sha256(token), userId, expiresAt: now + 7d })
      → Set-Cookie: ajaia_session=<raw token>; HttpOnly; SameSite=Lax; Path=/; Secure in production
lookup → sha256(raw token) → findUnique(Session.tokenHash) → reject missing/expired
logout → deleteMany({ tokenHash }) → clear cookie
```

Why this shape:

- **Only the hash is stored.** A database leak does not hand over live sessions, and the cookie is not a user id, so editing it identifies nobody.
- **Server-side expiry.** `resolveSession` compares `expiresAt` with `Date.now()` on every request; there is no trust in cookie lifetime alone. Expired rows are ignored rather than deleted during render, because deleting cookies/rows inside a server-component render is not allowed.
- **Per-device logout.** Deleting one row signs out that browser only.
- **Not a JWT.** A signed JWT would avoid a lookup, but revocation, lockout and logout would need a denylist anyway. One indexed lookup keeps revocation trivial.

`getCurrentUser()` (in `src/lib/auth.ts`) is the only page-level bridge: it reads the cookie and delegates to `resolveSession`. `requireUser()` redirects anonymous page visitors.

### Login, lockout and enumeration

`src/lib/login.ts#authenticate` is deliberately free of cookies so it can be tested directly:

1. Look up the user by lowercase email.
2. Unknown email → one bcrypt compare against a **dummy hash** (cost 12) and the generic error, so timing doesn't advertise existence.
3. `lockedUntil > now` → generic “too many attempts” response, without checking the password.
4. Compare with bcrypt. Wrong → increment `failedAttempts`; the 5th failure sets `lockedUntil = now + 15 min` and resets the counter to 0.
5. Correct → reset `failedAttempts`/`lockedUntil`, create a session.

Persisting the counter is not optional: serverless instances share no memory, so an in-process counter is trivially bypassed by hitting another instance.

**Known tradeoff:** a locked account gets a distinct 429 message, while an unknown email never locks. That is actionable UX, and it can reveal that an account exists. A production system would add per-IP rate limiting and keep the message identical; that is noted in “Known limits”.

### CSRF

All cookie-authenticated mutations (`POST`, `PATCH`, `DELETE`) call `isSameOrigin(request)` (`src/lib/csrf.ts`), which compares the `Origin` host with the `Host` / `X-Forwarded-Host` host and rejects a missing `Origin`. Browsers always send `Origin` on these methods, so no token round-trip is needed. `SameSite=Lax` remains as a second layer. `GET` routes are read-only, including export.

### Security headers and CSP

`next.config.ts` sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, and a CSP with `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.

**CSP caveat, stated plainly:** Next's App Router bootstraps with inline scripts and Tailwind emits inline styles, so `script-src` and `style-src` include `'unsafe-inline'`. A nonce-based policy needs middleware and would break static rendering. What the policy still enforces is that scripts, frames and forms cannot point at another origin — meaningful defence in depth on top of server-side HTML sanitization, but not a substitute for it. `'unsafe-eval'` is added in development only, for the HMR runtime.

## Permission model

`src/lib/access.ts` holds the pure rules:

```ts
resolveAccess(ownerId, shares, userId): "OWNER" | "EDITOR" | "VIEWER" | null
canEdit(access): boolean            // OWNER or EDITOR
canManageSharing(access): boolean   // OWNER only
canExport(access): boolean          // any non-null access
```

`src/lib/documents.ts#getAccess(userId, docId)` loads `ownerId + shares` and applies `resolveAccess`. It is the single database-backed gate.

Rules:

| Caller | Read | Edit | Export | Share / delete |
| --- | --- | --- | --- | --- |
| Owner | yes | yes | yes | yes |
| Editor | yes | yes | yes | no (403) |
| Viewer | yes | no (403) | yes | no (403) |
| Stranger | **404** | **404** | **404** | **404** |

**404 for strangers, 403 for known-but-insufficient access.** A stranger must not be able to distinguish “this id doesn't exist” from “this id exists but isn't yours”. A viewer already knows the document exists, so 403 is the honest answer there.

Every route re-reads the session and calls `getAccess`; nothing trusts a role sent by the client. Page-level access uses the same helper, and the editor's read-only state is derived from the server-resolved access level.

## Data exposure

Every Prisma query uses an explicit `select`. `src/lib/dto.ts` holds the shared public-user and owner selects, so a `passwordHash` or `tokenHash` cannot ride along by accident. A database-backed test serializes query results and asserts that neither string appears.

Collaborator emails are **owner-only**:

- `GET /api/documents/:id`, the document page, and the share dialog include collaborator names and emails only when the caller is the owner.
- Editors and viewers receive the owner's `{ id, name }` and no shares at all.
- “Shared with me” on the dashboard shows the owner's name, never their email.
- `listShares()` is only called from owner-authorised paths.

### Share-endpoint privacy tradeoff

`POST /api/documents/:id/shares` always answers:

> If that account exists, access has been granted.

…and always returns the **owner's current collaborator list**. If the email does belong to an account, the new row appears in that list immediately; if it doesn't, nothing changes.

The tradeoff is deliberate:

- **Gain:** the endpoint can no longer be used as an account-existence oracle, which is the most valuable thing an attacker could do with an invite form.
- **Cost:** an owner who mistypes an address gets a success-looking message. The dialog mitigates this by showing the actual collaborator list in the same response, so the missing person is visible. A production version would send an invitation email and only confirm delivery there, which removes the ambiguity entirely.

Self-sharing still returns a 400 with “You can't share a document with yourself.”, because that reveals nothing about other accounts.

Signup necessarily reveals that an email is already registered (409). That is unavoidable for signup, and it is limited to one email the visitor already supplied.

## Request flows

### Save / autosave

```
TipTap onUpdate
  → pendingRef.content = editor.getHTML()
  → status "unsaved", 800 ms timer
  → PATCH /api/documents/:id
      → Origin check → session → getAccess → canEdit → Zod → sanitize → Prisma update
  → "Saved" or "Couldn't save" + Retry
```

The client keeps a small pending patch (`title` and/or `content`) and drains it in a loop: edits made while a request is in flight are sent immediately after it finishes. Failures restore the pending patch so Retry resends it without discarding newer text. Title commits on blur/Enter rather than per keystroke. On `pagehide` / `visibilitychange: hidden`, the pending patch is sent with `keepalive: true` as a best-effort flush.

This is **last-write-wins**. Two editors on the same document can overwrite each other. The mitigation would be a revision column with optimistic concurrency (`If-Match`), which is noted as future work.

### Import

```
multipart POST /api/import
  → Origin check → session
  → FormData parse
  → size ≤ 2 MB, extension ∈ {.txt, .md, .docx}
  → .docx must start with a ZIP signature (PK\x03\x04 / PK\x05\x06 / PK\x07\x08)
  → Buffer → txt: escape+paragraphs | md: marked | docx: mammoth
  → sanitize-html allowlist
  → create Document owned by the caller
  → { id } → client navigates to /docs/:id
```

The route declares `runtime = "nodejs"` because mammoth needs Node APIs. Extension, size and signature are checked server-side, not only in the UI. Parse failures return 422 instead of 500, and file contents are never logged.

### Export

```
GET /api/documents/:id/export
  → session → getAccess → canExport (404 for strangers)
  → turndown(headingStyle: "atx") over stored sanitized HTML
  → Content-Disposition: attachment; filename="<slug>.md"
```

The filename is reduced to `[A-Za-z0-9._-]`, collapsed, trimmed and capped at 80 characters, so quotes, slashes and CR/LF can never reach the header. The “Print / Save as PDF” path is client-side `window.print()` plus a print stylesheet that hides chrome.

### HTML sanitization

`sanitizeDocumentHtml` allows: `p, h1, h2, h3, strong, b, em, i, u, s, ul, ol, li, br, a, blockquote, code, pre, hr`. Links may carry `href`, `target`, `rel`; schemes are limited to `http`, `https`, `mailto`; every anchor is rewritten with `rel="noopener noreferrer nofollow"` and `target="_blank"`. Script/style contents are dropped entirely. Applied on **both** `PATCH /api/documents/:id` and `POST /api/import`.

### Redirect for anonymous visitors

`src/proxy.ts` (Next 16 renamed the `middleware` convention to `proxy`) redirects requests to `/` and `/docs/*` that carry **no session cookie** to `/login?next=…`. This is only a cheap gate so anonymous visitors get a real 307 instead of a streamed skeleton; the cookie is not a credential and every page still resolves the token against the database.

## Decisions and tradeoffs

**Next.js 16 with Cache Components disabled.** The 16.4 scaffold enables `cacheComponents`, whose docs state that reading `cookies()` outside a `<Suspense>` boundary is a build error. This app reads the session on every page, so I removed the flags and kept routes dynamic. The build output confirms document routes are `ƒ` (dynamic).

**TipTap 3, StarterKit only.** v3's StarterKit already includes Underline and Link, so installing `@tiptap/extension-underline` separately (as v2 required) would register duplicates. `immediatelyRender: false` avoids an SSR hydration mismatch.

**bcryptjs over `bcrypt`.** Pure JavaScript, so it deploys to Vercel without a native build step. The cost is CPU time (~250 ms per hash at cost 12), which is acceptable for a login form.

**HTML in a `String` column.** Simple, import-friendly, and directly renderable. The cost is that every write must sanitize, and rich structures (tables, images) are unsupported.

**Optimistic, debounced saves.** The UI feels instant and survives refresh. The cost is a small window where a closed tab can lose the last <800 ms of typing (mitigated by the leave flush) and no conflict detection.

**Route handlers over Server Actions for mutations.** The assignment specifies an API surface, and it keeps permission checks explicit and curl-testable. Pages are server components that call Prisma directly after an access check.

**A separate test database.** Tests derive `…_test` from `DATABASE_URL`, run migrations and truncate. This makes the security-critical behaviour (lockout, expiry, non-enumeration) testable against real Postgres instead of mocks, without risking development data.

**Pooled Postgres connection.** Neon's pooled string is used for the app because serverless functions open many short-lived connections; `DIRECT_URL` is used only by migrations, which need a real session.

## Known limits

- Last-write-wins; no presence, cursors, comments or history.
- Lockout is per account, not per IP; it can be used to lock someone out deliberately, and its 429 message can reveal that an account exists. Per-IP limiting is the missing layer.
- No OAuth, email verification or password reset — an account created with a typo in the email cannot be recovered.
- CSP allows inline scripts (see above).
- 1 MB content limit; no pagination on the dashboard; delete is permanent.
- `.docx` tables/images are intentionally dropped.
- No automated browser/E2E suite; permission and auth behaviour is covered by unit + database tests plus a scripted HTTP smoke test. The UI itself was not clicked through in a browser.

## What I'd build next (2–4 hours)

1. Revision column + `If-Match`/optimistic concurrency, then a simple activity/version list.
2. Per-IP rate limiting and a single generic message for lockout, removing the last enumeration signal.
3. Password reset and email verification (needs an email provider).
4. Comment anchors stored as `{ documentId, userId, quote, position }`, plus Playwright tests for the two-user share flow.
