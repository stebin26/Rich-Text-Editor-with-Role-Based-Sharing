import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function readEnvValue(name: string): string | undefined {
  try {
    const contents = readFileSync(fileURLToPath(new URL("../../.env", import.meta.url)), "utf8");
    const match = contents.match(new RegExp(`^${name}\\s*=\\s*"?([^"\\n]+)"?`, "m"));
    return match?.[1]?.trim();
  } catch {
    return undefined;
  }
}

/**
 * Tests never run against the development database: the database name is
 * suffixed with `_test` (e.g. ajia_docs -> ajia_docs_test). Set
 * TEST_DATABASE_URL to override.
 */
export function resolveTestDatabaseUrl(): string | undefined {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;

  const raw = process.env.DATABASE_URL ?? readEnvValue("DATABASE_URL");
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    const name = decodeURIComponent(url.pathname.replace(/^\//, ""));
    if (!name) return undefined;
    url.pathname = `/${name}_test`;
    return url.toString();
  } catch {
    return undefined;
  }
}
