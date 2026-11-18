import { describe, expect, it } from "vitest";

import {
  convertFileToHtml,
  getExtension,
  hasZipSignature,
  isSupportedExtension,
  markdownToHtml,
  plainTextToHtml,
  titleFromFilename,
} from "./import";
import { sanitizeDocumentHtml } from "./sanitize";

describe("plainTextToHtml", () => {
  it("wraps blank-line separated blocks in paragraphs", () => {
    expect(plainTextToHtml("Hello\n\nWorld")).toBe(
      "<p>Hello</p><p>World</p>",
    );
  });

  it("keeps single newlines as line breaks", () => {
    expect(plainTextToHtml("line one\nline two")).toBe(
      "<p>line one<br />line two</p>",
    );
  });

  it("escapes HTML in uploaded text instead of executing it", () => {
    const html = plainTextToHtml('<script>alert("xss")</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("normalizes CRLF and strips a BOM", () => {
    expect(plainTextToHtml("\uFEFFa\r\nb")).toBe("<p>a<br />b</p>");
  });

  it("returns an empty string for blank input", () => {
    expect(plainTextToHtml("   \n\n  ")).toBe("");
  });
});

describe("markdownToHtml", () => {
  it("converts headings and lists", async () => {
    const html = await markdownToHtml("# Title\n\n- one\n- two");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<li>two</li>");
  });

  it("strips scripts embedded in markdown", async () => {
    const html = await markdownToHtml("Hello\n\n<script>alert(1)</script>");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(1)");
  });

  it("drops javascript: links", async () => {
    const html = await markdownToHtml("[click me](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });
});

describe("sanitizeDocumentHtml", () => {
  it("removes script payloads but keeps allowed formatting", () => {
    const html = sanitizeDocumentHtml(
      '<p>Keep <strong>this</strong></p><script>alert("xss")</script>',
    );
    expect(html).toBe("<p>Keep <strong>this</strong></p>");
  });

  it("removes event handler attributes", () => {
    const html = sanitizeDocumentHtml('<p onclick="alert(1)">hi</p>');
    expect(html).toBe("<p>hi</p>");
  });

  it("hardens external links", () => {
    const html = sanitizeDocumentHtml('<a href="https://example.com">site</a>');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain('target="_blank"');
  });
});

describe("file helpers", () => {
  it("reads lowercase extensions", () => {
    expect(getExtension("Notes.MD")).toBe(".md");
    expect(getExtension("no-extension")).toBe("");
  });

  it("allows only the documented import types", () => {
    expect(isSupportedExtension(".txt")).toBe(true);
    expect(isSupportedExtension(".md")).toBe(true);
    expect(isSupportedExtension(".docx")).toBe(true);
    expect(isSupportedExtension(".pdf")).toBe(false);
    expect(isSupportedExtension(".exe")).toBe(false);
  });

  it("derives a document title from the filename", () => {
    expect(titleFromFilename("Team Notes.md")).toBe("Team Notes");
    expect(titleFromFilename("C:\\Users\\me\\report.docx")).toBe("report");
    expect(titleFromFilename(".hidden")).toBe(".hidden");
    expect(titleFromFilename("   ")).toBe("Imported document");
  });

  it("rejects unsupported files before parsing", async () => {
    await expect(
      convertFileToHtml("malware.exe", Buffer.from("MZ")),
    ).rejects.toThrow(/Unsupported file type/);
  });

  it("recognizes the ZIP signatures a .docx must start with", () => {
    expect(hasZipSignature(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe(true);
    expect(hasZipSignature(Buffer.from("PK\u0005\u0006"))).toBe(true);
    expect(hasZipSignature(Buffer.from("MZ\u0090\u0000"))).toBe(false);
    expect(hasZipSignature(Buffer.from("PK"))).toBe(false);
    expect(hasZipSignature(Buffer.alloc(0))).toBe(false);
  });

  it("rejects a renamed non-ZIP file with a .docx extension", async () => {
    await expect(
      convertFileToHtml("renamed.docx", Buffer.from("MZ\u0090\u0000not a zip")),
    ).rejects.toThrow(/ZIP/);
  });

  it("converts an uploaded .txt file to safe HTML", async () => {
    const html = await convertFileToHtml(
      "groceries.txt",
      Buffer.from("Milk\n\n<b>Bread</b>"),
    );
    expect(html).toBe("<p>Milk</p><p>&lt;b&gt;Bread&lt;/b&gt;</p>");
  });
});
