import type { CurrentUser } from "../types/api";

const key = (userId: string) => `onboarding_done:${userId}`;

/**
 * The backend has no "onboarded" flag, so a new admin is someone with the admin
 * role, no job title yet, and who hasn't finished or skipped the setup on this
 * browser. Step 1 saves the job title, which ends the prompt for good.
 */
export function needsOnboarding(user: CurrentUser): boolean {
  if (user.role !== "admin" || user.job_title) return false;
  try {
    return localStorage.getItem(key(user.id)) !== "1";
  } catch {
    return true;
  }
}

export function markOnboardingDone(userId: string) {
  try {
    localStorage.setItem(key(userId), "1");
  } catch {
    // private mode: the prompt may show again, which is harmless
  }
}
