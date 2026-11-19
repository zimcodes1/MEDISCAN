import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import ContextBar from "../components/patient-reports/ContextBar";
import FindingsBlock from "../components/patient-reports/FindingsBlock";
import ImpressionBlock from "../components/patient-reports/ImpressionBlock";
import RecommendationBlock from "../components/patient-reports/RecommendationBlock";
import AIAgreementBlock from "../components/patient-reports/AIAgreementBlock";
import SubmissionFooter from "../components/patient-reports/SubmissionFooter";
import ReportDocument from "../components/patient-reports/ReportDocument";
import { EmptyState, ErrorState, LoadingState } from "../components/PageStatus";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { REPORTS } from "../lib/features";
import { formatDate, formatDateTime } from "../lib/format";
import { formatSex, getPatient, patientAge, type PatientRecord } from "../lib/patients";
import {
  emptyForm,
  finaliseReport,
  getReport,
  missingForSubmit,
  saveReport,
  toForm,
  toPayload,
  type Report,
  type ReportForm,
} from "../lib/reports";
import { getScan, type ScanRecord } from "../lib/scans";

const PROJECTION_LABEL: Record<string, string> = { pa: "PA", ap: "AP", lateral: "Lateral" };

/** /scans/:scanId/report: write, save and submit the report for a scan. */
export default function ReportEditorPage() {
  const { scanId } = useParams<{ scanId: string }>();

  useEffect(() => {
    document.title = "Report - Mediscan AI";
  }, []);

  if (!REPORTS || !scanId) {
    return (
      <div className="p-4 sm:p-8">
        <div className="glass-panel rounded-2xl mt-10">
          <EmptyState
            title="Reports are not available yet"
            hint="Report writing needs the reports endpoints on the backend."
          />
        </div>
      </div>
    );
  }
  // key: start from a clean state whenever the scan changes
  return <Editor key={scanId} scanId={scanId} />;
}

function Editor({ scanId }: { scanId: string }) {
  const { user } = useAuth();
  const { add } = useNotifications();
  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [form, setForm] = useState<ReportForm>(emptyForm());
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const s = await getScan(scanId);
        if (!active) return;
        setScan(s);
        const [p, r] = await Promise.allSettled([getPatient(s.patient_id), getReport(scanId)]);
        if (!active) return;
        if (p.status === "fulfilled") setPatient(p.value);
        if (r.status === "rejected") throw r.reason;
        setReport(r.value);
        if (r.value) setForm(toForm(r.value));
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [scanId, reloadKey]);

  function retry() {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }

  const patch = (changes: Partial<ReportForm>) => {
    setForm((f) => ({ ...f, ...changes }));
    setProblems([]);
  };
  const notify = (message: string) =>
    add({ id: String(Date.now()), message, time: new Date().toLocaleTimeString() });

  async function handleSaveDraft() {
    setSaving(true);
    try {
      setReport(await saveReport(scanId, toPayload(form)));
      notify("Draft saved");
    } catch (err) {
      setProblems([err instanceof Error ? err.message : "Could not save the draft"]);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    const missing = missingForSubmit(form);
    if (missing.length) {
      setProblems(missing.map((m) => `${m} is required`));
      return;
    }
    if (!confirmed) return;
    setSaving(true);
    try {
      await saveReport(scanId, toPayload(form));
      setReport(await finaliseReport(scanId));
      notify("Report submitted");
    } catch (err) {
      setProblems([err instanceof Error ? err.message : "Could not submit the report"]);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-4 sm:p-8"><LoadingState label="Loading report…" /></div>;
  if (error || !scan)
    return (
      <div className="p-4 sm:p-8">
        <ErrorState message={error ?? "Scan not found"} onRetry={retry} />
      </div>
    );

  const back = (
    <Link
      to={`/scans/${scan.id}`}
      className="inline-flex items-center gap-1.5 text-brand-text-muted text-xs font-semibold hover:text-brand-primary transition-colors mb-3 print:hidden"
    >
      <ArrowLeft size={14} /> Back to scan
    </Link>
  );

  if (report?.status === "final") {
    return (
      <div className="p-4 sm:p-8 flex-1 print:pt-0 print:p-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 mt-5 print:hidden">
          <div>
            {back}
            <h1 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">
              Diagnostic Report
            </h1>
            <p className="text-brand-text-muted text-sm">Read-only view · Submitted</p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 bg-brand-card text-brand-primary border border-brand-border/60 hover:bg-brand-card/80 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 active:scale-95 cursor-pointer"
          >
            <Printer size={15} />
            Print
          </button>
        </div>
        <ReportDocument report={report} scan={scan} patient={patient} />
      </div>
    );
  }

  const age = patient ? patientAge(patient.year_of_birth) : null;
  return (
    <div className="p-4 sm:p-8 flex-1 flex flex-col max-w-5xl">
      <div className="mb-8 mt-5">
        {back}
        <h1 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">
          Clinician Report
        </h1>
        <p className="text-brand-text-muted text-sm">
          {report
            ? `Draft · last saved ${formatDateTime(report.updated_at)}`
            : "Complete structured diagnostic report"}
        </p>
      </div>

      <ContextBar
        patientName={patient?.patient_code ?? "Unknown patient"}
        age={age}
        sex={patient ? formatSex(patient.sex) : "—"}
        scanDate={formatDate(scan.exam_date ?? scan.created_at)}
        projection={scan.projection ? (PROJECTION_LABEL[scan.projection] ?? scan.projection) : "—"}
        aiFindings={(scan.findings ?? []).map((f) => ({
          condition: f.condition,
          prediction: f.flagged ? "detected" : "normal",
          confidence: Math.round(f.confidence_pct),
          isExperimental: f.experimental,
        }))}
      />

      <div className="space-y-6">
        <FindingsBlock
          lungFields={form.lungFields}
          affectedSide={form.affectedSide}
          severity={form.severity}
          detailedFindings={form.detailedFindings}
          onLungFieldsChange={(v) => patch({ lungFields: v })}
          onAffectedSideChange={(v) => patch({ affectedSide: v })}
          onSeverityChange={(v) => patch({ severity: v })}
          onDetailedFindingsChange={(v) => patch({ detailedFindings: v })}
        />
        <ImpressionBlock
          primaryImpression={form.primaryImpression}
          secondaryFindings={form.secondaryFindings}
          impressionNarrative={form.impressionNarrative}
          onPrimaryImpressionChange={(v) => patch({ primaryImpression: v })}
          onSecondaryFindingsChange={(v) => patch({ secondaryFindings: v })}
          onImpressionNarrativeChange={(v) => patch({ impressionNarrative: v })}
        />
        <RecommendationBlock
          recommendedAction={form.recommendedAction}
          followUpTimeframe={form.followUpTimeframe}
          followUpUnit={form.followUpUnit}
          additionalNotes={form.additionalNotes}
          onRecommendedActionChange={(v) => patch({ recommendedAction: v })}
          onFollowUpTimeframeChange={(v) => patch({ followUpTimeframe: v })}
          onFollowUpUnitChange={(v) => patch({ followUpUnit: v })}
          onAdditionalNotesChange={(v) => patch({ additionalNotes: v })}
        />
        <AIAgreementBlock
          agreement={form.agreement}
          disagreementReason={form.disagreementReason}
          onAgreementChange={(v) => patch({ agreement: v })}
          onDisagreementReasonChange={(v) => patch({ disagreementReason: v })}
        />

        {problems.length > 0 && (
          <div
            role="alert"
            className="text-rose-400 text-sm bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3"
          >
            <ul className="list-disc pl-5 space-y-0.5">
              {problems.map((p) => (
                <li key={p} className="break-words">{p}</li>
              ))}
            </ul>
          </div>
        )}

        <SubmissionFooter
          clinicianName={report?.author.full_name ?? user?.full_name ?? ""}
          confirmationChecked={confirmed}
          onConfirmationChange={setConfirmed}
          onSaveDraft={handleSaveDraft}
          onSubmitReport={handleSubmit}
          disabled={saving}
        />
      </div>
    </div>
  );
}
