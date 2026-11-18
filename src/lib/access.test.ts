import { describe, expect, it } from "vitest";

import {
  canEdit,
  canExport,
  canManageSharing,
  resolveAccess,
} from "./access";

const OWNER = "user-owner";
const EDITOR = "user-editor";
const VIEWER = "user-viewer";
const STRANGER = "user-stranger";

const shares = [
  { userId: EDITOR, role: "EDITOR" as const },
  { userId: VIEWER, role: "VIEWER" as const },
];

describe("resolveAccess", () => {
  it("gives the owner full access", () => {
    expect(resolveAccess(OWNER, shares, OWNER)).toBe("OWNER");
  });

  it("lets the owner keep ownership even if a share row exists", () => {
    expect(
      resolveAccess(OWNER, [...shares, { userId: OWNER, role: "VIEWER" as const }], OWNER),
    ).toBe("OWNER");
  });

  it("resolves an editor share", () => {
    expect(resolveAccess(OWNER, shares, EDITOR)).toBe("EDITOR");
  });

  it("resolves a viewer share", () => {
    expect(resolveAccess(OWNER, shares, VIEWER)).toBe("VIEWER");
  });

  it("returns null for someone with no share", () => {
    expect(resolveAccess(OWNER, shares, STRANGER)).toBeNull();
  });

  it("returns null when there are no shares at all", () => {
    expect(resolveAccess(OWNER, [], STRANGER)).toBeNull();
  });
});

describe("canEdit", () => {
  it("allows owners and editors", () => {
    expect(canEdit("OWNER")).toBe(true);
    expect(canEdit("EDITOR")).toBe(true);
  });

  it("rejects viewers, strangers and missing access", () => {
    expect(canEdit("VIEWER")).toBe(false);
    expect(canEdit(null)).toBe(false);
  });
});

describe("canManageSharing", () => {
  it("is owner-only", () => {
    expect(canManageSharing("OWNER")).toBe(true);
    expect(canManageSharing("EDITOR")).toBe(false);
    expect(canManageSharing("VIEWER")).toBe(false);
  });
});

describe("canExport", () => {
  it("allows every role that can already read the document", () => {
    expect(canExport("OWNER")).toBe(true);
    expect(canExport("EDITOR")).toBe(true);
    expect(canExport("VIEWER")).toBe(true);
  });

  it("rejects strangers with no access", () => {
    expect(canExport(null)).toBe(false);
  });
});
