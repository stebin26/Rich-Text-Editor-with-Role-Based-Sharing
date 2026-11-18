import Link from "next/link";

import DashboardActions from "@/components/DashboardActions";
import DeleteDocumentButton from "@/components/DeleteDocumentButton";
import LogoutButton from "@/components/LogoutButton";
import {
  DocumentIcon,
  ShareIcon,
  SparklesIcon,
} from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatEditedAt, initials, roleLabel } from "@/lib/format";

const roleBadgeStyles: Record<"EDITOR" | "VIEWER", string> = {
  EDITOR: "ui-badge-accent",
  VIEWER: "ui-badge-warn",
};

const thumbTones = [
  "doc-thumb-a",
  "doc-thumb-b",
  "doc-thumb-c",
  "doc-thumb-d",
  "doc-thumb-e",
];

/** Deterministic thumbnail tint so a card keeps its colour between renders. */
function thumbTone(seed: string) {
  let total = 0;
  for (let index = 0; index < seed.length; index += 1) {
    total += seed.charCodeAt(index);
  }
  return thumbTones[total % thumbTones.length];
}

function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-line bg-surface/70 px-6 py-14 text-center">
      <span className="empty-icon mx-auto">{icon}</span>
      <p className="mt-4 text-[14px] font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1.5 max-w-xs text-[12.5px] leading-relaxed text-muted">
        {description}
      </p>
    </div>
  );
}

function SectionHeading({
  id,
  children,
  count,
}: {
  id: string;
  children: React.ReactNode;
  count: number;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <h2
        id={id}
        className="text-[15px] font-bold tracking-[-0.015em] text-ink"
      >
        {children}
      </h2>
      <span className="ui-badge ui-badge-neutral tabular-nums">{count}</span>
      <span className="ml-1 hidden h-px flex-1 bg-line sm:block" aria-hidden="true" />
    </div>
  );
}

function DocumentCard({
  id,
  title,
  updatedAt,
  footer,
}: {
  id: string;
  title: string;
  updatedAt: Date;
  footer?: React.ReactNode;
}) {
  return (
    <li className="doc-card group">
      <Link href={`/docs/${id}`} className="block">
        <span className={`doc-thumb ${thumbTone(id)}`} aria-hidden="true">
          <span className="doc-thumb-sheet">
            <span className="doc-thumb-bar doc-thumb-bar-accent" />
            <span className="doc-thumb-bar w-full" />
            <span className="doc-thumb-bar w-[86%]" />
            <span className="doc-thumb-bar w-[68%]" />
          </span>
        </span>

        <span className="block px-4 pb-4 pt-3.5">
          <span className="block truncate text-[14.5px] font-semibold tracking-[-0.012em] text-ink transition-colors group-hover:text-accent-strong">
            {title}
          </span>
          <span className="mt-1 block text-[11.5px] text-muted">
            {formatEditedAt(updatedAt)}
          </span>
          {footer ? (
            <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {footer}
            </span>
          ) : null}
        </span>
      </Link>

      <div className="absolute right-2.5 top-2.5">
        <DeleteDocumentButton documentId={id} title={title} />
      </div>
    </li>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();

  const [owned, shared] = await Promise.all([
    db.document.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true },
    }),
    db.share.findMany({
      where: { userId: user.id },
      orderBy: { document: { updatedAt: "desc" } },
      select: {
        role: true,
        document: {
          select: {
            id: true,
            title: true,
            updatedAt: true,
            owner: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const firstName = user.name.trim().split(/\s+/)[0] || user.name;

  return (
    <div className="min-h-screen lg:flex">
      <aside className="no-print border-b border-line bg-surface/85 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:w-[17rem] lg:shrink-0 lg:border-b-0 lg:border-r lg:border-line-soft lg:bg-surface/50 lg:backdrop-blur-none">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:h-full lg:flex-col lg:items-stretch lg:px-5 lg:py-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="brand-mark" aria-hidden="true">
              A
            </span>
            <span className="text-[15.5px] font-bold tracking-[-0.028em] text-ink">
              Ajaia Docs
            </span>
          </Link>

          <div className="flex items-center gap-2 lg:hidden">
            <span className="ui-avatar" aria-hidden="true">
              {initials(user.name)}
            </span>
            <LogoutButton />
          </div>

          <nav
            className="mt-8 hidden space-y-1 lg:block"
            aria-label="Workspace"
          >
            <Link href="/" className="nav-item">
              <DocumentIcon className="h-4 w-4" />
              Documents
            </Link>
            <Link href="#owned" className="nav-item nav-item-active">
              <DocumentIcon className="h-4 w-4" />
              My documents
              <span className="ui-badge ui-badge-accent ml-auto tabular-nums">
                {owned.length}
              </span>
            </Link>
            <Link href="#shared" className="nav-item">
              <ShareIcon className="h-4 w-4" />
              Shared with me
              <span className="ui-badge ui-badge-neutral ml-auto tabular-nums">
                {shared.length}
              </span>
            </Link>
          </nav>

          <div className="mt-auto hidden border-t border-line-soft pt-4 lg:block">
            <div className="flex items-center gap-2.5">
              <span className="ui-avatar" aria-hidden="true">
                {initials(user.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-ink">
                  {user.name}
                </p>
                <p className="truncate text-[11px] text-muted">Signed in</p>
              </div>
            </div>
            <div className="mt-3">
              <LogoutButton />
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-8 sm:pt-9">
          <header className="relative overflow-hidden rounded-[1.5rem] border border-line bg-surface px-5 py-6 shadow-card sm:px-8 sm:py-9">
            <div
              className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-accent/15 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-28 right-24 h-44 w-44 rounded-full bg-amber-300/25 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative">
              <p className="ui-eyebrow">
                <SparklesIcon className="h-3.5 w-3.5" />
                Your workspace
              </p>
              <h1 className="ui-display mt-3">
                {greeting(new Date())}, {firstName}.
              </h1>
              <p className="mt-2.5 max-w-lg text-[13.5px] leading-relaxed text-muted">
                Create, import and share documents. Everything saves to
                Postgres.
              </p>

              <DashboardActions />
            </div>
          </header>

          <div className="mt-7 flex flex-wrap gap-2 lg:hidden">
            <a href="#owned" className="tab-pill">
              <DocumentIcon className="h-3.5 w-3.5" />
              My documents
              <span className="tabular-nums text-faint">{owned.length}</span>
            </a>
            <a href="#shared" className="tab-pill">
              <ShareIcon className="h-3.5 w-3.5" />
              Shared with me
              <span className="tabular-nums text-faint">{shared.length}</span>
            </a>
          </div>

          <section
            id="owned"
            aria-labelledby="owned-heading"
            className="mt-9 scroll-mt-24"
          >
            <SectionHeading id="owned-heading" count={owned.length}>
              My documents
            </SectionHeading>

            {owned.length === 0 ? (
              <EmptyState
                icon={<DocumentIcon className="h-5 w-5" />}
                title="No documents yet"
                description="Create a blank document or import a .txt, .md or .docx file to get started."
              />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {owned.map((document) => (
                  <DocumentCard
                    key={document.id}
                    id={document.id}
                    title={document.title}
                    updatedAt={document.updatedAt}
                  />
                ))}
              </ul>
            )}
          </section>

          <section
            id="shared"
            aria-labelledby="shared-heading"
            className="mt-10 scroll-mt-24"
          >
            <SectionHeading id="shared-heading" count={shared.length}>
              Shared with me
            </SectionHeading>

            {shared.length === 0 ? (
              <EmptyState
                icon={<ShareIcon className="h-5 w-5" />}
                title="Nothing shared with you yet"
                description="When a teammate shares a document, it appears here with their name and your role."
              />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {shared.map(({ document, role }) => (
                  <DocumentCard
                    key={document.id}
                    id={document.id}
                    title={document.title}
                    updatedAt={document.updatedAt}
                    footer={
                      <>
                        <span className="ui-badge ui-badge-neutral">
                          Owner: {document.owner.name}
                        </span>
                        <span className={`ui-badge ${roleBadgeStyles[role]}`}>
                          {roleLabel(role)}
                        </span>
                      </>
                    }
                  />
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
