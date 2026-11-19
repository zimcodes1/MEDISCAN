import { api } from "./api";

export type PlatformOrgStatus = "pending" | "active" | "suspended";

export interface PlatformOrg {
  id: string;
  name: string;
  type: string;
  state: string | null;
  phone_number: string | null;
  radiologist_count: number | null;
  status: PlatformOrgStatus;
  created_at: string;
  admin: { id: string; full_name: string; email: string } | null;
}

/** Platform admins only. */
export async function listPlatformOrgs(
  status?: PlatformOrgStatus,
): Promise<PlatformOrg[]> {
  const { data } = await api.get<PlatformOrg[]>("/platform/organisations", {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function approveOrg(orgId: string): Promise<PlatformOrg> {
  const { data } = await api.post<PlatformOrg>(
    `/platform/organisations/${orgId}/approve`,
  );
  return data;
}

export async function suspendOrg(orgId: string): Promise<PlatformOrg> {
  const { data } = await api.post<PlatformOrg>(
    `/platform/organisations/${orgId}/suspend`,
  );
  return data;
}
