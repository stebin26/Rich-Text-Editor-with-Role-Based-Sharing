import Link from "next/link";
import { redirect } from "next/navigation";

import SignupForm from "@/components/SignupForm";
import { LockIcon, ShareIcon, UploadIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";

export default async function SignupPage() {
  const existing = await getCurrentUser().catch(() => null);
  if (existing) redirect("/");

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
            Your workspace
          </p>
          <p className="auth-headline mt-4">
            Start your first
            <br />
            doc in <span className="auth-headline-em">seconds</span>.
          </p>
          <p className="mt-5 max-w-sm text-[14.5px] leading-relaxed text-white/75">
            Create an account and you are already writing. Everything stays
            private until you decide to share it.
          </p>

          <ul className="mt-10 space-y-4">
            <li className="auth-point">
              <span className="auth-point-icon">
                <LockIcon className="h-4 w-4" />
              </span>
              <span>
                <span className="font-semibold text-white">Private first.</span>{" "}
                Nobody sees a document until you invite them.
              </span>
            </li>
            <li className="auth-point">
              <span className="auth-point-icon">
                <ShareIcon className="h-4 w-4" />
              </span>
              <span>
                <span className="font-semibold text-white">
                  Clear permissions.
                </span>{" "}
                Viewers read, editors write — no guesswork.
              </span>
            </li>
            <li className="auth-point">
              <span className="auth-point-icon">
                <UploadIcon className="h-4 w-4" />
              </span>
              <span>
                <span className="font-semibold text-white">Nothing locked.</span>{" "}
                Export to Markdown or print to PDF anytime.
              </span>
            </li>
          </ul>
        </div>

        <p className="text-[11.5px] text-white/55">
          Ajaia Docs · Private by default
        </p>
      </aside>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:py-14">
        <div className="w-full max-w-[27rem]">
          <div className="auth-panel mb-7 rounded-[1.5rem] px-5 py-6 lg:hidden">
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
              Start your first doc in seconds.
            </p>
          </div>

          <p className="ui-eyebrow">Get started</p>
          <h1 className="mt-2.5 text-[30px] font-extrabold leading-[1.06] tracking-[-0.04em] text-ink sm:text-[34px]">
            Create your account
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            Your documents stay private until you share them.
          </p>

          <SignupForm />

          <div className="mt-6 border-t border-line-soft pt-4 text-center">
            <p className="text-[12.5px] text-muted">
              Already have an account?{" "}
              <Link href="/login" className="link-accent">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
