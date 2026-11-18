import { z } from "zod";

export const TITLE_MAX_LENGTH = 200;
export const MAX_CONTENT_LENGTH = 1_000_000; // ~1 MB of HTML

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title can't be empty.")
  .max(
    TITLE_MAX_LENGTH,
    `Title must be ${TITLE_MAX_LENGTH} characters or fewer.`,
  );

export const contentSchema = z
  .string()
  .max(MAX_CONTENT_LENGTH, "Document is too large to save (1 MB limit).");

export const updateDocumentSchema = z
  .object({
    title: titleSchema.optional(),
    content: contentSchema.optional(),
  })
  .refine(
    (value) => value.title !== undefined || value.content !== undefined,
    { message: "Nothing to update." },
  );

export const shareRequestSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  role: z.enum(["EDITOR", "VIEWER"]),
});

export const revokeShareSchema = z.object({
  userId: z.string().min(1),
});

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(254, "That email address is too long.")
  .email("Enter a valid email address.");

/**
 * Passwords are only bounded here; the policy lives in `password.ts` so the
 * client checklist and the server check cannot drift apart.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(200),
});

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(80, "Name must be 80 characters or fewer."),
  email: emailSchema,
  password: z.string().min(1, "Choose a password.").max(200),
});
