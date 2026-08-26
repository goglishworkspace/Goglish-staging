import "server-only";
import { evaluateBadgesForUser } from "./badge.service";

/** Single call site for "did this event unlock a badge" - called after every
 * study-activity write path (lesson progress, quiz submit, exam submit/leave). */
export async function runGamificationHooks(userId: string): Promise<void> {
  await evaluateBadgesForUser(userId);
}
