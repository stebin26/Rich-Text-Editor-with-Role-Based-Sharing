import Link from "next/link";

import { initials } from "@/lib/format";
import type { SessionUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default function AppHeader({ user }: { user: SessionUser }) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line/80 bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl py-1 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="brand-mark" aria-hidden="true">
              A
            </span>
            <span className="text-[15.5px] font-bold tracking-[-0.028em] text-ink">
              Ajaia Docs
            </span>
          </Link>

          <span
            className="mx-1 hidden h-5 w-px bg-line sm:block"
            aria-hidden="true"
          />

          <Link
            href="/"
            className="hidden rounded-full border border-line bg-surface px-3 py-1 text-[12px] font-semibold text-muted transition hover:border-accent-line hover:bg-accent-soft hover:text-accent-strong sm:block"
          >
            Documents
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <span className="ui-avatar" aria-hidden="true">
              {initials(user.name)}
            </span>
            <span className="hidden max-w-[10rem] truncate text-[13px] font-semibold text-ink-soft sm:block">
              {user.name}
            </span>
          </div>

          <span
            className="hidden h-6 w-px bg-line sm:block"
            aria-hidden="true"
          />

          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
