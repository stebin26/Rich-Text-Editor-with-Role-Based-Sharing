import sanitizeHtml from "sanitize-html";

/**
 * Allowlist for stored document HTML. Both the editor save path and the file
 * import path pass through here, so the database never holds scripts, event
 * handlers, iframes or javascript: URLs.
 */
export const ALLOWED_TAGS = [
  "p",
  "h1",
  "h2",
  "h3",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "br",
  "a",
  "blockquote",
  "code",
  "pre",
  "hr",
];

export function sanitizeDocumentHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    // Drop the contents of <script>/<style> entirely rather than escaping them.
    nonTextTags: ["style", "script", "textarea", "option", "noscript"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
    },
  });
}
