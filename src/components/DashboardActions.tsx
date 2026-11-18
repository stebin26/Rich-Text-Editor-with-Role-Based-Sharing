"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { IMPORT_ACCEPT, IMPORT_HINT, MAX_IMPORT_BYTES } from "@/lib/limits";
import { PlusIcon, UploadIcon } from "./icons";
import { useToast } from "./ToastProvider";

export default function DashboardActions() {
  const router = useRouter();
  const { show } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function createDocument() {
    setCreating(true);

    try {
      const response = await fetch("/api/documents", { method: "POST" });
      const body = (await response.json().catch(() => null)) as {
        document?: { id: string };
        error?: string;
      } | null;

      if (!response.ok || !body?.document) {
        throw new Error(body?.error ?? "Could not create the document.");
      }

      router.push(`/docs/${body.document.id}`);
    } catch (cause) {
      show(
        cause instanceof Error ? cause.message : "Could not create the document.",
        "error",
      );
      setCreating(false);
    }
  }

  async function uploadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMPORT_BYTES) {
      show("That file is larger than 2 MB. Try a smaller file.", "error");
      event.target.value = "";
      return;
    }

    setUploading(true);
    const form = new FormData();
    form.append("file", file);

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        body: form,
      });
      const body = (await response.json().catch(() => null)) as {
        id?: string;
        error?: string;
      } | null;

      if (!response.ok || !body?.id) {
        throw new Error(body?.error ?? "Could not import that file.");
      }

      router.push(`/docs/${body.id}`);
    } catch (cause) {
      show(
        cause instanceof Error ? cause.message : "Could not import that file.",
        "error",
      );
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="mt-6 w-full">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-stretch">
        <button
          type="button"
          onClick={createDocument}
          disabled={creating || uploading}
          className="ui-btn ui-btn-primary ui-btn-lg w-full gap-2 sm:w-auto sm:px-7"
        >
          <PlusIcon className="h-4 w-4" />
          {creating ? "Creating…" : "New document"}
        </button>

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={creating || uploading}
          className="drop-zone flex w-full min-w-0 items-center gap-3 px-4 py-2.5 text-left sm:flex-1 sm:max-w-sm"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-accent shadow-sm ring-1 ring-accent-line">
            <UploadIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-ink">
              {uploading ? "Importing…" : "Import a file"}
            </span>
            <span className="mt-0.5 block truncate text-[11.5px] text-muted">
              {IMPORT_HINT}
            </span>
          </span>
        </button>

        <input
          ref={fileInput}
          type="file"
          accept={IMPORT_ACCEPT}
          onChange={uploadFile}
          className="sr-only"
          aria-label="Upload a document to import"
        />
      </div>
    </div>
  );
}
