import { api } from "./api";

export interface PredictResult {
  scan_id: string | null;
  saved: boolean;
  inference_backend: string;
  disclaimer: string;
  findings: Array<{
    condition: string;
    score: number;
    confidence_pct: number;
    heatmap_base64?: string | null;
    model_name: string;
    model_version: string;
    experimental: boolean;
  }>;
}

export async function predict(
  file: File,
  patientId?: string,
): Promise<PredictResult> {
  const fd = new FormData();
  fd.append("file", file);
  if (patientId) fd.append("patient_id", patientId);
  const { data } = await api.post<PredictResult>("/predict", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
