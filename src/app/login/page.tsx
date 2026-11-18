import { redirect } from "next/navigation";

import LoginForm from "@/components/LoginForm";
import { DocumentIcon, ShareIcon, UploadIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const existing = await getCurrentUser().catch(() => null);
  if (existing) redirect("/");

  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="auth-panel relative hidden flex-col justify-between px-12 py-12 lg:flex xl:px-16">
        <div className="flex items-center gap-3">
          <span
            className="brand-mark brand-mark-lg brand-mark-glass"
            aria-hidden="true"
          >
            A
          </span>
          <span className="text-[17px] font-bold tracking-[-0.028em] text-white">
            Ajaia Docs
          </span>
        </div>

        <div className="max-w-[27rem] py-10">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/60">
            Collaborative documents
          </p>
          <p className="auth-headline mt-4">
            Write together.
            <br />
            Stay in <span className="auth-headline-em">flow</span>.
          </p>
          <p className="mt-5 max-w-sm text-[14.5px] leading-relaxed text-white/75">
            One focused place for the documents your team actually shares. No
            clutter, no lost work.
          </p>

          <ul className="mt-10 space-y-4">
            <li className="auth-point">
              <span className="auth-point-icon">
                <DocumentIcon className="h-4 w-4" />
              </span>
              <span>
                <span className="font-semibold text-white">
                  Format and autosave.
                </span>{" "}
                Headings, lists and links that save as you type.
              </span>
            </li>
            <li className="auth-point">
              <span className="auth-point-icon">
                <ShareIcon className="h-4 w-4" />
              </span>
              <span>
                <span className="font-semibold text-white">
                  Share with intent.
                </span>{" "}
                Invite teammates as Viewer or Editor in seconds.
              </span>
            </li>
            <li className="auth-point">
              <span className="auth-point-icon">
                <UploadIcon className="h-4 w-4" />
              </span>
              <span>
                <span className="font-semibold text-white">
                  Bring your files.
                </span>{" "}
                Import .txt, .md or .docx and keep writing.
              </span>
            </li>
          </ul>
        </div>

        <p className="text-[11.5px] text-white/55">
          Ajaia Docs · Private by default
        </p>
      </aside>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:py-16">
        <div className="w-full max-w-[26rem]">
          <div className="auth-panel mb-8 rounded-[1.5rem] px-5 py-6 lg:hidden">
            <div className="flex items-center gap-3">
              <span
                className="brand-mark brand-mark-glass"
                aria-hidden="true"
              >
                A
              </span>
              <span className="text-[15px] font-bold tracking-[-0.025em] text-white">
                Ajaia Docs
              </span>
            </div>
            <p className="mt-3 text-[13px] leading-snug text-white/80">
              Write together. Stay in flow.
            </p>
          </div>

          <p className="ui-eyebrow">Welcome back</p>
          <h1 className="mt-2.5 text-[32px] font-extrabold leading-[1.05] tracking-[-0.04em] text-ink sm:text-[36px]">
            Sign in
          </h1>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
            Sign in to open your documents.
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
            Use the email and password you signed up with.
          </p>

          <LoginForm next={next} />

          <div className="mt-6 rounded-2xl border border-dashed border-accent-line bg-accent-soft/70 px-4 py-3.5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-strong">
              Demo account
            </p>
            <p className="mt-1.5 font-mono text-[11.5px] tracking-tight text-ink-soft">
              alice@ajaia.test · Ajaia-Demo-2026!
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
