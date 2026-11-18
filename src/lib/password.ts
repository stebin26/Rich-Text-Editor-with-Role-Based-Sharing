/**
 * Password policy, shared verbatim by the signup form (live checklist) and the
 * server (authoritative check). Pure so it can be unit tested without a DB.
 */

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_BYTES = 72; // bcrypt silently truncates beyond this

export type PasswordRuleId =
  | "length"
  | "lowercase"
  | "uppercase"
  | "number"
  | "symbol"
  | "common"
  | "email";

export type PasswordRule = {
  id: PasswordRuleId;
  label: string;
  /** The rule passes when this returns true. */
  test: (password: string, email: string) => boolean;
};

/**
 * Small, deliberately unambitious list. This is not a breach corpus; its job is
 * to stop the obvious demo passwords that also satisfy the composition rules.
 */
const COMMON_PASSWORDS = new Set([
  "1234567890",
  "abc123456",
  "admin12345",
  "changeme123",
  "iloveyou123",
  "letmein123",
  "login12345",
  "monkey12345",
  "password",
  "password1",
  "password12",
  "password123",
  "password1234",
  "passw0rd123",
  "p@ssw0rd123",
  "qwerty12345",
  "qwertyuiop",
  "starwars123",
  "superman123",
  "trustno1",
  "welcome123",
  "welcome1234",
  "whatever123",
]);

const SYMBOL_PATTERN = /[^A-Za-z0-9\s]/;

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function emailLocalPart(email: string): string {
  const local = email.split("@")[0]?.trim().toLowerCase() ?? "";
  return local;
}

export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (password) =>
      password.length >= PASSWORD_MIN_LENGTH &&
      byteLength(password) <= PASSWORD_MAX_BYTES,
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "number",
    label: "One number",
    test: (password) => /[0-9]/.test(password),
  },
  {
    id: "symbol",
    label: "One symbol",
    test: (password) => SYMBOL_PATTERN.test(password),
  },
  {
    id: "common",
    label: "Not a commonly used password",
    test: (password) => !COMMON_PASSWORDS.has(password.toLowerCase()),
  },
  {
    id: "email",
    label: "Does not contain your email name",
    test: (password, email) => {
      const local = emailLocalPart(email);
      if (local.length < 3) return true;
      return !password.toLowerCase().includes(local);
    },
  },
];

export const PASSWORD_RULE_MESSAGES: Record<PasswordRuleId, string> = {
  length: `Use between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_BYTES} characters.`,
  lowercase: "Add at least one lowercase letter.",
  uppercase: "Add at least one uppercase letter.",
  number: "Add at least one number.",
  symbol: "Add at least one symbol.",
  common: "That password is too common. Choose something less predictable.",
  email: "Your password can't contain your email name.",
};

export type PasswordChecklist = Record<PasswordRuleId, boolean>;

export type PasswordValidation = {
  ok: boolean;
  passed: PasswordChecklist;
  failures: { id: PasswordRuleId; message: string }[];
};

export function checkPassword(password: string, email: string): PasswordValidation {
  const passed = {} as PasswordChecklist;
  const failures: PasswordValidation["failures"] = [];

  for (const rule of PASSWORD_RULES) {
    const ok = rule.test(password, email);
    passed[rule.id] = ok;
    if (!ok) failures.push({ id: rule.id, message: PASSWORD_RULE_MESSAGES[rule.id] });
  }

  return { ok: failures.length === 0, passed, failures };
}
