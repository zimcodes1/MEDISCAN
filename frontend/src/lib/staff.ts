import { api } from "./api";

export type StaffRole = "admin" | "clinician" | "radiologist";

export interface StaffMember {
  id: string;
  full_name: string;
  role: StaffRole;
}

/** Approved, active users in your organisation (api-contract.md section 4). */
export async function listStaff(role?: StaffRole): Promise<StaffMember[]> {
  const { data } = await api.get<StaffMember[]>("/staff", {
    params: role ? { role } : undefined,
  });
  return data;
}
