# AI workflow note

## Tools used

- **Freebuff coding agent (Buffy)** — scaffolding the Next.js app, implementing the Prisma schema, API routes, TipTap editor, share dialog and dashboard, writing tests and these docs, and running verification (typecheck, lint, tests, build, HTTP smoke test).
- **The assignment's supplied execution plan** — used as the architecture outline (data model, permission rules, route list, scope cuts). I treated it as a draft to validate, not as ground truth; several details were wrong for the installed versions (see below).

The raw trail of prompts, mistakes and corrections is in [`AI_LOG.md`](./AI_LOG.md).

## Where AI sped things up

- **Scaffold and config** — Next 16 app, Tailwind v4, TypeScript, ESLint; Prisma init and migration.
- **Boilerplate with a known shape** — route handlers, Zod schemas, JSON error helpers, cookie session helpers.
- **Prisma schema and seed** — relation modelling, cascade rules, idempotent seeding.
- **Import converters** — txt escaping/paragraphs, marked and mammoth wiring, plus the sanitize-html allowlist.
- **UI volume** — dashboard rows, empty states, editor toolbar, share modal, save-status states. This is the least interesting code and the easiest to review quickly.
- **Test generation** — the first draft of the access and import tests; I then corrected assertions to match real library output.

## What I changed or rejected

1. **Removed `cacheComponents` from the scaffold.** Next 16.4 enables it by default. Its bundled docs (`authentication-with-cache-components.md`) say reading `cookies()` outside a `<Suspense>` boundary is a build error. This app is session-dependent on every page, so that would have meant wrapping every route in Suspense for no benefit. I removed `cacheComponents` and `partialPrefetching` and kept routes dynamic. Verified by the production build showing all routes as `ƒ`.
2. **Did not install `@tiptap/extension-underline`.** The supplied plan warns v2 needs it; the installed TipTap is 3.34, whose `StarterKit` already registers Underline and Link. I checked `node_modules/@tiptap/starter-kit/dist/index.d.ts` and avoided a duplicate-extension warning.
3. **Bumped `@types/node` from `^20` to `^24`.** `npm i -D vitest` failed with ERESOLVE because Vitest 5 requires `@types/node ^22 || >=24`. Rather than `--legacy-peer-deps`, I aligned the types with the actual Node 24 runtime.
4. **Rewrote the recursive autosave function.** ESLint's `react-hooks/immutability` rule rejected `await save()` inside its own `useCallback`. The AI's first version was a recursive drain; I replaced it with a `while` loop that drains the pending patch, tracks `savedAny`/`failed`, and still preserves failed edits for Retry. Lint and build then passed.
5. **Corrected a test, not the implementation.** My generated test expected `<li><p>one</p></li>` from `marked`; it actually emits `<li>one</li>`. I changed the assertion to the real output instead of adding an HTML post-processor or weakening the test.
6. **Hardened the sanitizer beyond the first draft.** Added `nonTextTags` so script/style *contents* are dropped, restricted URL schemes, and forced `rel="noopener noreferrer nofollow"` on links. Covered by tests for `<script>`, `onclick`, and `javascript:` URLs.
7. **Removed `next/font/google`.** The scaffold loads Geist at build time, which adds a network dependency to every build. I used a system font stack instead — one less failure mode, no visual cost for this app.
8. **Rejected scope creep.** Suggested additions like real-time collaboration, comments, real OAuth, image uploads and an activity feed were cut; they are listed as future work instead. The assignment explicitly values deliberate cuts.
9. **Fixed a false-positive in my own smoke test.** The run reported the viewer page missing “View only”; the script had never requested the page and was grepping the previous response body. After adding the request, the page contained the banner twice (top bar + banner). The application was correct; the test was not.
10. **Local database permissions.** `prisma migrate dev` failed with P3014 because the app role couldn't create the shadow database. I granted `CREATEDB` to the local role (documented as a `migrate dev` requirement) rather than switching the schema or using `db push`.

## Second session — replacing mock auth and hardening

### The finding that mattered

Reviewing the first build against the brief's security expectations (not just against its own tests) surfaced the most serious defect in it: **identity was a raw user id in a cookie, and the login page listed every seeded user**. The cookie was httpOnly but unsigned, so anyone could set it and become any user; the picker additionally published every account's name and email to anonymous visitors. The README and UI labelled this "demo only", but labelling a hole doesn't close it, and no amount of sanitization or permission checks matters if identity is forgeable.

That reframing — "what would a reviewer try first?" instead of "do the tests pass?" — is what turned the remaining work into a security pass rather than a feature pass.

### What I changed

1. **DB-backed sessions.** A random 32-byte token in the cookie; only its SHA-256 hash stored. Added a `Session` model with cascade delete and expiry. `getCurrentUser()` now hashes the cookie and looks up the row, so a user-id cookie authenticates nobody.
2. **bcryptjs, cost 12.** Pure JS so it runs on Vercel without a native build. Unknown emails still run one compare against a dummy hash, and unknown email vs wrong password return the identical message.
3. **Lockout in the database.** `failedAttempts` + `lockedUntil` on `User` rather than process memory, because serverless instances don't share state. Five failures lock for 15 minutes; success clears both.
4. **A shared password policy** imported by the signup form (live checklist) and the API (authoritative check), so the UI cannot promise something the server rejects.
5. **Owner-only collaborator data.** Emails are selected only on owner-authorised paths; editors and viewers get the owner's name.
6. **Non-enumerating sharing.** The invite endpoint answers the same string whether or not the account exists, and returns the real collaborator list so the owner can see what actually happened.
7. **CSRF, headers, upload signature.** Origin/Host checks on every mutation, CSP + frame/nosniff/referrer headers, and a `PK` ZIP check for `.docx`.

### Real findings during this pass

- **A streamed redirect is not a redirect.** With `app/loading.tsx` in place, an anonymous request to `/` returned **200** and a skeleton, then redirected on the client (Next's redirect arrives after the shell is flushed). The app "worked" in a browser but did not answer 307. Fixed with `src/proxy.ts` — Next 16 renamed `middleware` to `proxy`, which I confirmed in `node_modules/next/dist/docs/` — as a cheap cookie-presence gate; the database check stays authoritative.
- **`loading.tsx` and `redirect()` interact.** The fix above was the only way to keep both the skeleton for signed-in users and a real redirect for anonymous ones without moving auth into middleware (where Prisma can't cheaply run).
- **CSP vs Next inline bootstrap.** A fully strict CSP breaks the App Router and Tailwind without a nonce, which needs middleware. I kept `'unsafe-inline'` for scripts/styles and wrote the tradeoff into `ARCHITECTURE.md` rather than claiming a strict policy.
- **The smoke test was wrong twice, not the app.** First, the "stranger" check failed because a previous run had already shared the document with Carol — stale state, fixed by creating a fresh account per run. Second, an "expired session" insert used local time via `psql`, which Prisma read as a future UTC timestamp; the app was right. Both are recorded because false failures cost more review time than they save.
- **Turndown pads list markers** (`-   item`, three spaces). I adjusted the assertion to the library's real output instead of post-processing the Markdown.

### Test strategy change

Security behaviour (lockout, expiry, forged tokens, non-enumeration) is not convincingly testable with mocks. I added a database-backed Vitest suite that derives a separate `…_test` database from `DATABASE_URL`, creates it, runs migrations and truncates it, so tests exercise real Prisma and real bcrypt without touching development data. It skips itself when no database is configured.

## How I verified

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean.
- `npm test` — 62 tests across pure permission rules, password policy, CSRF/export helpers, import/sanitization and a 10-test database suite (login, lockout, session forgery/expiry, response shapes, export permissions, non-enumerating share).
- `npm run build` — production build succeeds; Prisma client generated in the build.
- A scripted 64-check HTTP smoke test against the dev server, covering login/lockout messages, cookie attributes, forged/expired cookies, owner vs editor vs viewer vs stranger responses, export headers and content, share non-enumeration, cross-origin rejection, security headers, signup policy, ZIP rejection and logout.
- 53-check HTTP smoke test against the running dev server:
  - 401 for anonymous APIs, redirect for anonymous document pages;
  - owner CRUD, title/content validation (empty, >200 chars, no fields, malformed JSON);
  - `<script>` and `onclick` stripped on save, `<strong>` preserved;
  - owner/editor/viewer/stranger matrix, including 404 for strangers and 403 for viewers;
  - share with self (400), unknown email (404), invalid role (400), upsert role change, revoke, 404 on re-revoke;
  - `.txt` import escaped, `.exe` rejected (400), ~2.1 MB upload rejected (413);
  - logout and post-logout 401.
- Viewer page HTML contains the read-only banner and no Share control.
- **Not verified:** I did not click through the UI in a browser, test drag-selection formatting, verify hydration visually, confirm TipTap behaves under the CSP, check the print layout, or run the two-profile live deployment test (no Vercel/Neon credentials). Those are the first things to check manually.
- The new HTTP smoke test is still a throwaway script; it is not committed, so it is not repeatable in CI. Playwright is the honest fix.
