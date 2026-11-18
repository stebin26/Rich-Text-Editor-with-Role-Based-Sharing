"use client";

import Link from "next/link";

import { AlertIcon } from "@/components/icons";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div
        className="auth-backdrop pointer-events-none absolute inset-0"
        aria-hidden="true"
      />

      <div className="ui-card relative w-full max-w-md px-7 py-10 text-center">
        <span className="mx-auto grid h-[3.25rem] w-[3.25rem] place-items-center rounded-2xl border border-danger-line bg-danger-soft text-danger">
          <AlertIcon className="h-5 w-5" />
        </span>
        <p className="ui-eyebrow mt-5 justify-center">Something broke</p>
        <h1 className="mt-2.5 text-[23px] font-extrabold leading-snug tracking-[-0.032em] text-ink">
          Something went wrong
        </h1>
        <p className="mx-auto mt-2.5 max-w-sm text-[12.5px] leading-relaxed text-muted">
          The page couldn&apos;t be loaded. Nothing you saved has been lost —
          try again, or head back to your documents.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="ui-btn ui-btn-primary justify-center px-5"
          >
            Try again
          </button>
          <Link href="/" className="ui-btn ui-btn-secondary justify-center px-5">
            Back to documents
          </Link>
        </div>
      </div>
    </main>
  );
}
