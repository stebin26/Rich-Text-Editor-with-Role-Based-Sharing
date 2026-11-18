"use client";

import { useEffect, useRef, useState } from "react";

import { ChevronDownIcon, DownloadIcon, PrinterIcon } from "./icons";

export default function ExportMenu({ documentId }: { documentId: string }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointerDown(event: MouseEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="no-print relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="ui-btn ui-btn-onDark ui-btn-sm gap-1.5"
      >
        <DownloadIcon className="h-4 w-4" />
        Export
        <ChevronDownIcon
          className={`h-3.5 w-3.5 text-white/60 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Export options"
          className="ui-pop absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-menu"
        >
          <a
            role="menuitem"
            href={`/api/documents/${documentId}/export`}
            download
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:bg-accent-soft hover:text-accent-strong"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-accent-line/70 bg-accent-soft text-accent-strong">
              <DownloadIcon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate">Markdown (.md)</span>
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              window.print();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-ink-soft transition-colors hover:bg-accent-soft hover:text-accent-strong"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-accent-line/70 bg-accent-soft text-accent-strong">
              <PrinterIcon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate">
              Print / Save as PDF
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
