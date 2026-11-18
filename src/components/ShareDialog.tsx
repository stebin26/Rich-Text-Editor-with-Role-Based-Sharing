"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { initials, roleLabel } from "@/lib/format";
import type { ShareRole, ShareView } from "@/lib/types";
import { AlertIcon, CheckIcon, ShareIcon, XIcon } from "./icons";

type ShareDialogProps = {
  documentId: string;
  documentTitle: string;
  owner: { name: string; email: string };
  initialShares: ShareView[];
};

export default function ShareDialog({
  documentId,
  documentTitle,
  owner,
  initialShares,
}: ShareDialogProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<ShareView[]>(initialShares);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("VIEWER");
  const [busy, setBusy] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function openDialog() {
    setError(null);
    setNotice(null);
    setOpen(true);
  }

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/shares`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const body = (await response.json().catch(() => null)) as {
        shares?: ShareView[];
        message?: string;
        error?: string;
      } | null;

      if (!response.ok || !body?.shares) {
        throw new Error(body?.error ?? "Could not share the document.");
      }

      setShares(body.shares);
      // Deliberately generic: the API never confirms whether the email exists.
      setNotice(body.message ?? "If that account exists, access has been granted.");
      setEmail("");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not share the document.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(share: ShareView, nextRole: ShareRole) {
    if (nextRole === share.role) return;

    setBusyUserId(share.userId);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/shares`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: share.email, role: nextRole }),
      });
      const body = (await response.json().catch(() => null)) as {
        shares?: ShareView[];
        error?: string;
      } | null;

      if (!response.ok || !body?.shares) {
        throw new Error(body?.error ?? "Could not change that role.");
      }

      setShares(body.shares);
      setNotice(`${share.name} is now ${roleLabel(nextRole)}.`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not change that role.");
    } finally {
      setBusyUserId(null);
    }
  }

  async function remove(share: ShareView) {
    setBusyUserId(share.userId);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/shares`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: share.userId }),
      });
      const body = (await response.json().catch(() => null)) as {
        shares?: ShareView[];
        error?: string;
      } | null;

      if (!response.ok || !body?.shares) {
        throw new Error(body?.error ?? "Could not remove that person.");
      }

      setShares(body.shares);
      setNotice(`Removed access for ${share.name}.`);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not remove that person.",
      );
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="ui-btn ui-btn-primary ui-btn-sm gap-1.5"
      >
        <ShareIcon className="h-4 w-4" />
        Share
      </button>

      {open ? (
        <div
          className="ui-overlay fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          onMouseDown={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-dialog-title"
            className="ui-modal flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl border border-line bg-surface shadow-modal sm:rounded-3xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line-soft px-5 py-5 sm:px-7">
              <div className="min-w-0">
                <h2
                  id="share-dialog-title"
                  className="text-[19px] font-bold tracking-[-0.025em] text-ink"
                >
                  Share document
                </h2>
                <p className="mt-0.5 max-w-sm truncate text-[12px] text-muted">
                  {documentTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close share dialog"
                className="ui-icon-btn -mr-1 shrink-0"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3 rounded-2xl border border-accent-line/60 bg-accent-soft/50 px-3 py-2.5">
                <span className="ui-avatar ui-avatar-soft">
                  {initials(owner.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {owner.name}{" "}
                    <span className="font-normal text-muted">(you)</span>
                  </p>
                  <p className="truncate text-[11.5px] text-muted">
                    {owner.email}
                  </p>
                </div>
                <span className="ui-badge ui-badge-neutral">Owner</span>
              </div>

              <div className="mt-6">
                <h3 className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-accent-strong">
                  People with access
                </h3>

                {shares.length === 0 ? (
                  <p className="mt-2.5 rounded-xl border border-dashed border-line bg-canvas/60 px-3 py-5 text-center text-[12.5px] text-muted">
                    Only you have access so far.
                  </p>
                ) : (
                  <ul className="mt-1 divide-y divide-line-soft">
                    {shares.map((share) => (
                      <li
                        key={share.userId}
                        className="flex items-center gap-2.5 py-2.5"
                      >
                        <span className="ui-avatar ui-avatar-soft shrink-0">
                          {initials(share.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-ink">
                            {share.name}
                          </p>
                          <p className="truncate text-[11.5px] text-muted">
                            {share.email}
                          </p>
                        </div>
                        <select
                          aria-label={`Role for ${share.name}`}
                          value={share.role}
                          disabled={busyUserId === share.userId}
                          onChange={(event) =>
                            void changeRole(
                              share,
                              event.target.value as ShareRole,
                            )
                          }
                          className="ui-select ui-select-sm shrink-0"
                        >
                          <option value="VIEWER">Viewer</option>
                          <option value="EDITOR">Editor</option>
                        </select>
                        <button
                          type="button"
                          aria-label={`Remove ${share.name}`}
                          disabled={busyUserId === share.userId}
                          onClick={() => void remove(share)}
                          className="ui-icon-btn ui-icon-btn-danger h-7 w-7 shrink-0 disabled:opacity-40"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {error ? (
                <div role="alert" className="ui-alert ui-alert-danger mt-3">
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              {notice ? (
                <div className="ui-alert ui-alert-success mt-3">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{notice}</span>
                </div>
              ) : null}
            </div>

            <form
              onSubmit={invite}
              className="border-t border-line-soft bg-canvas/70 px-5 py-5 sm:rounded-b-3xl sm:px-7"
            >
              <label htmlFor="invite-email" className="ui-label">
                Invite by email
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="invite-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="bob@ajaia.test"
                  className="ui-input min-w-0 flex-1"
                />
                <select
                  aria-label="Role for the new collaborator"
                  value={role}
                  onChange={(event) => setRole(event.target.value as ShareRole)}
                  className="ui-select shrink-0"
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="EDITOR">Editor</option>
                </select>
                <button
                  type="submit"
                  disabled={busy || !email.trim()}
                  className="ui-btn ui-btn-primary justify-center sm:px-4"
                >
                  {busy ? "Inviting…" : "Invite"}
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                Editors can edit; viewers can read only. Enter the email they
                signed up with.
              </p>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
