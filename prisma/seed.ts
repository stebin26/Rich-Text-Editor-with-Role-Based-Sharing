import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { sanitizeDocumentHtml } from "../src/lib/sanitize";

const prisma = new PrismaClient();

/** Must pass the policy in src/lib/password.ts (covered by a unit test). */
const DEMO_PASSWORD = "Ajaia-Demo-2026!";
const BCRYPT_COST = 12;

const SEED_USERS = [
  { email: "alice@ajaia.test", name: "Alice" },
  { email: "bob@ajaia.test", name: "Bob" },
  { email: "carol@ajaia.test", name: "Carol" },
];

const WELCOME_TITLE = "Welcome to Ajaia Docs";

const WELCOME_CONTENT = sanitizeDocumentHtml(`
<h1>Welcome to Ajaia Docs</h1>
<p>This is a small, deliberately scoped document editor built for the Ajaia assignment. <strong>Bold</strong>, <em>italic</em>, <u>underline</u>, headings and lists all work, and edits save automatically.</p>
<h2>Try it out</h2>
<ul>
  <li>Rename this document by clicking the title.</li>
  <li>Open <strong>Share</strong> and invite Bob as an Editor or Carol as a Viewer.</li>
  <li>Use <strong>Export</strong> to download Markdown or print this document.</li>
  <li>Import a .txt, .md or .docx file from the dashboard.</li>
</ul>
<h2>What is deliberately missing</h2>
<p>Real-time collaboration, comments, version history and file attachments are out of scope. The focus is a correct, server-enforced core: password authentication with DB-backed sessions, CRUD, HTML sanitization, sharing permissions and file import.</p>
`);

async function main() {
  const seeded = new Map<string, string>();

  for (const user of SEED_USERS) {
    // Idempotent: re-seeding restores the documented demo password and resets
    // any lockout, without creating duplicate users or documents.
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST);

    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash,
        failedAttempts: 0,
        lockedUntil: null,
      },
      create: { ...user, passwordHash },
      select: { id: true, email: true },
    });
    seeded.set(record.email, record.id);
  }

  const aliceId = seeded.get("alice@ajaia.test");
  const bobId = seeded.get("bob@ajaia.test");

  if (!aliceId || !bobId) {
    throw new Error("Seed users were not created.");
  }

  const existing = await prisma.document.findFirst({
    where: { ownerId: aliceId, title: WELCOME_TITLE },
    select: { id: true },
  });

  if (!existing) {
    const welcome = await prisma.document.create({
      data: {
        title: WELCOME_TITLE,
        content: WELCOME_CONTENT,
        ownerId: aliceId,
      },
      select: { id: true },
    });

    await prisma.share.create({
      data: { documentId: welcome.id, userId: bobId, role: "EDITOR" },
    });
  }

  const counts = await prisma.$transaction([
    prisma.user.count(),
    prisma.document.count(),
    prisma.share.count(),
  ]);

  console.log(
    `Seeded ${counts[0]} users, ${counts[1]} documents, ${counts[2]} shares.`,
  );
  console.log(`Demo password for every seeded user: ${DEMO_PASSWORD}`);
  for (const user of SEED_USERS) console.log(`  ${user.name} <${user.email}>`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
