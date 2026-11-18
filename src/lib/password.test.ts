import { describe, expect, it } from "vitest";

import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  checkPassword,
} from "./password";

const EMAIL = "alice@ajaia.test";
const DEMO_PASSWORD = "Ajaia-Demo-2026!";

function failureIds(password: string, email = EMAIL) {
  return checkPassword(password, email).failures.map((failure) => failure.id);
}

describe("checkPassword", () => {
  it("accepts the documented demo password", () => {
    expect(checkPassword(DEMO_PASSWORD, EMAIL)).toMatchObject({ ok: true, failures: [] });
  });

  it("accepts another strong password", () => {
    expect(checkPassword("Tr0ub4dor&3x", "sam@example.com").ok).toBe(true);
  });

  it("rejects passwords shorter than the minimum", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10);
    expect(failureIds("Ab1!efgh")).toContain("length");
  });

  it("rejects passwords longer than bcrypt's 72-byte limit", () => {
    // 3 ASCII chars + 40 two-byte characters = 83 bytes but only 43 chars.
    const password = `Aa1!${"é".repeat(40)}`;
    expect(password.length).toBeLessThan(PASSWORD_MAX_BYTES);
    expect(failureIds(password)).toContain("length");
  });

  it("requires lower, upper, number and symbol", () => {
    expect(failureIds("abcdefghij")).toEqual(
      expect.arrayContaining(["uppercase", "number", "symbol"]),
    );
    expect(failureIds("ABCDEFGHIJ")).toEqual(
      expect.arrayContaining(["lowercase", "number", "symbol"]),
    );
    expect(failureIds("Abcdefghij")).toEqual(
      expect.arrayContaining(["number", "symbol"]),
    );
    expect(failureIds("Abcdefghi1")).toEqual(expect.arrayContaining(["symbol"]));
  });

  it("rejects passwords on the common list", () => {
    expect(failureIds("password123")).toContain("common");
  });

  it("rejects a password containing the email's local part", () => {
    expect(failureIds("Alice-Is-Here-2026!")).toContain("email");
  });

  it("ignores email local parts shorter than three characters", () => {
    expect(checkPassword("Ab1!efghij", "ab@example.com").failures).toHaveLength(0);
  });

  it("reports every rule so the UI can render a checklist", () => {
    const result = checkPassword("", EMAIL);
    expect(result.ok).toBe(false);
    expect(Object.keys(result.passed).sort()).toEqual(
      PASSWORD_RULES.map((rule) => rule.id).sort(),
    );
    const failedRuleIds = PASSWORD_RULES.filter(
      (rule) => !result.passed[rule.id],
    ).map((rule) => rule.id);
    expect(result.failures.map((failure) => failure.id)).toEqual(failedRuleIds);
    for (const failure of result.failures) {
      expect(failure.message.length).toBeGreaterThan(0);
    }
  });
});
