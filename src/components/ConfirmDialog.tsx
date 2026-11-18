"use client";

import { useEffect } from "react";

import { AlertIcon } from "./icons";

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel, open]);

  if (!open) return null;

  return (
    <div
      className="ui-overlay fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      onMouseDown={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="ui-modal w-full max-w-[27rem] rounded-t-3xl border border-line bg-surface p-5 shadow-modal sm:rounded-3xl sm:p-7"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-danger-line bg-danger-soft text-danger">
            <AlertIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2
              id="confirm-dialog-title"
              className="text-[19px] font-bold leading-snug tracking-[-0.025em] text-ink"
            >
              {title}
            </h2>
            <p
              id="confirm-dialog-description"
              className="mt-1.5 text-[13px] leading-relaxed text-muted"
            >
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="ui-btn ui-btn-secondary justify-center px-5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            autoFocus
            className="ui-btn ui-btn-danger justify-center px-5"
          >
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
