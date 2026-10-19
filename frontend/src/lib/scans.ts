import { api } from "./api";
import { getPatient } from "./patients";

export interface FindingRecord {
  id: string;
  condition: string;
  score: number;
  confidence_pct: number;
  /** Fetch the image with getHeatmapUrl(scanId, findingId). */
  has_heatmap: boolean;
  model_name: string;
  model_version: string;
  experimental: boolean;
}

export type Priority = "routine" | "urgent";
export type Projection = "pa" | "ap" | "lateral";
export type ReviewStatus = "pending" | "reviewed";
export interface PersonRef {
  id: string;
  full_name: string;
}

export interface ScanRecord {
  id: string;
  patient_id: string;
  status: string;
  created_at: string;
  content_type?: string;
  size_bytes?: number;
  // Scan-workflow fields (api-contract.md section 1). Absent until the backend adds them.
  priority?: Priority;
  projection?: Projection | null;
  exam_date?: string | null;
  clinical_notes?: string | null;
  uploaded_by?: PersonRef | null;
  assigned_to?: PersonRef | null;
  review_status?: ReviewStatus;
  reviewed_at?: string | null;
  reviewed_by?: PersonRef | null;
  is_flagged?: boolean;
  findings?: FindingRecord[];
  disclaimer?: string;
}

export interface ScanWithPatient {
  scan: ScanRecord;
  /** null when the patient lookup failed */
  patientCode: string | null;
}

/** Recent scans (newest first) with patient codes, one lookup per unique patient. */
export async function listScansWithPatients(
  params: { limit?: number; offset?: number } = { limit: 20 },
): Promise<ScanWithPatient[]> {
  const scans = await listAllScans(params);
  const ids = [...new Set(scans.map((s) => s.patient_id).filter(Boolean))];
  const lookups = await Promise.allSettled(ids.map((id) => getPatient(id)));
  const codes = new Map<string, string>();
  lookups.forEach((r, i) => {
    if (r.status === "fulfilled") codes.set(ids[i], r.value.patient_code);
  });
  return scans
    .map((scan) => ({ scan, patientCode: codes.get(scan.patient_id) ?? null }))
    .sort(
      (a, b) =>
        new Date(b.scan.created_at).getTime() -
        new Date(a.scan.created_at).getTime(),
    );
}

export async function listScans(
  patientId: string,
  params: { limit?: number; offset?: number },
): Promise<ScanRecord[]> {
  const { data } = await api.get<ScanRecord[]>("/scans", {
    params: { patient_id: patientId, ...params },
  });
  return data;
}

export async function listAllScans(
  params: { limit?: number; offset?: number } = {},
): Promise<ScanRecord[]> {
  const { data } = await api.get<ScanRecord[]>("/scans", { params });
  return data;
}

export async function getScan(scanId: string): Promise<ScanRecord> {
  const { data } = await api.get<ScanRecord>(`/scans/${scanId}`);
  return data;
}

export async function getScanImageUrl(scanId: string): Promise<string> {
  const { data } = await api.get(`/scans/${scanId}/image`, {
    responseType: "blob",
  });
  return URL.createObjectURL(data);
}

export async function getHeatmapUrl(
  scanId: string,
  findingId: string,
): Promise<string> {
  const { data } = await api.get(
    `/scans/${scanId}/findings/${findingId}/heatmap`,
    { responseType: "blob" },
  );
  return URL.createObjectURL(data);
}

/** api-contract.md section 3. Any user in the organisation may mark a scan reviewed. */
export async function updateScan(
  scanId: string,
  patch: {
    priority?: Priority;
    assigned_to_id?: string | null;
    review_status?: ReviewStatus;
  },
): Promise<ScanRecord> {
  const { data } = await api.patch<ScanRecord>(`/scans/${scanId}`, patch);
  return data;
}
