# Ajaia Docs

A small Google Docs–style app: password accounts, a dashboard, a rich-text editor with autosave, file import, email-based sharing with Viewer/Editor roles, Markdown export and Postgres persistence with server-enforced permissions.

**Live URL:** not deployed yet. The app is built and verified locally; see [Deploy](#deploy-vercel--neon) for the exact Vercel + Neon steps. Creating those accounts requires your credentials, so I stopped short of publishing.

- [Architecture note](./ARCHITECTURE.md)
- [AI workflow note](./AI_WORKFLOW.md)
- [Raw AI log](./AI_LOG.md)
- [Submission notes](./SUBMISSION.md)

## Stack

| Purpose | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Editor | TipTap 3 (`@tiptap/react`, `@tiptap/starter-kit`) |
| Database | Postgres 16 (Neon in production, local Postgres in development) via Prisma 6 |
| Auth | Email + password, bcryptjs (cost 12), DB-backed sessions |
| Validation | Zod 4 |
| Import / export | `mammoth` (.docx), `marked` (.md), plain text (.txt), `turndown` (Markdown export) |
| Sanitization | `sanitize-html` (allowlist, applied on save and import) |
| Tests | Vitest |

## What works

- **Accounts**: sign up with an email + password (live policy checklist), sign in, sign out. Sessions are database-backed and the cookie holds only a random token.
- Create, rename, edit, reopen and delete documents.
- Formatting: bold, italic, underline, H1, H2, bullet lists, numbered lists, with active-state highlighting, `aria-pressed` and keyboard shortcuts.
- Autosave ~800 ms after typing, with `Unsaved changes`, `Saving…`, `Saved` and `Couldn't save / Retry` states. Title saves on blur or Enter. Pending edits are flushed on page hide.
- Upload `.txt`, `.md` or `.docx` into a new editable document (2 MB max).
- Share by email as **Viewer** or **Editor**, change a collaborator's role, and revoke access.
- Dashboard with **My documents** and **Shared with me**, owner badge and role badge, loading skeleton, toasts and a confirm dialog before delete.
- Viewers get a read-only editor, a “View only” banner, and no toolbar.
- **Markdown export** and **Print / Save as PDF** from the editor.
- Every document route checks the session and the caller's access server-side. Strangers get **404**, not 403, so document ids can't be probed.
- Stored HTML is sanitized on both save and import; scripts, event handlers and `javascript:` links are removed.
- Custom 404 and error pages; unauthenticated visitors are redirected to `/login` before the page renders.
- Print stylesheet, word count, “last edited” time, document title in the browser tab, visible focus rings, usable at ~375 px.

## Demo credentials

Every seeded account uses the same demo password.

| Name | Email | Password | Notes |
| --- | --- | --- | --- |
| Alice | `alice@ajaia.test` | `Ajaia-Demo-2026!` | Owns the seeded “Welcome to Ajaia Docs” document |
| Bob | `bob@ajaia.test` | `Ajaia-Demo-2026!` | Has **Editor** access to Alice's welcome document |
| Carol | `carol@ajaia.test` | `Ajaia-Demo-2026!` | No initial shares — good for testing the stranger case |

The login page shows only one demo account hint; it no longer lists every user.

### Password policy

Enforced by `src/lib/password.ts`, which is imported by both the signup form (live checklist) and the API (authoritative check):

- 10–72 characters (72 is bcrypt's byte limit, checked in bytes)
- at least one lowercase letter, uppercase letter, number and symbol
- not on a small common-password list
- must not contain the email's local part (e.g. `alice` for `alice@ajaia.test`)

`Ajaia-Demo-2026!` satisfies the policy, and a unit test asserts that.

### Lockout

Five failed sign-ins lock the account for **15 minutes**. The counter and `lockedUntil` live in the database (not process memory, which serverless doesn't share). A successful sign-in resets the counter. While locked, the API answers with a generic “too many failed attempts” message that says nothing about whether a password was correct.

## Local setup

Prerequisites: Node.js 20.9+ (built on Node 24) and a Postgres 14+ database.

```bash
npm install

# 1. Configure the database
cp .env.example .env
# edit DATABASE_URL and DIRECT_URL (locally both can be the same string)

# 2. Create the schema and demo data
npx prisma migrate dev
npm run db:seed

# 3. Run
npm run dev
# http://localhost:3000
```

If you use Neon, paste its **pooled** string into `DATABASE_URL`, its **direct** string into `DIRECT_URL`, and run `npm run db:deploy` instead of `migrate dev`.

### Using a local Postgres

```bash
createdb ajia_docs
psql -d postgres -c "CREATE ROLE ajia LOGIN PASSWORD 'ajia_docs_dev' CREATEDB;"
psql -d postgres -c "ALTER DATABASE ajia_docs OWNER TO ajia;"
# DATABASE_URL="postgresql://ajia:ajia_docs_dev@localhost:5432/ajia_docs"
# DIRECT_URL="postgresql://ajia:ajia_docs_dev@localhost:5432/ajia_docs"
```

`CREATEDB` is only needed by `prisma migrate dev`, which creates a temporary shadow database.

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | `prisma generate && next build` |
| `npm start` | Serve the production build |
| `npm test` | Run the Vitest suite |
| `npm run lint` | ESLint |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:deploy` | `prisma migrate deploy` (production) |
| `npm run db:seed` | Seed Alice, Bob, Carol and the welcome document |
| `npm run db:studio` | Prisma Studio |

## Running the tests

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

`npm test` runs 62 tests in five files. The password, CSRF, export and access-rule tests are pure. `src/lib/auth.test.ts` is a database-backed suite for login, lockout, session forgery/expiry, response shapes, export permissions and the non-enumerating share endpoint.

The database tests never touch your development data: `vitest.config.ts` derives a separate `_test` database from `DATABASE_URL` (e.g. `ajia_docs` → `ajia_docs_test`), creates it if missing, applies migrations and empties the tables. Override with `TEST_DATABASE_URL`. If no `DATABASE_URL` is configured, that suite is skipped and the pure tests still run.

## Supported uploads

`.txt`, `.md`, `.docx`, up to **2 MB** (Vercel's request-body limit is ~4.5 MB, so 2 MB leaves headroom). The uploader shows “Supported: .txt, .md, .docx (max 2 MB)”.

- `.txt` is HTML-escaped, then blank-line-separated blocks become paragraphs and single newlines become `<br />`.
- `.md` is rendered with `marked` (GFM).
- `.docx` must start with a ZIP signature (`PK`) in addition to the extension, so a renamed executable never reaches mammoth.
- Every result is passed through `sanitize-html` with a tag allowlist. Tables and images from `.docx` files are dropped because the editor schema doesn't support them.

## Security

- **Sessions.** Login generates a random 32-byte token; only its SHA-256 hash is stored in `Session`. The cookie is `httpOnly`, `sameSite=lax`, `path=/`, `secure` in production, 7-day expiry. Logout deletes that one session row. Expired sessions are rejected on every lookup, and a cookie containing a raw user id authenticates nobody.
- **Password storage.** bcrypt (cost 12, pure JS so it runs on Vercel). Passwords, tokens and hashes are never logged.
- **Generic auth errors.** Unknown email and wrong password return the same `Invalid email or password`; unknown emails still pay for one bcrypt compare against a dummy hash so the timing is similar.
- **CSRF.** Every POST/PATCH/DELETE handler rejects requests whose `Origin` doesn't match the host (requests without `Origin` are rejected too).
- **Data exposure.** Every query uses Prisma `select`, so `passwordHash`, session rows and unrelated users never reach a response. Collaborator emails are owner-only; editors and viewers see the owner's display name only.
- **Non-enumerating sharing.** `POST /api/documents/:id/shares` always answers “If that account exists, access has been granted.” regardless of whether the email belongs to an account.
- **Headers.** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and a CSP (`frame-ancestors 'none'`, `object-src 'none'`, scripts/styles limited to this origin; Next's inline bootstrap needs `'unsafe-inline'`, which is documented in `ARCHITECTURE.md`).
- **404 not 403** for callers with no access, so document existence isn't leaked.

## API

All routes require the session cookie except `POST /api/login` and `POST /api/signup`. Every document route calls `getAccess()` first. All mutations check `Origin`.

| Route | Behaviour |
| --- | --- |
| `POST /api/signup` | Create an account (password policy enforced), sign in |
| `POST /api/login` | Email + password; 401 generic, 429 while locked |
| `POST /api/logout` | Delete this session row and clear the cookie |
| `GET /api/documents` | `{ owned, shared }` for the current user |
| `POST /api/documents` | Create an empty document |
| `GET /api/documents/[id]` | Document + caller's access; shares/emails only for the owner; 404 if no access |
| `PATCH /api/documents/[id]` | Update title/content; owner or editor; Zod-validated; sanitized |
| `DELETE /api/documents/[id]` | Owner only |
| `GET /api/documents/[id]/export` | Markdown download; owner, editor and viewer; 404 for strangers |
| `POST /api/documents/[id]/shares` | Owner only; invite or change a role (upsert); non-enumerating response |
| `DELETE /api/documents/[id]/shares` | Owner only; revoke by `userId` |
| `POST /api/import` | Multipart upload; Node runtime; extension, size and ZIP signature checks |

`GET /api/documents/[id]/export` sends `Content-Disposition: attachment` with a sanitized filename (`[A-Za-z0-9._-]`, 80 chars, `.md`).

## Deliberately not built

Real-time collaboration, comments, version history, OAuth/email verification/password reset, and a file-attachment store. The editor is last-write-wins on save (debounced), so two people editing the same document can overwrite each other.

## Notes for deployment

- **Neon's free tier suspends when idle.** The first request after a quiet period can take a few seconds while the compute wakes up. That is expected; subsequent requests are normal. If you demo from a cold link, open it once before the reviewer does.
- Neon gives two connection strings. Use the **pooled** one for `DATABASE_URL` (the app) and the **direct** one for `DIRECT_URL` (migrations), because Prisma Migrate needs a real session.

## Deploy (Vercel + Neon)

1. Create a Neon project. Copy the **pooled** connection string (host contains `-pooler`) and the **direct** one.
2. Push this repository to GitHub.
3. Apply the schema and seed against Neon from your machine:
   ```bash
   DATABASE_URL="postgresql://...-pooler..." DIRECT_URL="postgresql://..." npx prisma migrate deploy
   DATABASE_URL="postgresql://...-pooler..." DIRECT_URL="postgresql://..." npm run db:seed
   ```
4. Import the repo in Vercel. Add `DATABASE_URL` and `DIRECT_URL` for Production and Preview. The build command is already `prisma generate && next build`.
5. Deploy, then check the live URL in two browser profiles: sign in as Alice, share a document with Bob as Viewer, confirm Bob sees “View only” and gets a 403 from a direct `PATCH`.

`.env` is gitignored; `.env.example` documents the variable names only.
