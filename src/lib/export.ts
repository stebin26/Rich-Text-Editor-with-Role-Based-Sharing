import TurndownService from "turndown";

/**
 * Markdown export. The stored HTML is already sanitized by the save/import
 * paths, so Turndown output is just a faithful text projection of it.
 */

const turndown = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "_",
  strongDelimiter: "**",
  linkStyle: "inlined",
});

// Turndown drops <u> by default; keep it as inline HTML so underlines survive.
turndown.addRule("underline", {
  filter: ["u"],
  replacement: (content) => (content ? `<u>${content}</u>` : ""),
});

export function htmlToMarkdown(html: string): string {
  const markdown = turndown.turndown(html ?? "").trim();
  return `${markdown}\n`;
}

/**
 * Produces a conservative, ASCII-only attachment name: no quotes, CR/LF or
 * path separators can reach the Content-Disposition header.
 */
export function exportFilename(title: string): string {
  const base = (title ?? "")
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+/, "")
    .replace(/[-.]+$/, "")
    .slice(0, 80);

  return `${base || "document"}.md`;
}
