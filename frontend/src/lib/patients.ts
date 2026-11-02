import { api } from "./api";

export interface PatientRecord {
  id: string;
  patient_code: string;
  sex: string | null;
  year_of_birth: number | null;
  created_at: string;
}

export interface PatientCreateInput {
  sex?: "female" | "male" | "other" | "unknown" | null;
  year_of_birth?: number | null;
}

export async function listPatients(params?: {
  limit?: number;
  offset?: number;
}) {
  const { data } = await api.get<PatientRecord[]>("/patients", {
    params: {
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
    },
  });

  return data;
}

export async function getPatient(patientId: string) {
  const { data } = await api.get<PatientRecord>(`/patients/${patientId}`);
  return data;
}

export async function createPatient(payload: PatientCreateInput) {
  const { data } = await api.post<PatientRecord>("/patients", payload);
  return data;
}
