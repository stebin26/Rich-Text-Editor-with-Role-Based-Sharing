"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AlertIcon } from "./icons";

export default function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not sign in.");
      }

      const destination =
        next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      router.replace(destination);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
      {error ? (
        <div role="alert" className="ui-alert ui-alert-danger">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div>
        <label htmlFor="email" className="ui-label">
          Email
        </label>
        <input
          id="email"
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
        <label htmlFor="password" className="ui-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Your password"
          className="ui-input"
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="ui-btn ui-btn-primary ui-btn-lg mt-1 w-full"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>

      <p className="pt-1 text-center text-[12px] text-muted">
        New here?{" "}
        <Link href="/signup" className="link-accent">
          Create an account
        </Link>
      </p>
    </form>
  );
}
