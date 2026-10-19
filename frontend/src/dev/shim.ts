/**
 * DEV-ONLY stand-in for the backend additions in api-contract.md (scan
 * workflow: /staff, /dashboard/stats, /activity, PATCH /scans/{id} and the
 * extra scan fields). Everything else goes to the real backend untouched; the
 * extra scan data is kept in localStorage and merged into real responses.
 *
 * Enabled only by `npm run dev` with VITE_API_SHIM=1 (see main.tsx). It is
 * removed from production builds. Delete this folder once the backend
 * implements the contract.
 */
import axios, { type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import { api } from "../lib/api";

const META_KEY = "shim:scan-meta";
const EVENTS_KEY = "shim:events";

// Placeholder operating points: the real values must come from each model's
// validation results and be signed off clinically (see api-contract.md).
const FLAG_THRESHOLDS: Record<string, number> = { Pneumonia: 0.7 };
const FLAG_DEFAULT = 0.8;

const STAFF = [
  { id: "shim-rad-1", full_name: "Dr. S. Chen", role: "radiologist" },
  { id: "shim-rad-2", full_name: "Dr. A. Patel", role: "radiologist" },
  { id: "shim-clin-1", full_name: "Dr. M. Johnson", role: "clinician" },
];

interface Person {
  id: string;
  full_name: string;
}
interface Meta {
  priority: "routine" | "urgent";
  projection: string | null;
  exam_date: string | null;
  clinical_notes: string | null;
  uploaded_by: Person | null;
  assigned_to: Person | null;
  review_status: "pending" | "reviewed";
  reviewed_at: string | null;
  reviewed_by: Person | null;
}
interface Evt {
  id: string;
  type: string;
  message: string;
  actor: Person | null;
  scan_id: string | null;
  created_at: string;
}
type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable: the shim just forgets */
  }
}

const defaultMeta = (): Meta => ({
  priority: "routine",
  projection: null,
  exam_date: null,
  clinical_notes: null,
  uploaded_by: null,
  assigned_to: null,
  review_status: "pending",
  reviewed_at: null,
  reviewed_by: null,
});

function isFlagged(scan: Json): boolean {
  return (scan.findings ?? []).some(
    (f: Json) =>
      !f.experimental && f.score >= (FLAG_THRESHOLDS[f.condition] ?? FLAG_DEFAULT),
  );
}

function augment(scan: Json): Json {
  const meta = { ...defaultMeta(), ...read<Record<string, Meta>>(META_KEY, {})[scan.id] };
  return { ...scan, ...meta, is_flagged: isFlagged(scan) };
}

function addEvent(type: string, message: string, actor: Person | null, scanId: string | null) {
  const events = read<Evt[]>(EVENTS_KEY, []);
  events.unshift({
    id: `shim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    message,
    actor,
    scan_id: scanId,
    created_at: new Date().toISOString(),
  });
  write(EVENTS_KEY, events.slice(0, 50));
}

export function installShim() {
  const real: AxiosAdapter = axios.getAdapter(api.defaults.adapter);

  const respond = (config: InternalAxiosRequestConfig, data: unknown, status = 200) => ({
    data,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: {},
    config,
  });
  // Adapters (not axios core) are responsible for rejecting non-2xx responses.
  const notFound = (config: InternalAxiosRequestConfig) => {
    const response = respond(config, { detail: "Scan not found" }, 404);
    return Promise.reject(
      new axios.AxiosError("Not Found", "ERR_BAD_REQUEST", config, null, response),
    );
  };

  const realJson = async (config: InternalAxiosRequestConfig, url: string, params?: object) => {
    const r = await real({ ...config, url, method: "get", params, data: undefined });
    return typeof r.data === "string" ? JSON.parse(r.data) : r.data;
  };

  let me: Person | null = null;
  const whoAmI = async (config: InternalAxiosRequestConfig): Promise<Person | null> => {
    if (me) return me;
    try {
      const u = await realJson(config, "/auth/me");
      me = { id: u.id, full_name: u.full_name };
    } catch {
      me = null;
    }
    return me;
  };

  const allScans = async (config: InternalAxiosRequestConfig): Promise<Json[]> =>
    (await realJson(config, "/scans", { limit: 200 })).map(augment);

  api.defaults.adapter = async (config) => {
    const method = (config.method ?? "get").toLowerCase();
    const url = (config.url ?? "").split("?")[0];

    if (method === "get" && url === "/staff") {
      const role = config.params?.role;
      return respond(config, role ? STAFF.filter((s) => s.role === role) : STAFF);
    }

    if (method === "get" && url === "/dashboard/stats") {
      const scans = await allScans(config);
      const pending = scans.filter((s) => s.review_status === "pending");
      const today = new Date().toDateString();
      return respond(config, {
        total_scans: scans.length,
        pending_review: pending.length,
        urgent: pending.filter((s) => s.priority === "urgent").length,
        flagged: pending.filter((s) => s.is_flagged).length,
        reviewed_today: scans.filter(
          (s) => s.reviewed_at && new Date(s.reviewed_at).toDateString() === today,
        ).length,
      });
    }

    if (method === "get" && url === "/activity") {
      const limit = Number(config.params?.limit ?? 20);
      return respond(config, read<Evt[]>(EVENTS_KEY, []).slice(0, limit));
    }

    const one = url.match(/^\/scans\/([^/]+)$/);
    if (method === "patch" && one) {
      const id = one[1];
      const body = typeof config.data === "string" ? JSON.parse(config.data) : (config.data ?? {});
      let scan: Json;
      try {
        scan = await realJson(config, `/scans/${id}`);
      } catch {
        return notFound(config);
      }
      const store = read<Record<string, Meta>>(META_KEY, {});
      const meta: Meta = { ...defaultMeta(), ...store[id] };
      const actor = await whoAmI(config);

      if (body.priority) meta.priority = body.priority;
      if ("assigned_to_id" in body) {
        const person = STAFF.find((s) => s.id === body.assigned_to_id);
        meta.assigned_to = person ? { id: person.id, full_name: person.full_name } : null;
        if (person) addEvent("scan_assigned", `Scan assigned to ${person.full_name}`, actor, id);
      }
      if (body.review_status) {
        meta.review_status = body.review_status;
        if (body.review_status === "reviewed") {
          meta.reviewed_at = new Date().toISOString();
          meta.reviewed_by = actor;
          addEvent("scan_reviewed", "Scan marked as reviewed", actor, id);
        } else {
          meta.reviewed_at = null;
          meta.reviewed_by = null;
        }
      }
      store[id] = meta;
      write(META_KEY, store);
      return respond(config, augment(scan));
    }

    if (method === "post" && url === "/predict") {
      const fd = config.data as FormData;
      const res = await real(config);
      const body = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      if (body?.scan_id) {
        const actor = await whoAmI(config);
        const assignedId = fd.get("assigned_to_id");
        const person = STAFF.find((s) => s.id === assignedId);
        const store = read<Record<string, Meta>>(META_KEY, {});
        store[body.scan_id] = {
          ...defaultMeta(),
          priority: fd.get("priority") === "urgent" ? "urgent" : "routine",
          projection: (fd.get("projection") as string) || null,
          exam_date: (fd.get("exam_date") as string) || null,
          clinical_notes: (fd.get("clinical_notes") as string) || null,
          uploaded_by: actor,
          assigned_to: person ? { id: person.id, full_name: person.full_name } : null,
        };
        write(META_KEY, store);
        addEvent("scan_uploaded", "Scan uploaded", actor, body.scan_id);
        if (person) addEvent("scan_assigned", `Scan assigned to ${person.full_name}`, actor, body.scan_id);
      }
      return res;
    }

    const res = await real(config);
    if (method === "get" && (url === "/scans" || one)) {
      const body = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      return { ...res, data: Array.isArray(body) ? body.map(augment) : augment(body) };
    }
    return res;
  };

  if (typeof document !== "undefined") {
    const chip = document.createElement("div");
    chip.textContent = "DEV API SHIM";
    chip.title = "Scan workflow endpoints are faked in this browser. Clear with __shimReset().";
    chip.style.cssText =
      "position:fixed;left:8px;bottom:8px;z-index:9999;padding:2px 8px;border-radius:6px;font:700 10px system-ui;letter-spacing:.06em;background:#f59e0b;color:#000;opacity:.85;pointer-events:none";
    document.body.appendChild(chip);
  }
  (globalThis as Json).__shimReset = () => {
    localStorage.removeItem(META_KEY);
    localStorage.removeItem(EVENTS_KEY);
  };
}
