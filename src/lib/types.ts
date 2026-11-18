export type ShareRole = "EDITOR" | "VIEWER";

export type AccessLevel = "OWNER" | "EDITOR" | "VIEWER";

export type ShareView = {
  userId: string;
  name: string;
  email: string;
  role: ShareRole;
};

export type OwnerView = {
  id: string;
  name: string;
  /** Only present for the owner's own view; never sent to editors/viewers. */
  email?: string;
};

export type ApiErrorBody = {
  error: string;
};
