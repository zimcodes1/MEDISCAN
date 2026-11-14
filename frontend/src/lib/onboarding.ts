import type { CurrentUser } from "../types/api";

/**
 * The setup runs once, for the admin who registered the organisation. The backend
 * decides (`onboarding_pending` on /auth/me), so admins invited later never see it,
 * and it follows the person across browsers. Finishing or skipping it calls
 * completeOnboarding() in lib/auth.ts.
 */
export function needsOnboarding(user: CurrentUser): boolean {
  return user.role === "admin" && user.onboarding_pending === true;
}
