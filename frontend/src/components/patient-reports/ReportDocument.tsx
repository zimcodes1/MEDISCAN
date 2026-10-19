import { AlertTriangle, CheckCircle } from "lucide-react";
import ReportHeader from "./ReportHeader";
import ReportSection from "./ReportSection";
import ReportField from "./ReportField";
import ReportDisclaimer from "./ReportDisclaimer";
import { formatDate, formatDateTime } from "../../lib/format";
import { formatSex, patientAge, type PatientRecord } from "../../lib/patients";
import type { ScanRecord } from "../../lib/scans";
import {
  ACTION_LABELS,
  AGREEMENT_LABELS,
  IMPRESSION_LABELS,
  LUNG_FIELDS,
  SEVERITY_LABELS,
  SIDES,
  type Report,
} from "../../lib/reports";

const PROJECTION_LABEL: Record<string, string> = {
  pa: "PA (Posteroanterior)",
  ap: "AP (Anteroposterior)",
  lateral: "Lateral",
};

const dash = (v: string | null | undefined) => (v && v.trim() ? v : "—");

interface ReportDocumentProps {
  report: Report;
  scan: ScanRecord;
  patient: PatientRecord | null;
  orgName?: string;
}

/** Read-only, printable view of a submitted report. */
export default function ReportDocument({
  report,
  scan,
  patient,
  orgName = "MediScan NG",
}: ReportDocumentProps) {
  const age = patient ? patientAge(patient.year_of_birth) : null;
  const findings = [...(scan.findings ?? [])].sort((a, b) => b.score - a.score);
  const labelOf = (table: { code: string; label: string }[], code: string | null) =>
    table.find((t) => t.code === code)?.label ?? "—";

  return (
    <div className="max-w-5xl print:max-w-full">
      <ReportHeader
        orgName={orgName}
        reportId={report.id.slice(0, 8).toUpperCase()}
        reportDate={formatDateTime(report.finalised_at ?? report.updated_at)}
      />

      <ReportSection title="Patient Information">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ReportField label="Patient Code" value={patient?.patient_code ?? "—"} />
          <ReportField label="Sex" value={patient ? formatSex(patient.sex) : "—"} />
          <ReportField label="Age" value={age !== null ? `${age} years` : "—"} />
        </div>
      </ReportSection>

      <ReportSection title="Scan Information">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ReportField
            label="Scan Date"
            value={formatDate(scan.exam_date ?? scan.created_at)}
          />
          <ReportField label="Scan Type" value="Chest X-Ray" />
          <ReportField
            label="Projection"
            value={scan.projection ? (PROJECTION_LABEL[scan.projection] ?? scan.projection) : "—"}
          />
          <ReportField label="Scan ID" value={scan.id.slice(0, 8)} />
        </div>
      </ReportSection>

      <ReportSection title="AI-Generated Preliminary Analysis" highlight>
        <p className="text-amber-500 text-xs font-bold uppercase tracking-wider mb-4 font-display print:text-amber-600">
          Multi-Condition Diagnostic Panel Findings
        </p>
        {findings.length === 0 ? (
          <p className="text-brand-text-muted text-sm">No AI findings recorded.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 print:grid-cols-1 print:gap-3">
            {findings.map((f) => (
              <div
                key={f.id}
                className={`p-4 rounded-xl border flex flex-col gap-2 print:bg-white print:border-gray-200 print:text-black ${
                  f.flagged
                    ? "bg-rose-500/5 border-rose-500/20 text-rose-400"
                    : "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {f.flagged ? (
                      <AlertTriangle size={16} className="shrink-0" />
                    ) : (
                      <CheckCircle size={16} className="shrink-0" />
                    )}
                    <span className="font-bold text-sm truncate">{f.condition}</span>
                    {f.experimental && (
                      <span className="text-[9px] uppercase font-bold tracking-wider text-amber-400 border border-amber-500/20 rounded-md px-1.5 py-0.5">
                        Experimental
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">
                    {f.flagged ? "Flagged" : "Not flagged"}
                  </span>
                </div>
                {f.flagged && /nodule|mass/i.test(f.condition) && (
                  <p className="text-rose-400/90 print:text-red-600 text-[10px] font-bold leading-normal bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg">
                    Possible nodule/mass: not a cancer diagnosis. CT follow-up recommended.
                  </p>
                )}
                <p className="text-brand-text-muted text-[10px] font-bold">
                  Model score: {Math.round(f.confidence_pct)}% (raw output, not a calibrated probability)
                </p>
              </div>
            ))}
          </div>
        )}
        <p className="text-amber-500/80 print:text-gray-500 text-[10px] font-bold leading-relaxed border-t border-amber-500/10 print:border-gray-200 pt-3 mt-4">
          * NOTE: The findings above are automated pre-analysis results. The
          clinician's findings, impression and recommendations follow below.
        </p>
      </ReportSection>

      <ReportSection title="Radiologist Findings">
        <div className="space-y-5">
          <div>
            <p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2.5 font-display">
              Identified Anomalies
            </p>
            {report.lung_fields.length === 0 ? (
              <p className="text-brand-text text-sm font-semibold">—</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {report.lung_fields.map((c) => (
                  <span
                    key={c}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-primary/10 border border-brand-primary/20 text-brand-primary print:text-black print:border-gray-300"
                  >
                    {labelOf(LUNG_FIELDS, c)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ReportField label="Affected Side" value={labelOf(SIDES, report.affected_side)} />
            <ReportField
              label="Severity Status"
              value={report.severity ? (SEVERITY_LABELS[report.severity] ?? report.severity) : "—"}
            />
          </div>
          <ReportField label="Detailed Findings" value={dash(report.detailed_findings)} />
        </div>
      </ReportSection>

      <ReportSection title="Radiologist Impression">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <ReportField
              label="Primary Impression"
              value={report.primary_impression ? (IMPRESSION_LABELS[report.primary_impression] ?? report.primary_impression) : "—"}
            />
            <ReportField label="Secondary Findings" value={dash(report.secondary_findings)} />
          </div>
          <ReportField label="Clinical Impression Narrative" value={dash(report.impression_narrative)} />
        </div>
      </ReportSection>

      <ReportSection title="Clinical Recommendation">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <ReportField
              label="Recommended Action"
              value={report.recommended_action ? (ACTION_LABELS[report.recommended_action] ?? report.recommended_action) : "—"}
            />
            <ReportField
              label="Follow-up Timeframe"
              value={
                report.follow_up_timeframe !== null
                  ? `${report.follow_up_timeframe} ${report.follow_up_unit ?? ""}`.trim()
                  : "—"
              }
            />
          </div>
          <ReportField label="Additional Notes" value={dash(report.additional_notes)} />
        </div>
      </ReportSection>

      <ReportSection title="Agreement With AI Findings">
        <div className="space-y-4">
          <ReportField
            label="Clinician's assessment"
            value={report.ai_agreement ? (AGREEMENT_LABELS[report.ai_agreement] ?? report.ai_agreement) : "—"}
          />
          {report.ai_disagreement_reason && (
            <ReportField label="Reason" value={report.ai_disagreement_reason} />
          )}
        </div>
      </ReportSection>

      <ReportSection title="Report Authenticity & Signature">
        <div className="grid grid-cols-2 gap-4">
          <ReportField label="Reporting Clinician" value={report.author.full_name} />
          <ReportField
            label="Submitted"
            value={report.finalised_at ? formatDateTime(report.finalised_at) : "—"}
          />
        </div>
      </ReportSection>

      <ReportDisclaimer />
    </div>
  );
}
