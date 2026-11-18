# Submission notes

## Status

| Deliverable | Status |
| --- | --- |
| Working app (local) | ✅ Built and verified against Postgres |
| Real authentication + DB-backed sessions | ✅ Implemented and tested |
| Source code | ✅ This repository |
| README | ✅ `README.md` |
| Architecture note | ✅ `ARCHITECTURE.md` |
| AI workflow note + raw log | ✅ `AI_WORKFLOW.md`, `AI_LOG.md` |
| Live URL | ⛔ Not deployed — requires your Vercel + Neon accounts (steps in README) |
| Video | ⛔ Not recorded — outline below; put the Loom URL in `video-link.txt` |

**Local URL:** http://localhost:3000 (start with `npm run dev`).

## Credentials

Every seeded account uses the demo password **`Ajaia-Demo-2026!`**.

| User | Email | Suggested role |
| --- | --- | --- |
| Alice | `alice@ajaia.test` | Owner of the welcome document |
| Bob | `bob@ajaia.test` | Editor on the welcome document |
| Carol | `carol@ajaia.test` | Unshared — use to verify 404 behaviour |

You can also create a fresh account at `/signup`; the form shows a live checklist of the password rules.

## Three-minute reviewer walkthrough

1. Open the app → redirected to `/login`. Sign in as **Alice** with the demo password.
2. Open **Welcome to Ajaia Docs**. Edit a line (bold/italic/underline/H1/lists), rename the title, wait for “Saved”, then refresh — changes persist. The tab title and “Last edited” time update.
3. Click **Share**, invite `carol@ajaia.test` as **Viewer**. She appears in the list immediately. Change her role, then remove her.
4. Sign out, sign in as **Carol** (after sharing as Viewer): the document appears under **Shared with me** with `Owner: Alice` and a `Viewer` badge — no email. Open it: read-only editor, “View only” banner, no toolbar, no Share button.
5. Back as Alice, use **Export → Markdown** (downloads `Welcome-to-Ajaia-Docs.md`) and **Export → Print / Save as PDF**.
6. Import a `.txt` or `.md` file from the dashboard; a new editable document opens with the filename as its title.
7. Create a document and delete it — toast + styled confirm dialog.
8. Try five wrong passwords on one account and observe the 15-minute lockout message.

Optional API check for a viewer:

```bash
curl -i -b cookies.txt -X PATCH http://localhost:3000/api/documents/<id> \
  -H 'Origin: http://localhost:3000' \
  -H 'content-type: application/json' -d '{"title":"nope"}'   # 403
```

Requests without an `Origin` header are rejected by design.

## Files included

Configuration and project:

- `package.json`, `package-lock.json` — dependencies, scripts, Prisma seed hook
- `next.config.ts` — security headers/CSP, Node externals for mammoth, Tailwind Turbopack loader
- `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`
- `src/proxy.ts` — anonymous redirect (Next 16's replacement for `middleware`)
- `.gitignore`, `.env.example` (`.env` is local-only and not committed)
- `AGENTS.md` — version-matched Next.js agent instructions from the scaffold

Database:

- `prisma/schema.prisma` — User / Session / Document / Share
- `prisma/migrations/…_init` and `…_auth_sessions`
- `prisma/seed.ts` — idempotent demo users (with the demo password), welcome document and share

Server libraries:

- `src/lib/db.ts` — Prisma singleton
- `src/lib/cookies.ts` — session cookie name (edge-safe)
- `src/lib/session.ts` — token generation, SHA-256 hashing, create/resolve/delete
- `src/lib/login.ts` — bcrypt login, lockout, dummy-hash timing, password hashing
- `src/lib/password.ts` — shared policy + per-rule results
- `src/lib/auth.ts` — `getCurrentUser`, `requireUser`
- `src/lib/csrf.ts` — Origin/Host check
- `src/lib/access.ts` — pure permission rules incl. `canExport`
- `src/lib/documents.ts` — `getAccess`, owner-only `listShares`
- `src/lib/sharing.ts` — non-enumerating grant
- `src/lib/dto.ts` — public user/owner selects
- `src/lib/export.ts` — Turndown conversion, safe filename
- `src/lib/sanitize.ts`, `src/lib/import.ts` (incl. ZIP signature), `src/lib/limits.ts`
- `src/lib/validation.ts`, `src/lib/api.ts`, `src/lib/format.ts`, `src/lib/types.ts`

API routes:

- `src/app/api/signup`, `login`, `logout`
- `src/app/api/documents` and `src/app/api/documents/[id]`
- `src/app/api/documents/[id]/shares`
- `src/app/api/documents/[id]/export`
- `src/app/api/import`

Pages and UI:

- `src/app/layout.tsx`, `globals.css` (focus rings, print styles)
- `src/app/page.tsx` — dashboard, `loading.tsx` skeleton
- `src/app/login/page.tsx`, `src/app/signup/page.tsx`
- `src/app/docs/[id]/page.tsx` + `loading.tsx`
- `src/app/not-found.tsx`, `src/app/error.tsx`
- `src/components/`: `AppHeader`, `LogoutButton`, `LoginForm`, `SignupForm`, `PasswordChecklist`, `ToastProvider`, `ConfirmDialog`, `DashboardActions`, `DeleteDocumentButton`, `DocumentEditor`, `ExportMenu`, `ShareDialog`, `icons`

Tests and docs:

- `src/lib/access.test.ts`, `import.test.ts`, `password.test.ts`, `security.test.ts`, `auth.test.ts` (62 tests)
- `src/test/` — Vitest DB setup and `server-only` stub
- `README.md`, `ARCHITECTURE.md`, `AI_WORKFLOW.md`, `AI_LOG.md`, `SUBMISSION.md`, `video-link.txt`

## What works (verified)

Verified by `npx tsc --noEmit`, `npm run lint`, `npm test` (62 tests) and `npm run build`, plus a scripted 64-check HTTP smoke test against the dev server:

- Signup with policy enforcement, password login, logout; generic error for both unknown email and wrong password.
- Session cookie is `httpOnly`, `SameSite=Lax`, `Path=/`, 7-day; forged user-id cookie → 401; expired session → 401; logout invalidates that session only.
- Lockout: five failures → 429; correct password while locked → 429; after expiry → success with counters reset.
- Owner sees collaborator emails; editor/viewer responses and pages contain neither collaborator nor owner emails.
- No `passwordHash` in any inspected response (also asserted by a test).
- Permission matrix: owner CRUD, editor edit, viewer 403 on writes, stranger 404 on read/export.
- Export: 200 for owner/editor/viewer with `Content-Disposition: attachment`, 404 for a stranger.
- Share: identical generic response for unknown and known emails, accurate collaborator list, self-share 400.
- Cross-origin POST/PATCH → 403; missing `Origin` → 403.
- Security headers present on HTML responses (CSP, DENY, nosniff, referrer policy).
- Login page no longer lists seeded users.
- Upload: `.docx` without a ZIP signature → 400; `.txt` import → 201.
- 25 original tests still pass (now 62 in total with the new suites).

## What is incomplete or unverified

- **No deployment.** No Vercel/Neon credentials were available; the deploy steps are in the README.
- **No video.** Outline below; record it and update `video-link.txt`.
- **No browser click-through.** The UI was compiled, server-rendered HTML was inspected, and every API path was exercised over HTTP, but no one has clicked through the interface. Specifically unverified: TipTap toolbar behaviour under the new CSP, toast animations, the share modal focus flow, print layout, and the 375 px layout.
- **Lockout is per account, not per IP**, and its message can reveal that an account exists (documented tradeoff).
- No OAuth, email verification or password reset.
- Autosave is last-write-wins; no presence, comments or history.
- `.docx` tables and images are dropped.
- The dev-only CSP adds `'unsafe-eval'` for HMR; production uses `'unsafe-inline'` only.
- No E2E/Playwright suite. The HTTP smoke test was a throwaway script, not committed.

## With 2–4 more hours

1. **Deploy to Vercel + Neon** and run the two-profile share test against the live URL.
2. **Playwright tests** for signup → create → share → viewer read-only → export, so the UI is covered by CI instead of manual clicks.
3. **Optimistic concurrency** (`revision` + `If-Match`) and per-IP rate limiting with a uniform lockout message.
4. **Password reset / email verification** once an email provider is wired up.

## Video outline (3–5 min)

- **0:00–0:30** — What it is; stack; deliberate cuts (collaboration, comments, history, attachments).
- **0:30–2:30** — Demo: sign in, create/format/rename, refresh to show persistence, import a file, share with Bob as Editor and Carol as Viewer, switch users to show editor vs viewer vs no-access, export Markdown, print.
- **2:30–3:30** — Design: hashed session tokens, owner-only collaborator data, 404-not-403, generic auth errors with dummy-hash timing, non-enumerating share response.
- **3:30–4:30** — AI workflow: the mock-auth cookie that was caught against the brief, the streaming-redirect finding, the CSP decision.
- **4:30–5:00** — Limits and next steps.

## Resetting the demo database

```bash
npx prisma migrate reset --force   # drops, migrates and re-seeds
```
