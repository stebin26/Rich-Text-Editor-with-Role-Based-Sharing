# AI log

Working log kept during the build. Times are local (2026-11-17).

## 11:00 — Scaffold and version audit

- Generated a Next.js app with `create-next-app`. Result: **Next 16.4.6 / React 19.3**, Tailwind v4, Turbopack enabled by default.
- The scaffold's `AGENTS.md` says this Next version has breaking changes and to read `node_modules/next/dist/docs/`. Read the upgrade guide, route-handler guide and the Cache Components auth guide before writing code.
- **Decision:** remove `cacheComponents` and `partialPrefetching` from `next.config.ts`. The docs state `cookies()` outside `<Suspense>` is a build error under Cache Components, and every page here is session-dependent. Keeping it would add Suspense plumbing for no benefit.
- Also confirmed `params` and `cookies()` are async in Next 16 (`await params`, `await cookies()`).

## 11:03 — Dependency install

- `npm i -D vitest` failed: ERESOLVE. Vitest 5.1 wants `@types/node ^22 || >=24`, scaffold has `^20`.
- **Correction:** bumped `@types/node` to `^24` instead of using `--legacy-peer-deps`. Node itself is 24.18, so the types were stale.
- npm warned that Prisma/`@prisma/engines` install scripts were blocked by the new allow-scripts policy. Checked `npx prisma -v`; engines were present and Prisma worked, so no action needed.

## 11:05 — Database

- Local Postgres 16 was available over a unix socket as the machine user, but TCP needed a password.
- Created a dedicated role and database rather than connecting as a superuser:
  `CREATE ROLE ajia LOGIN PASSWORD ... CREATEDB; ALTER DATABASE ajia_docs OWNER TO ajia;`
- First `prisma migrate dev` failed with **P3014: could not create the shadow database / permission denied to create database**.
- **Fix:** granted `CREATEDB` to the app role. This is only needed for `migrate dev`; production uses `migrate deploy`. Documented in the README.
- Seed succeeded: 3 users, 1 document, 1 share.

## 11:09 — First test run

- 24/25 passed. Failure: expected `<li><p>one</p></li>` from markdown, actual output was `<li>one</li>`.
- **Decision:** the AI's assertion was modelled on TipTap output, not on `marked` output. Fixed the test expectation; did not alter the converter or loosen the assertion. 25/25 then passed.

## 11:12 — TipTap version check

- The brief warns v2 needs `@tiptap/extension-underline` separately.
- Installed version is **3.34**. Read `@tiptap/starter-kit/dist/index.d.ts`: `UnderlineOptions` and `LinkOptions` are part of StarterKit. Did not install the extra package, avoiding duplicate extensions.
- Used `immediatelyRender: false` and `useEditorState` for toolbar active states.

## 11:20 — Autosave lint failure

- ESLint rule `react-hooks/immutability` rejected `await save()` inside its own `useCallback` ("save accessed before it is declared").
- **Correction:** replaced the recursive drain with a queue-draining `while` loop. On failure the pending patch is restored so Retry resends it without losing newer edits. Verified with lint + build.

## 11:24 — Security review of the AI's first pass

- Sanitizer initially only listed allowed tags. Tightened it:
  - `nonTextTags` so `<script>` contents are removed, not just the tag;
  - scheme allowlist (`http`, `https`, `mailto`);
  - anchor rewrite with `rel="noopener noreferrer nofollow"`.
- Confirmed the save route **and** the import route both call the sanitizer.
- Confirmed strangers get 404 (not 403) and viewers/editors get 403 where appropriate.

## 11:28 — End-to-end smoke test

- Wrote a temporary 53-check curl script covering auth, CRUD, validation, the permission matrix, sharing, revocation, import types and XSS payloads.
- First run: **49 passed, 1 failed** (“View only” missing on viewer page).
- **Investigation:** replayed the viewer request manually. The page returned 200 and contained “View only” twice. The smoke script had never fetched the document page — it grepped the dashboard response. The app was right; the test was wrong.
- Added the missing request plus a “no Share control for viewer” assertion. Final: **53/53 passed**.

## 11:30 — Deliberate rejections

- No real-time collaboration, comments, version history, real OAuth, image/file attachments, pagination or analytics. The assignment rewards deliberate cuts, and each of these is a subsystem rather than a screen.
- Removed `next/font/google` to keep builds independent of font CDN availability.
- Kept mocked auth (unsigned httpOnly cookie) because the brief allows it, but labelled it as insecure in the UI and README.

## 11:35 — Deployment

- No Vercel or Neon credentials are available in this environment, and creating accounts on the user's behalf is not appropriate.
- **Decision:** stop at a verified local build. Documented exact Vercel + Neon deployment steps, including `migrate deploy` and seeding against the production connection string. The live URL and video links remain for the user to produce.

## Session 2 — security pass (same day, later)

- Reviewed the first build against the brief's security expectations rather than its own tests. **Finding:** identity was a raw user id in an httpOnly cookie, and `/login` listed every seeded user with name and email. Anyone could forge the cookie. Fixed with DB-backed sessions (SHA-256 token hash), bcrypt cost 12, a database-persisted 5-failure/15-minute lockout, a shared password policy, and removal of the user picker.
- Unknown email and wrong password now return the same message; unknown emails pay for a dummy bcrypt compare so timing doesn't leak existence.
- Owner-only collaborator data; the invite endpoint always answers “If that account exists, access has been granted.” and returns the live collaborator list.
- Added Origin checks on all mutations, security headers/CSP, and a ZIP signature check for `.docx`.
- **False failure #1:** the smoke test's stranger check failed because a previous run had already shared the doc with Carol. Fresh account per run fixed it.
- **False failure #2:** an inserted “expired” session used `psql` local time, which Prisma read as a future UTC timestamp. The app was correct; the test was not.
- **Real finding:** with `loading.tsx` present, an anonymous `/` returned 200 + skeleton and redirected client-side. Added `src/proxy.ts` (Next 16's rename of `middleware`) for a true 307, keeping the DB check in pages.
- Tests: added a database-backed suite against a derived `…_test` database. 62 tests pass; clean tsc/lint/build; 64-check HTTP smoke test passes.
