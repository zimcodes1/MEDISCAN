/** Dev-only API stand-in (see src/dev/shim.ts). Never active in a production build. */
export const API_SHIM =
  import.meta.env.DEV && import.meta.env.VITE_API_SHIM === "1";

/**
 * True when the backend implements the scan-workflow part of api-contract.md
 * (scan priority / assignment / review fields, /staff, /dashboard/stats,
 * /activity). Set VITE_SCAN_WORKFLOW=1 in .env.local once it does.
 */
export const SCAN_WORKFLOW =
  API_SHIM || import.meta.env.VITE_SCAN_WORKFLOW === "1";

/**
 * True when the backend implements reports (api-contract.md section 7).
 * Set VITE_REPORTS=1 in .env.local once it does.
 */
export const REPORTS = API_SHIM || import.meta.env.VITE_REPORTS === "1";

/**
 * Restores the ORIGINAL signup flow: signup -> "Verify Your Email" -> onboarding.
 * That flow is a prototype. No verification email is sent, the "Email Verified
 * (Demo)" button is a stand-in, and the onboarding page does not save anything.
 * Off by default so real sign-ups see the honest /pending-approval page.
 * Turn it on (VITE_DEMO_SIGNUP_FLOW=1) only for demos, never for real users.
 */
export const DEMO_SIGNUP_FLOW = import.meta.env.VITE_DEMO_SIGNUP_FLOW === "1";

/** Where the signup form sends the user after a successful registration. */
export const AFTER_SIGNUP_PATH = DEMO_SIGNUP_FLOW
  ? "/verify-email"
  : "/pending-approval";
