/**
 * The one cookie this app sets. Kept in its own module (no Node or Prisma
 * imports) because the edge proxy needs the name too.
 */
export const SESSION_COOKIE = "ajaia_session";
