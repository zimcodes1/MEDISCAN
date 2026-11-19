import { api } from "./api";

export interface PersonRef {
  id: string;
  full_name: string;
}

export type ReportStatus = "draft" | "final";

export interface Report {
  id: string;
  scan_id: string;
  author: PersonRef;
  status: ReportStatus;
  lung_fields: string[];
  affected_side: string | null;
  severity: string | null;
  detailed_findings: string;
  primary_impression: string | null;
  secondary_findings: string;
  impression_narrative: string;
  recommended_action: string | null;
  follow_up_timeframe: number | null;
  follow_up_unit: string | null;
  additional_notes: string;
  ai_agreement: string | null;
  ai_disagreement_reason: string | null;
  created_at: string;
  updated_at: string;
  finalised_at: string | null;
}

export interface ReportSummary {
  id: string;
  scan_id: string;
  patient_code: string;
  status: ReportStatus;
  author: PersonRef;
  primary_impression: string | null;
  created_at: string;
  updated_at: string;
  finalised_at: string | null;
}

/** What PUT /scans/{id}/report accepts (everything optional). */
export type ReportPayload = Partial<
  Omit<Report, "id" | "scan_id" | "author" | "status" | "created_at" | "updated_at" | "finalised_at">
>;

// ---- code <-> label tables (codes are what the API stores) ----

export const LUNG_FIELDS = [
  { code: "clear", label: "Clear" },
  { code: "consolidation", label: "Consolidation present" },
  { code: "increased-opacity", label: "Increased opacity" },
  { code: "pleural-effusion", label: "Pleural effusion" },
  { code: "possible-nodule-mass", label: "Possible nodule/mass" },
  { code: "other", label: "Other" },
];
export const SIDES = [
  { code: "left", label: "Left" },
  { code: "right", label: "Right" },
  { code: "bilateral", label: "Bilateral" },
  { code: "na", label: "N/A" },
];
export const SEVERITY_LABELS: Record<string, string> = {
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
};
export const IMPRESSION_LABELS: Record<string, string> = {
  normal: "Normal",
  "pneumonia-bacterial": "Pneumonia (Bacterial)",
  "pneumonia-viral": "Pneumonia (Viral)",
  tuberculosis: "Tuberculosis",
  cardiomegaly: "Cardiomegaly",
  "lung-nodule-mass": "Lung Nodule / Mass",
  "pleural-effusion": "Pleural Effusion",
  other: "Other",
};
export const ACTION_LABELS: Record<string, string> = {
  "no-action": "No further action",
  "follow-up-xray": "Follow-up X-ray",
  "ct-scan": "CT scan advised",
  "immediate-review": "Immediate clinical review",
  "refer-specialist": "Refer to specialist",
};
export const AGREEMENT_LABELS: Record<string, string> = {
  agree: "Agree",
  "partially-agree": "Partially agree",
  disagree: "Disagree",
};

const labelOf = (table: { code: string; label: string }[], code: string | null) =>
  table.find((t) => t.code === code)?.label ?? "";
const codeOf = (table: { code: string; label: string }[], label: string) =>
  table.find((t) => t.label === label)?.code ?? null;

/** The report form's state, in the shapes the existing form components use. */
export interface ReportForm {
  lungFields: string[]; // labels
  affectedSide: string; // label
  severity: string; // code
  detailedFindings: string;
  primaryImpression: string; // code
  secondaryFindings: string;
  impressionNarrative: string;
  recommendedAction: string; // code
  followUpTimeframe: string;
  followUpUnit: string;
  additionalNotes: string;
  agreement: string; // code
  disagreementReason: string;
}

export const emptyForm = (): ReportForm => ({
  lungFields: [],
  affectedSide: "",
  severity: "",
  detailedFindings: "",
  primaryImpression: "",
  secondaryFindings: "",
  impressionNarrative: "",
  recommendedAction: "",
  followUpTimeframe: "",
  followUpUnit: "days",
  additionalNotes: "",
  agreement: "",
  disagreementReason: "",
});

export function toPayload(f: ReportForm): ReportPayload {
  const timeframe = f.followUpTimeframe.trim();
  const n = timeframe === "" ? null : Number(timeframe);
  return {
    lung_fields: f.lungFields
      .map((l) => codeOf(LUNG_FIELDS, l))
      .filter((c): c is string => !!c),
    affected_side: codeOf(SIDES, f.affectedSide),
    severity: f.severity || null,
    detailed_findings: f.detailedFindings,
    primary_impression: f.primaryImpression || null,
    secondary_findings: f.secondaryFindings,
    impression_narrative: f.impressionNarrative,
    recommended_action: f.recommendedAction || null,
    follow_up_timeframe: n !== null && Number.isFinite(n) ? n : null,
    follow_up_unit: n !== null && Number.isFinite(n) ? f.followUpUnit : null,
    additional_notes: f.additionalNotes,
    ai_agreement: f.agreement || null,
    ai_disagreement_reason:
      f.agreement && f.agreement !== "agree" ? f.disagreementReason || null : null,
  };
}

export function toForm(r: Report): ReportForm {
  return {
    lungFields: r.lung_fields.map((c) => labelOf(LUNG_FIELDS, c)).filter(Boolean),
    affectedSide: labelOf(SIDES, r.affected_side),
    severity: r.severity ?? "",
    detailedFindings: r.detailed_findings,
    primaryImpression: r.primary_impression ?? "",
    secondaryFindings: r.secondary_findings,
    impressionNarrative: r.impression_narrative,
    recommendedAction: r.recommended_action ?? "",
    followUpTimeframe:
      r.follow_up_timeframe === null ? "" : String(r.follow_up_timeframe),
    followUpUnit: r.follow_up_unit ?? "days",
    additionalNotes: r.additional_notes,
    agreement: r.ai_agreement ?? "",
    disagreementReason: r.ai_disagreement_reason ?? "",
  };
}

/** What must be filled in before a report can be submitted (mirrors the API's 422 rules). */
export function missingForSubmit(f: ReportForm): string[] {
  const missing: string[] = [];
  if (!f.primaryImpression) missing.push("Primary impression");
  if (!f.recommendedAction) missing.push("Recommended action");
  if (!f.agreement) missing.push("Agreement with the AI findings");
  else if (f.agreement !== "agree" && !f.disagreementReason.trim())
    missing.push("Reason for disagreement with the AI");
  return missing;
}

// ---- API ----

/** The report for a scan, or null if none has been started. */
export async function getReport(scanId: string): Promise<Report | null> {
  try {
    const { data } = await api.get<Report>(`/scans/${scanId}/report`);
    return data;
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

export async function saveReport(scanId: string, payload: ReportPayload): Promise<Report> {
  const { data } = await api.put<Report>(`/scans/${scanId}/report`, payload);
  return data;
}

export async function finaliseReport(scanId: string): Promise<Report> {
  const { data } = await api.post<Report>(`/scans/${scanId}/report/finalise`);
  return data;
}

export async function listReports(
  params: { status?: ReportStatus; limit?: number; offset?: number } = {},
): Promise<ReportSummary[]> {
  const { data } = await api.get<ReportSummary[]>("/reports", { params });
  return data;
}
