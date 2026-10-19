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
