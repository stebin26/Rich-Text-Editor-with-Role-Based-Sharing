"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { checkPassword } from "@/lib/password";
import { AlertIcon } from "./icons";
import PasswordChecklist from "./PasswordChecklist";

export default function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const policy = checkPassword(password, email);
  const matches = password.length > 0 && password === confirm;
  const canSubmit = policy.ok && matches && name.trim().length > 0 && !busy;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!policy.ok) {
      setError(policy.failures[0]?.message ?? "Choose a stronger password.");
      return;
    }

    if (!matches) {
      setError("Those passwords don't match.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email, password }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not create your account.");
      }

      router.replace("/");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create your account.",
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
      {error ? (
        <div role="alert" className="ui-alert ui-alert-danger">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div>
        <label htmlFor="signup-name" className="ui-label">
          Name
        </label>
        <input
          id="signup-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ada Lovelace"
          className="ui-input"
        />
      </div>

      <div>
        <label htmlFor="signup-email" className="ui-label">
          Email
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="ui-input"
        />
      </div>

      <div>
        <label htmlFor="signup-password" className="ui-label">
          Password
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby="password-requirements"
          placeholder="Choose a strong password"
          className="ui-input"
        />
        <div
          id="password-requirements"
          className="mt-2.5 rounded-xl border border-accent-line/70 bg-accent-soft/60 px-3 py-2.5"
        >
          <PasswordChecklist password={password} email={email} />
        </div>
      </div>

      <div>
        <label htmlFor="signup-confirm" className="ui-label">
          Confirm password
        </label>
        <input
          id="signup-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="Type it again"
          aria-invalid={confirm.length > 0 && !matches}
          className="ui-input"
        />
        {confirm.length > 0 && !matches ? (
          <p className="mt-1.5 text-[11.5px] font-medium text-danger">
            Those passwords don&apos;t match yet.
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="ui-btn ui-btn-primary ui-btn-lg mt-1 w-full"
      >
        {busy ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
