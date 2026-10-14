import { api } from "./api";

export interface FindingRecord {
  id: string;
  condition: string;
  score: number;
  confidence_pct: number;
  heatmap_base64: string | null;
  model_name: string;
  model_version: string;
  experimental: boolean;
}

export interface ScanRecord {
  id: string;
  patient_id: string;
  status: string;
  created_at: string;
  findings?: FindingRecord[];
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
