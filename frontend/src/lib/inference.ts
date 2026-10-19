import { api } from "./api";
import type { Priority, Projection } from "./scans";

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

export interface ScanMetadata {
  priority?: Priority;
  projection?: Projection;
  examDate?: string; // YYYY-MM-DD
  clinicalNotes?: string;
  assignedToId?: string;
}

export async function predict(
  file: File,
  patientId?: string,
  meta?: ScanMetadata,
): Promise<PredictResult> {
  const fd = new FormData();
  fd.append("file", file);
  if (patientId) fd.append("patient_id", patientId);
  if (meta?.priority) fd.append("priority", meta.priority);
  if (meta?.projection) fd.append("projection", meta.projection);
  if (meta?.examDate) fd.append("exam_date", meta.examDate);
  if (meta?.clinicalNotes) fd.append("clinical_notes", meta.clinicalNotes);
  if (meta?.assignedToId) fd.append("assigned_to_id", meta.assignedToId);
  const { data } = await api.post<PredictResult>("/predict", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
