import { api } from "./api";

export interface PatientRecord {
  id: string;
  patient_code: string;
  sex: string | null;
  year_of_birth: number | null;
  created_at: string;
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
