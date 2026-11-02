import { api } from "./api";

export type OrgType = "hospital" | "diagnostic_centre" | "clinic" | "telemedicine";

export const ORG_TYPES: { value: OrgType; label: string }[] = [
  { value: "hospital", label: "Hospital" },
  { value: "diagnostic_centre", label: "Diagnostic Centre" },
  { value: "clinic", label: "Clinic" },
  { value: "telemedicine", label: "Telemedicine Platform" },
];

export interface Organisation {
  id: string;
  name: string;
  type: string;
  state: string | null;
  phone_number: string | null;
  /** Relative API path (GET /org/logo). Load it with useProtectedImage. */
  logo_url: string | null;
  radiologist_count: number | null;
}

export interface OrgSettings {
  default_priority: "routine" | "urgent";
  auto_assign_to_id: string | null;
  report_disclaimer: string;
}

export type InviteRole = "admin" | "clinician" | "radiologist";

export interface Invite {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
  status: "pending" | "expired";
}

/** The raw token and link are returned once, at creation. */
export interface CreatedInvite {
  id: string;
  email: string;
  role: string;
  token: string;
  invite_url: string;
  expires_at: string;
}

export async function getOrg(): Promise<Organisation> {
  const { data } = await api.get<Organisation>("/org");
  return data;
}

/** Admins only. Only the fields you send change. */
export async function updateOrg(patch: {
  name?: string;
  type?: OrgType;
  state?: string;
  phone_number?: string;
  radiologist_count?: number | null;
}): Promise<Organisation> {
  const { data } = await api.put<Organisation>("/org", patch);
  return data;
}

export async function uploadLogo(file: File): Promise<void> {
  const fd = new FormData();
  fd.append("file", file);
  await api.post("/org/logo", fd, { headers: { "Content-Type": "multipart/form-data" } });
}

export async function deleteLogo(): Promise<void> {
  await api.delete("/org/logo");
}

export async function getOrgSettings(): Promise<OrgSettings> {
  const { data } = await api.get<OrgSettings>("/org/settings");
  return data;
}

export async function updateOrgSettings(patch: {
  default_priority?: "routine" | "urgent";
  auto_assign_to_id?: string | null;
  report_disclaimer?: string;
}): Promise<OrgSettings> {
  const { data } = await api.put<OrgSettings>("/org/settings", patch);
  return data;
}

export async function listInvites(): Promise<Invite[]> {
  const { data } = await api.get<Invite[]>("/org/invites");
  return data;
}

export async function createInvite(payload: {
  email: string;
  role: InviteRole;
}): Promise<CreatedInvite> {
  const { data } = await api.post<CreatedInvite>("/org/invites", payload);
  return data;
}

export async function deleteInvite(inviteId: string): Promise<void> {
  await api.delete(`/org/invites/${inviteId}`);
}
