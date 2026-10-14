import { api } from "./api";

export interface PatientRecord {
  id: string;
  patient_code: string;
  sex: string | null;
  year_of_birth: number | null;
  created_at: string;
}

/** Age in years from year of birth, or null if unknown. */
export function patientAge(yearOfBirth: number | null): number | null {
  return yearOfBirth ? new Date().getFullYear() - yearOfBirth : null;
}

/** e.g. "F · 34y" — falls back to "—" for missing values. */
export function patientSummary(p: PatientRecord): string {
  const age = patientAge(p.year_of_birth);
  return `${p.sex ?? "—"} · ${age !== null ? `${age}y` : "—"}`;
}

export async function listPatients(params: {
  limit?: number;
  offset?: number;
}): Promise<PatientRecord[]> {
  const { data } = await api.get<PatientRecord[]>("/patients", { params });
  return data;
}

export async function getPatient(patientId: string): Promise<PatientRecord> {
  const { data } = await api.get<PatientRecord>(`/patients/${patientId}`);
  return data;
}

export async function createPatient(payload: {
  sex?: string;
  year_of_birth?: number;
}): Promise<PatientRecord> {
  const { data } = await api.post<PatientRecord>("/patients", payload);
  return data;
}
