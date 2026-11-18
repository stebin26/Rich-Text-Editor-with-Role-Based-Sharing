"use client";

import { PASSWORD_RULES, checkPassword } from "@/lib/password";
import { CheckIcon, XIcon } from "./icons";

/**
 * Live checklist for the signup form. Uses the exact same `checkPassword`
 * implementation the API enforces.
 */
export default function PasswordChecklist({
  password,
  email,
}: {
  password: string;
  email: string;
}) {
  const { passed } = checkPassword(password, email);

  return (
    <ul
      className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2"
      aria-label="Password requirements"
    >
      {PASSWORD_RULES.map((rule) => {
        const ok = passed[rule.id];
        return (
          <li
            key={rule.id}
            className={`flex items-start gap-1.5 text-[11.5px] leading-4 transition-colors ${
              ok ? "text-success" : "text-muted"
            }`}
          >
            <span
              className={`mt-px grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border ${
                ok
                  ? "border-success-line bg-success-soft text-success"
                  : "border-line bg-white text-faint"
              }`}
            >
              {ok ? (
                <CheckIcon className="h-2.5 w-2.5" />
              ) : (
                <XIcon className="h-2 w-2" />
              )}
            </span>
            <span>
              {rule.label}
              <span className="sr-only">{ok ? " — met" : " — not met yet"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
