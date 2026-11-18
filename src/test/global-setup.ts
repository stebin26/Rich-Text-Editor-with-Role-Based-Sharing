import { execFileSync } from "node:child_process";

import { PrismaClient } from "@prisma/client";

/**
 * Creates the dedicated test database if needed, applies migrations against it
 * and empties the tables. Only runs when a database URL is configured; the
 * database-backed suite skips itself otherwise.
 */
export default async function setup() {
  const url = process.env.DATABASE_URL;
  if (!url) return;

  await ensureDatabaseExists(url);

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  });

  const prisma = new PrismaClient({ datasourceUrl: url });
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Session", "Share", "Document", "User" CASCADE',
  );
  await prisma.$disconnect();
}

async function ensureDatabaseExists(url: string) {
  const parsed = new URL(url);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!databaseName) return;

  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";

  const admin = new PrismaClient({ datasourceUrl: adminUrl.toString() });
  try {
    await admin.$executeRawUnsafe(
      `CREATE DATABASE "${databaseName.replace(/"/g, '""')}"`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists/i.test(message)) {
      throw new Error(
        `Could not create the test database "${databaseName}": ${message}\n` +
          "Create it manually or point TEST_DATABASE_URL at an existing database.",
      );
    }
  } finally {
    await admin.$disconnect();
  }
}
