import { describe, expect, it } from "vitest";

import { isSameOrigin } from "./csrf";
import { exportFilename, htmlToMarkdown } from "./export";
import { hashToken } from "./session";

function request(headers: Record<string, string>, url = "http://localhost:3000/api/documents") {
  return new Request(url, { method: "POST", headers });
}

describe("isSameOrigin", () => {
  it("accepts a matching Origin and Host", () => {
    expect(
      isSameOrigin(request({ origin: "http://localhost:3000", host: "localhost:3000" })),
    ).toBe(true);
  });

  it("rejects a foreign Origin", () => {
    expect(
      isSameOrigin(
        request({ origin: "https://evil.example", host: "localhost:3000" }),
      ),
    ).toBe(false);
  });

  it("rejects a missing Origin header", () => {
    expect(isSameOrigin(request({ host: "localhost:3000" }))).toBe(false);
  });

  it("rejects a malformed Origin", () => {
    expect(isSameOrigin(request({ origin: "not-a-url", host: "localhost:3000" }))).toBe(
      false,
    );
  });

  it("uses the first value of a comma-separated X-Forwarded-Host", () => {
    expect(
      isSameOrigin(
        request({
          origin: "https://ajaia-docs.vercel.app",
          "x-forwarded-host": "ajaia-docs.vercel.app, proxy.internal",
        }),
      ),
    ).toBe(true);
  });

  it("rejects a same-host request arriving on a different port", () => {
    expect(
      isSameOrigin(
        request({ origin: "http://localhost:4000", host: "localhost:3000" }),
      ),
    ).toBe(false);
  });
});

describe("hashToken", () => {
  it("is a stable SHA-256 hex digest that does not contain the token", () => {
    const token = "super-secret-token";
    const hash = hashToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashToken(token));
    expect(hash).not.toContain(token);
    expect(hashToken("other")).not.toBe(hash);
  });
});

describe("htmlToMarkdown", () => {
  it("converts headings atx-style and keeps formatting", () => {
    const markdown = htmlToMarkdown(
      "<h1>Title</h1><p>Some <strong>bold</strong> and <em>italic</em> text.</p>",
    );
    expect(markdown).toContain("# Title");
    expect(markdown).toContain("**bold**");
    expect(markdown).toContain("_italic_");
  });

  it("converts lists and keeps underline as inline HTML", () => {
    const markdown = htmlToMarkdown(
      "<ul><li>one</li><li>two</li></ul><p><u>under</u></p>",
    );
    // Turndown pads list markers: "-   one".
    expect(markdown).toMatch(/-\s+one/);
    expect(markdown).toMatch(/-\s+two/);
    expect(markdown).toContain("<u>under</u>");
  });

  it("returns a newline-terminated string for empty content", () => {
    expect(htmlToMarkdown("")).toBe("\n");
  });
});

describe("exportFilename", () => {
  it("slugifies a title and adds the extension", () => {
    expect(exportFilename("My Project Notes")).toBe("My-Project-Notes.md");
  });

  it("cannot break out of the Content-Disposition header", () => {
    const filename = exportFilename('a"b\\c/d\r\nSet-Cookie: x=y');
    expect(filename).not.toMatch(/["\\/\r\n]/);
    expect(filename.endsWith(".md")).toBe(true);
  });

  it("falls back for empty or symbol-only titles", () => {
    expect(exportFilename("")).toBe("document.md");
    expect(exportFilename("✨✨")).toBe("document.md");
  });

  it("is bounded in length", () => {
    expect(exportFilename("a".repeat(500)).length).toBeLessThanOrEqual(83);
  });
});
