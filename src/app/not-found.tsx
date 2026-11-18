import Link from "next/link";

import { DocumentIcon } from "@/components/icons";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div
        className="auth-backdrop pointer-events-none absolute inset-0"
        aria-hidden="true"
      />

      <div className="ui-card relative w-full max-w-md px-7 py-10 text-center">
        <span className="empty-icon mx-auto">
          <DocumentIcon className="h-5 w-5" />
        </span>
        <p className="ui-eyebrow mt-5 justify-center">404 · Not found</p>
        <h1 className="mt-2.5 text-[23px] font-extrabold leading-snug tracking-[-0.032em] text-ink">
          Document not found or you don&apos;t have access
        </h1>
        <p className="mx-auto mt-2.5 max-w-sm text-[12.5px] leading-relaxed text-muted">
          The document may have been deleted, or it isn&apos;t shared with the
          account you&apos;re signed in as.
        </p>
        <Link
          href="/"
          className="ui-btn ui-btn-primary ui-btn-lg mt-7 w-full sm:w-auto sm:px-7"
        >
          Back to documents
        </Link>
      </div>
    </main>
  );
}
