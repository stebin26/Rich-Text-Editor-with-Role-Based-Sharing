"use client";

import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { canEdit as canEditAccess } from "@/lib/access";
import { countWords, formatLastEdited } from "@/lib/format";
import type { AccessLevel, OwnerView, ShareView } from "@/lib/types";
import ExportMenu from "./ExportMenu";
import {
  AlertIcon,
  ArrowLeftIcon,
  CheckIcon,
  LockIcon,
} from "./icons";
import ShareDialog from "./ShareDialog";
import { useToast } from "./ToastProvider";

type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

type DocumentEditorProps = {
  documentId: string;
  initialTitle: string;
  initialContent: string;
  initialUpdatedAt: string;
  access: AccessLevel;
  owner: OwnerView;
  initialShares: ShareView[];
};

const accessBadgeStyles: Record<AccessLevel, string> = {
  OWNER: "pill-dark",
  EDITOR: "pill-dark pill-brand",
  VIEWER: "pill-dark pill-warn",
};

const accessLabels: Record<AccessLevel, string> = {
  OWNER: "Owner",
  EDITOR: "Editor",
  VIEWER: "Viewer",
};

function SaveIndicator({
  status,
  savedAt,
  onRetry,
}: {
  status: SaveStatus;
  savedAt: string | null;
  onRetry: () => void;
}) {
  if (status === "saving") {
    return (
      <span className="pill-dark">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
        Saving…
      </span>
    );
  }

  if (status === "saved") {
    return (
      <span className="pill-dark pill-saved">
        <CheckIcon className="h-3.5 w-3.5" />
        {savedAt ? `Saved ${savedAt}` : "Saved"}
      </span>
    );
  }

  if (status === "unsaved") {
    return (
      <span className="pill-dark">
        <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
        Unsaved changes
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="pill-dark pill-error">
        <AlertIcon className="h-3.5 w-3.5" />
        Couldn&apos;t save
        <button
          type="button"
          onClick={onRetry}
          className="rounded underline underline-offset-2 transition hover:text-white"
        >
          Retry
        </button>
      </span>
    );
  }

  return null;
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      underline: editor?.isActive("underline") ?? false,
      h1: editor?.isActive("heading", { level: 1 }) ?? false,
      h2: editor?.isActive("heading", { level: 2 }) ?? false,
      bulletList: editor?.isActive("bulletList") ?? false,
      orderedList: editor?.isActive("orderedList") ?? false,
    }),
  });

  const base = "tool-btn disabled:cursor-not-allowed disabled:opacity-40";
  const idle = "";
  const active = "tool-btn-active";

  const buttonClass = (isActive: boolean) =>
    `${base} ${isActive ? active : idle}`;

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="no-print border-t border-white/10 px-2.5 py-2.5 sm:px-3.5"
    >
      <div className="tool-pill w-full sm:w-auto">
        <button
          type="button"
          aria-label="Bold"
          aria-pressed={state?.bold ?? false}
          title="Bold (Ctrl/Cmd+B)"
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`${buttonClass(state?.bold ?? false)} font-bold`}
        >
          B
        </button>
        <button
          type="button"
          aria-label="Italic"
          aria-pressed={state?.italic ?? false}
          title="Italic (Ctrl/Cmd+I)"
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`${buttonClass(state?.italic ?? false)} italic`}
        >
          I
        </button>
        <button
          type="button"
          aria-label="Underline"
          aria-pressed={state?.underline ?? false}
          title="Underline (Ctrl/Cmd+U)"
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className={`${buttonClass(state?.underline ?? false)} underline`}
        >
          U
        </button>

        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />

        <button
          type="button"
          aria-label="Heading 1"
          aria-pressed={state?.h1 ?? false}
          title="Heading 1"
          disabled={!editor}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={`${buttonClass(state?.h1 ?? false)} tracking-tight`}
        >
          H1
        </button>
        <button
          type="button"
          aria-label="Heading 2"
          aria-pressed={state?.h2 ?? false}
          title="Heading 2"
          disabled={!editor}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={`${buttonClass(state?.h2 ?? false)} tracking-tight`}
        >
          H2
        </button>

        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />

        <button
          type="button"
          aria-label="Bullet list"
          aria-pressed={state?.bulletList ?? false}
          title="Bullet list"
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`${buttonClass(state?.bulletList ?? false)} gap-1`}
        >
          • List
        </button>
        <button
          type="button"
          aria-label="Numbered list"
          aria-pressed={state?.orderedList ?? false}
          title="Numbered list"
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={`${buttonClass(state?.orderedList ?? false)} gap-1`}
        >
          1. List
        </button>
      </div>
    </div>
  );
}

export default function DocumentEditor({
  documentId,
  initialTitle,
  initialContent,
  initialUpdatedAt,
  access,
  owner,
  initialShares,
}: DocumentEditorProps) {
  const editable = canEditAccess(access);
  const isOwner = access === "OWNER";
  const { show } = useToast();

  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [lastEdited, setLastEdited] = useState(initialUpdatedAt);
  const [wordCount, setWordCount] = useState(0);

  const serverTitleRef = useRef(initialTitle);
  const pendingRef = useRef<{ title?: string; content?: string }>({});
  const savingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async () => {
    if (!editable || savingRef.current) return;

    savingRef.current = true;
    let savedAny = false;
    let failed = false;

    try {
      // Drain the queue so edits made mid-request are saved immediately after.
      while (true) {
        const patch = pendingRef.current;
        if (patch.title === undefined && patch.content === undefined) break;

        pendingRef.current = {};
        setStatus("saving");

        try {
          const response = await fetch(`/api/documents/${documentId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(patch),
          });
          const body = (await response.json().catch(() => null)) as {
            document?: { title: string; updatedAt: string };
            error?: string;
          } | null;

          if (!response.ok) {
            throw new Error(body?.error ?? "Could not save changes.");
          }

          if (body?.document?.title) {
            serverTitleRef.current = body.document.title;
          }
          if (body?.document?.updatedAt) {
            setLastEdited(body.document.updatedAt);
          }

          setSavedAt(
            new Intl.DateTimeFormat("en-US", {
              hour: "numeric",
              minute: "2-digit",
            }).format(new Date()),
          );
          savedAny = true;
        } catch {
          // Keep the failed payload so Retry resends it without losing newer edits.
          pendingRef.current = {
            title: pendingRef.current.title ?? patch.title,
            content: pendingRef.current.content ?? patch.content,
          };
          failed = true;
          break;
        }
      }
    } finally {
      savingRef.current = false;
    }

    if (failed) {
      setStatus("error");
      show("Couldn't save. Your changes are kept — press Retry.", "error");
    } else if (savedAny) {
      setStatus("saved");
    }
  }, [documentId, editable, show]);

  const queueContent = useCallback(
    (html: string) => {
      if (!editable) return;
      pendingRef.current.content = html;
      setStatus("unsaved");

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void save();
      }, 800);
    },
    [editable, save],
  );

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent || "<p></p>",
    editable,
    // Required for server rendering: the editor mounts on the client only.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "doc-content",
        "aria-label": "Document content",
        "aria-multiline": "true",
      },
    },
    onCreate: ({ editor: instance }) =>
      setWordCount(countWords(instance.getText())),
    onUpdate: ({ editor: instance }) => {
      setWordCount(countWords(instance.getText()));
      queueContent(instance.getHTML());
    },
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Document title in the browser tab, updated as the title changes.
  useEffect(() => {
    document.title = title.trim() ? `${title.trim()} · Ajaia Docs` : "Ajaia Docs";
  }, [title]);

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (status === "unsaved" || status === "saving") {
        event.preventDefault();
        event.returnValue = "";
      }
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [status]);

  // Best-effort flush of the pending patch when the tab is hidden or closed.
  // `keepalive` lets the request outlive the page.
  useEffect(() => {
    function flush() {
      if (!editable) return;
      const patch = pendingRef.current;
      if (patch.title === undefined && patch.content === undefined) return;

      pendingRef.current = {};
      try {
        void fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
          keepalive: true,
        });
      } catch {
        // Nothing actionable during unload.
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") flush();
    }

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [documentId, editable]);

  function commitTitle() {
    if (!editable) return;

    const next = title.trim();
    if (!next) {
      setTitle(serverTitleRef.current);
      return;
    }

    if (next === serverTitleRef.current) {
      setTitle(next);
      return;
    }

    pendingRef.current.title = next;
    setTitle(next);
    setStatus("unsaved");

    if (timerRef.current) clearTimeout(timerRef.current);
    void save();
  }

  return (
    <>
      <div className="no-print sticky top-14 z-20 bg-canvas/90 px-3 pb-2.5 pt-3 backdrop-blur-md sm:px-6">
        <div className="editor-bar mx-auto w-full max-w-5xl">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 px-2.5 py-2.5 sm:px-3.5">
            <Link
              href="/"
              className="ui-btn ui-btn-onDark ui-btn-sm gap-1.5"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Documents
            </Link>

            <span
              className="hidden h-5 w-px bg-white/15 sm:block"
              aria-hidden="true"
            />

            <span className={accessBadgeStyles[access]}>
              {accessLabels[access]}
            </span>

            <span className="flex min-w-[7rem] items-center">
              {editable ? (
                <SaveIndicator
                  status={status}
                  savedAt={savedAt}
                  onRetry={() => void save()}
                />
              ) : (
                <span className="pill-dark">
                  <LockIcon className="h-3.5 w-3.5" />
                  View only
                </span>
              )}
            </span>

            <div className="ml-auto flex items-center gap-2">
              <ExportMenu documentId={documentId} />

              {isOwner && owner.email ? (
                <ShareDialog
                  documentId={documentId}
                  documentTitle={title}
                  owner={{ name: owner.name, email: owner.email }}
                  initialShares={initialShares}
                />
              ) : null}
            </div>
          </div>

          {editable ? <EditorToolbar editor={editor} /> : null}
        </div>
      </div>

      <main className="editor-canvas w-full pb-20 pt-6 sm:pt-9">
        <div className="print-canvas mx-auto w-full max-w-3xl px-3 sm:px-6">
        {!editable ? (
          <div className="no-print mb-5 flex items-start gap-3 rounded-2xl border border-warn-line bg-warn-soft px-4 py-3.5 text-[12.5px] leading-relaxed text-warn shadow-sm">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-warn-line bg-white/70">
              <LockIcon className="h-3 w-3" />
            </span>
            <p>
              <span className="font-semibold">View only.</span> {owner.name}{" "}
              shared this document with you as a Viewer, so the editor is
              read-only.
            </p>
          </div>
        ) : null}

        <div className="paper print-surface">
          <div className="px-6 pb-6 pt-10 sm:px-14 sm:pb-7 sm:pt-14">
            <label htmlFor="document-title" className="sr-only">
              Document title
            </label>
            {editable ? (
              <input
                id="document-title"
                value={title}
                maxLength={200}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={commitTitle}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }}
                placeholder="Untitled document"
                className="doc-title-input"
              />
            ) : (
              <h1 className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.04em] text-ink sm:text-[38px]">
                {title}
              </h1>
            )}

            <div
              className="mt-4 h-1 w-12 rounded-full bg-[linear-gradient(90deg,#4f46e5,#7c3aed)]"
              aria-hidden="true"
            />

            <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11.5px] text-muted">
              <span className="rounded-full bg-canvas px-2 py-0.5 font-semibold text-ink-soft">
                {owner.name}
              </span>
              <span className="text-faint" aria-hidden="true">
                ·
              </span>
              <span>{accessLabels[access]}</span>
              <span className="text-faint" aria-hidden="true">
                ·
              </span>
              <span>{wordCount === 1 ? "1 word" : `${wordCount} words`}</span>
              <span className="text-faint" aria-hidden="true">
                ·
              </span>
              <span>{formatLastEdited(lastEdited)}</span>
            </div>
            <p className="no-print mt-2 text-[11.5px] text-muted">
              {editable ? "Autosaves as you type" : "Read only"}
            </p>
          </div>

          <div className="px-6 pb-14 pt-2 sm:px-14 sm:pb-20">
            <EditorContent editor={editor} />
          </div>
        </div>
        </div>
      </main>
    </>
  );
}
