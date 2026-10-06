import { api } from "./api";

export interface StoredFinding {
  id: string;
  condition: string;
  score: number;
  confidence_pct: number;
  has_heatmap: boolean;
  model_name: string;
  model_version: string;
  experimental: boolean;
}

export interface ScanRecord {
  id: string;
  patient_id: string;
  status: "pending" | "completed" | "failed";
  content_type: string;
  size_bytes: number;
  created_at: string;
  findings: StoredFinding[];
  disclaimer: string;
}

export async function listScans(
  patientId: string,
  params?: { limit?: number; offset?: number },
) {
  const { data } = await api.get<ScanRecord[]>("/scans", {
    params: {
      patient_id: patientId,
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
    },
  });

  return data;
}

export async function getScan(scanId: string) {
  const { data } = await api.get<ScanRecord>(`/scans/${scanId}`);
  return data;
}

export async function getScanImage(scanId: string) {
  const { data } = await api.get(`/scans/${scanId}/image`, {
    responseType: "blob",
  });
  return data;
}

export async function getHeatmap(scanId: string, findingId: string) {
  const { data } = await api.get(
    `/scans/${scanId}/findings/${findingId}/heatmap`,
    {
      responseType: "blob",
    },
  );
  return data;
}

export async function uploadPrediction(file: File, patientId?: string) {
  const formData = new FormData();
  formData.append("file", file);

  if (patientId) {
    formData.append("patient_id", patientId);
  }

  const { data } = await api.post("/predict", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
}
