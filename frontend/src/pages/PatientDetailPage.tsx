import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, ImageIcon } from "lucide-react";
import {
  formatSex,
  getPatient,
  patientAge,
  type PatientRecord,
} from "../lib/patients";
import { listScans, type FindingRecord, type ScanRecord } from "../lib/scans";
import { formatDate, formatDateTime } from "../lib/format";
import StatusBadge from "../components/StatusBadge";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../components/PageStatus";

function topFinding(findings?: FindingRecord[]): FindingRecord | undefined {
  if (!findings || findings.length === 0) return undefined;
  return [...findings].sort((a, b) => b.score - a.score)[0];
}

export default function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    document.title = "Patient - Mediscan AI";
  }, []);

  useEffect(() => {
    if (!patientId) return;
    let active = true;
    Promise.all([getPatient(patientId), listScans(patientId, { limit: 50 })])
      .then(([p, s]) => {
        if (!active) return;
        setPatient(p);
        setScans(s);
      })
      .catch((err: unknown) => {
        if (active)
          setError(err instanceof Error ? err.message : "Failed to load patient");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [patientId, reloadKey]);

  function retry() {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }

  const age = patient ? patientAge(patient.year_of_birth) : null;

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <Link
        to="/patients"
        className="inline-flex items-center gap-1.5 text-brand-text-muted text-xs font-semibold hover:text-brand-primary transition-colors"
      >
        <ArrowLeft size={14} /> Back to patients
      </Link>

      {loading ? (
        <LoadingState label="Loading patient…" />
      ) : error || !patient ? (
        <ErrorState message={error ?? "Patient not found"} onRetry={retry} />
      ) : (
        <>
          <div>
            <h1 className="text-3xl font-extrabold text-brand-text tracking-tight font-display">
              {patient.patient_code}
            </h1>
            <p className="text-brand-text-muted text-sm mt-1">
              Registered {formatDate(patient.created_at)}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Sex", value: formatSex(patient.sex) },
              { label: "Age", value: age !== null ? `${age} years` : "—" },
              {
                label: "Year of birth",
                value: patient.year_of_birth?.toString() ?? "—",
              },
              { label: "Scans", value: scans.length.toString() },
            ].map((f) => (
              <div key={f.label} className="glass-panel rounded-2xl p-4">
                <p className="text-brand-text-muted/60 text-[10px] uppercase font-bold tracking-widest">
                  {f.label}
                </p>
                <p className="text-brand-text font-bold text-lg mt-1">
                  {f.value}
                </p>
              </div>
            ))}
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-brand-border/40">
              <h2 className="text-brand-text text-base font-bold font-display">
                Scans
              </h2>
            </div>

            {scans.length === 0 ? (
              <EmptyState
                title="No scans for this patient yet"
                hint="Upload a chest X-ray from Case Upload and it will appear here."
                action={
                  <Link
                    to="/case-upload"
                    className="text-brand-primary text-sm font-bold hover:text-brand-primary-hover"
                  >
                    Go to Case Upload
                  </Link>
                }
              />
            ) : (
              <div className="p-4 space-y-2">
                {scans.map((s) => {
                  const f = topFinding(s.findings);
                  return (
                    <Link
                      key={s.id}
                      to={`/scans/${s.id}`}
                      className="flex items-center gap-4 px-5 py-4 rounded-xl border border-brand-border/40 bg-brand-card/50 hover:bg-brand-card/80 hover:border-brand-primary/30 transition-all group"
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-brand-primary/10 border-brand-primary/20 text-brand-primary">
                        <ImageIcon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-brand-text text-sm font-bold">
                          Chest X-ray
                        </p>
                        <p className="text-brand-text-muted/60 text-xs mt-0.5">
                          {formatDateTime(s.created_at)}
                        </p>
                      </div>
                      {f && (
                        <span className="hidden sm:inline text-brand-text-muted text-xs font-semibold">
                          {f.condition} ({Math.round(f.confidence_pct)}%)
                          {f.experimental && " · experimental"}
                        </span>
                      )}
                      <StatusBadge status={s.status} />
                      <ChevronRight
                        size={16}
                        className="text-brand-text-muted/40 group-hover:text-brand-primary transition-colors"
                      />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
