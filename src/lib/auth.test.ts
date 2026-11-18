import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { canExport } from "./access";
import { db } from "./db";
import { getAccess, listShares } from "./documents";
import { PUBLIC_USER_SELECT } from "./dto";
import { exportFilename, htmlToMarkdown } from "./export";
import {
  INVALID_CREDENTIALS_MESSAGE,
  LOCKED_MESSAGE,
  LOCKOUT_MS,
  MAX_FAILED_ATTEMPTS,
  authenticate,
  hashPassword,
} from "./login";
import { createSession, deleteSession, hashToken, resolveSession } from "./session";
import { SHARE_GRANTED_MESSAGE, grantShare } from "./sharing";

const hasDatabase = Boolean(process.env.DATABASE_URL);

/**
 * These tests run against a real Postgres database (see vitest.config.ts,
 * which points DATABASE_URL at a separate `_test` database). They are skipped
 * when no database is configured.
 */
describe.skipIf(!hasDatabase)("authentication", () => {
  const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Owner-Secret-2026!";

  const emails = {
    owner: `owner-${run}@ajaia.test`,
    viewer: `viewer-${run}@ajaia.test`,
    target: `target-${run}@ajaia.test`,
    locked: `locked-${run}@ajaia.test`,
  };

  let ownerId = "";
  let viewerId = "";
  let documentId = "";

  beforeAll(async () => {
    const passwordHash = await hashPassword(password);

    const [owner, viewer, target, locked] = await Promise.all(
      Object.entries(emails).map(([, email], index) =>
        db.user.create({
          data: { email, name: `User ${index}`, passwordHash },
          select: { id: true },
        }),
      ),
    );

    ownerId = owner.id;
    viewerId = viewer.id;

    const document = await db.document.create({
      data: {
        title: "Auth test document",
        content: "<h1>Hello</h1><p>Body <strong>bold</strong></p>",
        ownerId: owner.id,
        shares: { create: { userId: viewer.id, role: "VIEWER" } },
      },
      select: { id: true },
    });

    documentId = document.id;

    // Silence an unused-variable warning while keeping the created rows' ids
    // meaningful for cleanup (cleanup is email-based).
    void target.id;
    void locked.id;
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
    await db.$disconnect();
  });

  it("returns an identical failure for a wrong password and an unknown email", async () => {
    const wrongPassword = await authenticate(emails.owner, "Wrong-Password-2026!");
    const unknownEmail = await authenticate(
      `nobody-${run}@ajaia.test`,
      "Wrong-Password-2026!",
    );

    expect(wrongPassword).toEqual({
      ok: false,
      status: 401,
      message: INVALID_CREDENTIALS_MESSAGE,
    });
    expect(unknownEmail).toEqual(wrongPassword);
  });

  it("locks an account after five failures and rejects the correct password meanwhile", async () => {
    for (let attempt = 1; attempt < MAX_FAILED_ATTEMPTS; attempt += 1) {
      const result = await authenticate(emails.locked, "Wrong-Password-2026!");
      expect(result).toMatchObject({ ok: false, status: 401 });
    }

    const locked = await authenticate(emails.locked, "Wrong-Password-2026!");
    expect(locked).toEqual({ ok: false, status: 429, message: LOCKED_MESSAGE });

    // Right password, still locked: the response says nothing about validity.
    const correctWhileLocked = await authenticate(emails.locked, password);
    expect(correctWhileLocked).toEqual({
      ok: false,
      status: 429,
      message: LOCKED_MESSAGE,
    });

    const row = await db.user.findUniqueOrThrow({
      where: { email: emails.locked },
      select: { failedAttempts: true, lockedUntil: true },
    });
    expect(row.lockedUntil).not.toBeNull();
    const remaining = row.lockedUntil!.getTime() - Date.now();
    expect(remaining).toBeGreaterThan(LOCKOUT_MS - 60_000);
    expect(remaining).toBeLessThanOrEqual(LOCKOUT_MS);
  });

  it("lets the account back in once the lockout has expired", async () => {
    await db.user.update({
      where: { email: emails.locked },
      data: { lockedUntil: new Date(Date.now() - 1000) },
      select: { id: true },
    });

    const result = await authenticate(emails.locked, password);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected a successful sign-in");

    const row = await db.user.findUniqueOrThrow({
      where: { email: emails.locked },
      select: { failedAttempts: true, lockedUntil: true },
    });
    expect(row.failedAttempts).toBe(0);
    expect(row.lockedUntil).toBeNull();

    await deleteSession(result.token);
  });

  it("rejects forged and tampered session cookies", async () => {
    // The old mock cookie held a raw user id; that must no longer work.
    await expect(resolveSession(ownerId)).resolves.toBeNull();
    await expect(resolveSession("not-a-real-token")).resolves.toBeNull();
    await expect(resolveSession("")).resolves.toBeNull();
    await expect(resolveSession(null)).resolves.toBeNull();

    const { token } = await createSession(ownerId);
    await expect(resolveSession(token)).resolves.toMatchObject({ id: ownerId });
    await expect(resolveSession(`${token}tampered`)).resolves.toBeNull();

    await deleteSession(token);
    await expect(resolveSession(token)).resolves.toBeNull();
  });

  it("rejects an expired session", async () => {
    const token = `expired-${run}-token`;
    await db.session.create({
      data: {
        tokenHash: hashToken(token),
        userId: ownerId,
        expiresAt: new Date(Date.now() - 1000),
      },
      select: { id: true },
    });

    await expect(resolveSession(token)).resolves.toBeNull();
  });

  it("stores only a hash of the session token", async () => {
    const { token } = await createSession(ownerId);
    const stored = await db.session.findFirstOrThrow({
      where: { tokenHash: hashToken(token) },
      select: { tokenHash: true },
    });

    expect(stored.tokenHash).not.toBe(token);
    expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/);

    const everything = JSON.stringify(
      await db.session.findMany({
        select: { id: true, tokenHash: true, userId: true, expiresAt: true },
      }),
    );
    expect(everything).not.toContain(token);

    await deleteSession(token);
  });

  it("never puts passwordHash in serialized query results", async () => {
    const users = await db.user.findMany({ select: PUBLIC_USER_SELECT });
    const shares = await listShares(documentId);

    expect(JSON.stringify(users)).not.toContain("passwordHash");
    expect(JSON.stringify(shares)).not.toContain("passwordHash");
    expect(JSON.stringify(shares)).not.toContain("tokenHash");

    const signIn = await authenticate(emails.owner, password);
    expect(signIn.ok).toBe(true);
    expect(JSON.stringify(signIn)).not.toContain("passwordHash");
    if (signIn.ok) await deleteSession(signIn.token);
  });

  it("grants export to owners, editors and viewers but 404s a stranger", async () => {
    const strangerAccess = await getAccess("no-such-user", documentId);
    // The route maps null to 404; export must never succeed for a stranger.
    expect(strangerAccess).toBeNull();
    expect(canExport(strangerAccess)).toBe(false);

    const viewerAccess = await getAccess(viewerId, documentId);
    expect(viewerAccess).toBe("VIEWER");
    expect(canExport(viewerAccess)).toBe(true);
    expect(canExport(await getAccess(ownerId, documentId))).toBe(true);

    const document = await db.document.findUniqueOrThrow({
      where: { id: documentId },
      select: { title: true, content: true },
    });
    expect(htmlToMarkdown(document.content)).toContain("# Hello");
    expect(exportFilename(document.title)).toBe("Auth-test-document.md");
  });

  it("does not reveal whether an invited email has an account", async () => {
    const before = await listShares(documentId);

    const unknown = await grantShare({
      documentId,
      callerEmail: emails.owner,
      email: `ghost-${run}@ajaia.test`,
      role: "EDITOR",
    });
    expect(unknown).toBe(false);
    expect(await listShares(documentId)).toHaveLength(before.length);

    // Same constant message either way; the API always returns this string.
    expect(SHARE_GRANTED_MESSAGE).toBe(
      "If that account exists, access has been granted.",
    );

    const known = await grantShare({
      documentId,
      callerEmail: emails.owner,
      email: emails.target.toUpperCase(),
      role: "EDITOR",
    });
    expect(known).toBe(true);

    const after = await listShares(documentId);
    expect(after).toHaveLength(before.length + 1);
    expect(after.find((share) => share.email === emails.target)?.role).toBe(
      "EDITOR",
    );
  });

  it("refuses to share with the caller themselves", async () => {
    const selfShare = await grantShare({
      documentId,
      callerEmail: emails.owner,
      email: emails.owner,
      role: "EDITOR",
    });
    expect(selfShare).toBe(false);
  });
});
