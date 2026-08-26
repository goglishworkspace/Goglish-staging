import "server-only";

export type CommentFilterResult = { blocked: boolean; reason?: "phone_number" | "email" | "link" | "profanity" };

// 7+ digits (optionally separated by spaces/dashes) covers Egyptian mobile
// and landline numbers without being so short it flags legitimate numeric
// content (grades, dates written as digits, etc.).
const PHONE_REGEX = /(?:\d[\s.-]?){7,}/;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const URL_REGEX = /(https?:\/\/|www\.)[^\s]+/i;

// Starter list only - a reasonable placeholder, not exhaustive. Real
// moderation-settings configurability (Section 16) is a separate future
// phase; this is hardcoded like MAX_PAYMENT_ATTEMPTS/streak rewards elsewhere.
const PROFANITY_WORDS = ["كسمك", "ابن كلب", "خرا", "fuck", "shit", "asshole", "bitch"];

/** Auto-filter run before a comment reaches the moderation queue (Section 11
 * - phone/email/link/profanity get rejected immediately, without a human
 * reviewer). Not a substitute for the manual review that follows for
 * everything else - just the first, cheap pass. */
export function filterCommentContent(content: string): CommentFilterResult {
  if (PHONE_REGEX.test(content)) return { blocked: true, reason: "phone_number" };
  if (EMAIL_REGEX.test(content)) return { blocked: true, reason: "email" };
  if (URL_REGEX.test(content)) return { blocked: true, reason: "link" };

  const lower = content.toLowerCase();
  if (PROFANITY_WORDS.some((word) => lower.includes(word))) return { blocked: true, reason: "profanity" };

  return { blocked: false };
}
