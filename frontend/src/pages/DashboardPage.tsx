import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ImageIcon,
  Info,
} from "lucide-react";
import { ActivityLog } from "../components/dashboard/ActivityLogs";
import SystemStats from "../components/dashboard/SystemStats";
import StatCard from "../components/dashboard/StatCard";
import ScanRow, { type ScanQueueItem } from "../components/dashboard/ScanRow";
import { useEffect, useState } from "react";
import { listPatients, type PatientRecord } from "../lib/patients";
import { listScans, type ScanRecord } from "../lib/scans";

export default function DashboardPage() {
  sessionStorage.setItem("lastPage", window.location.href);

  useEffect(() => {
    document.title = "Dashboard - Mediscan AI";
  }, []);

  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [urgentFirst, setUrgentFirst] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const patientList = await listPatients({ limit: 20, offset: 0 });
        setPatients(patientList);

        const allScans: ScanRecord[] = [];
        for (const patient of patientList) {
          const patientScans = await listScans(patient.id, {
            limit: 20,
            offset: 0,
          });
          allScans.push(...patientScans);
        }
        setScans(allScans);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pending = scans.filter((scan) => scan.status !== "completed");
  const urgent = scans.filter((scan) => scan.status === "pending");
  const flagged = scans.filter((scan) => (scan.findings ?? []).length > 0);
  const reviewed = scans.filter((scan) => scan.status === "completed");

  const queueScans = [...scans].sort((a, b) => {
    const aUrgent = a.status === "pending" ? 1 : 0;
    const bUrgent = b.status === "pending" ? 1 : 0;

    if (urgentFirst) {
      if (aUrgent !== bUrgent) return bUrgent - aUrgent;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const avgConfidence =
    scans.length > 0
      ? scans
          .flatMap((scan) => scan.findings ?? [])
          .reduce(
            (total, finding) => total + (finding.confidence_pct ?? 0),
            0,
          ) /
        scans.reduce((total, scan) => total + (scan.findings?.length ?? 0), 0)
      : 0;

  const scansToday = scans.filter((scan) => {
    const created = new Date(scan.created_at);
    const now = new Date();
    return (
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth() &&
      created.getDate() === now.getDate()
    );
  }).length;

  const systemStats = [
    {
      label: "Avg. AI Confidence",
      value: scans.reduce(
        (total, scan) => total + (scan.findings?.length ?? 0),
        0,
      )
        ? `${avgConfidence.toFixed(1)}%`
        : "N/A",
      icon: <Activity size={13} />,
    },
    {
      label: "Pending Scans",
      value: String(pending.length),
      icon: <ImageIcon size={13} />,
    },
    {
      label: "Review Completion",
      value: scans.length
        ? `${Math.round((reviewed.length / scans.length) * 100)}%`
        : "0%",
      icon: <CheckCircle2 size={13} />,
    },
    {
      label: "Scans Today",
      value: String(scansToday),
      icon: <AlertTriangle size={13} />,
    },
  ];

  const activityEntries = scans
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5)
    .map((scan) => {
      const patient = patients.find((entry) => entry.id === scan.patient_id);
      const finding = scan.findings?.[0];

      if (scan.status === "completed") {
        return {
          time: new Date(scan.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          message: `${patient?.patient_code ?? "Patient"} review complete${finding ? ` — ${finding.condition}` : ""}`,
          type: "reviewed" as const,
        };
      }

      if ((scan.findings ?? []).length > 0 && finding) {
        return {
          time: new Date(scan.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          message: `${patient?.patient_code ?? "Patient"} flagged — ${finding.condition} (${finding.confidence_pct}%)`,
          type: "flagged" as const,
        };
      }

      return {
        time: new Date(scan.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        message: `${patient?.patient_code ?? "Patient"} uploaded for review`,
        type: "uploaded" as const,
      };
    });

  return (
    <div className="p-4 sm:p-8 space-y-7">
      <div>
        <h1 className="text-3xl font-extrabold text-brand-text tracking-tight font-display">
          Clinical Review Dashboard
        </h1>
        <p className="text-brand-text-muted text-sm mt-1">
          {new Date().toLocaleDateString("en-NG", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="flex items-center gap-2.5 bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-2.5 text-amber-500 text-xs">
        <AlertTriangle size={14} className="shrink-0" />
        <p className="leading-snug">
          <span className="font-bold uppercase tracking-wider mr-1">
            AI Support Notice:
          </span>
          All findings are preliminary clinical decision-support data and must
          be verified by a clinician.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Pending Review"
          value={pending.length}
          sub="In your queue"
          icon={<ImageIcon size={18} />}
          accent="blue"
        />
        <StatCard
          label="Urgent"
          value={urgent.length}
          sub="High priority"
          icon={<AlertTriangle size={18} />}
          accent="amber"
        />
        <StatCard
          label="AI Flagged"
          value={flagged.length}
          sub="Possible findings"
          icon={<Activity size={18} />}
          accent="red"
        />
        <StatCard
          label="Reviewed Today"
          value={reviewed.length}
          sub="Signed off"
          icon={<CheckCircle2 size={18} />}
          accent="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 max-sm:w-full max-sm:overflow-x-scroll sm:overflow-hidden ">
          <div className="max-sm:w-150 bg-brand-card/60 backdrop-blur-md rounded-2xl border border-brand-border/60 overflow-hidden shadow-lg">
            <div className="flex items-center justify-between px-6 py-5 border-b border-brand-border/40">
              <div>
                <h2 className="text-brand-text text-base font-bold font-display">
                  Scan Queue
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-brand-text-muted text-xs">
                    {pending.length} pending · {urgent.length} urgent
                  </p>
                  <span className="w-1 h-1 bg-brand-text-muted/40 rounded-full" />
                  <p className="hidden sm:flex text-[10px] text-brand-primary font-bold items-center gap-1">
                    <Info size={11} /> Click row to review
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUrgentFirst(false)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${
                    !urgentFirst
                      ? "text-brand-primary bg-brand-primary/10 border border-brand-primary/20"
                      : "text-brand-text-muted hover:text-brand-primary hover:bg-brand-border/40"
                  }`}
                >
                  Latest
                </button>
                <button
                  type="button"
                  onClick={() => setUrgentFirst(true)}
                  className={`text-xs font-extrabold px-3 py-1.5 rounded-xl active:scale-95 transition-all ${
                    urgentFirst
                      ? "text-rose-400 bg-rose-500/10 border border-rose-500/20"
                      : "text-brand-text-muted hover:text-rose-400 hover:bg-brand-border/40"
                  }`}
                >
                  Urgent first
                </button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 px-6 py-3.5 text-brand-text-muted/40 text-[10px] uppercase font-bold tracking-widest border-b border-brand-border/40">
              <div className="col-span-4">Patient</div>
              <div className="col-span-2">Priority</div>
              <div className="col-span-3">Status</div>
              <div className="col-span-3 pl-2">AI Verdict</div>
            </div>

            <div className="p-4 space-y-2">
              {loading ? (
                <p className="px-6 py-8 text-sm text-brand-text-muted">
                  Loading patient queue…
                </p>
              ) : queueScans.length > 0 ? (
                queueScans.map((scan) => {
                  const patient = patients.find(
                    (entry) => entry.id === scan.patient_id,
                  );
                  const finding = scan.findings?.[0];
                  const queueItem: ScanQueueItem = {
                    id: scan.id,
                    patientName: patient?.patient_code ?? "Patient",
                    patientCode: patient?.patient_code ?? "N/A",
                    modality: "Chest X-Ray",
                    projection: "PA",
                    uploadedBy: "Clinician",
                    uploadedAt: new Date(scan.created_at).toLocaleDateString(),
                    priority: scan.status === "pending" ? "urgent" : "routine",
                    status:
                      scan.status === "completed"
                        ? "ready"
                        : scan.status === "pending"
                          ? "processing"
                          : "flagged",
                    confidence: finding?.confidence_pct ?? null,
                    prediction: finding?.condition ?? null,
                  };

                  return <ScanRow key={scan.id} scan={queueItem} />;
                })
              ) : (
                <p className="px-6 py-8 text-sm text-brand-text-muted">
                  No scans available yet.
                </p>
              )}
            </div>

            <div className="px-6 py-4.5 border-t border-brand-border/40 bg-brand-card/30 flex justify-between items-center">
              <p className="text-brand-text-muted/50 text-xs font-medium">
                Showing {scans.length} scans
              </p>
              <button className="text-brand-primary text-xs font-bold hover:text-brand-primary-hover flex items-center gap-1 transition-colors">
                View full queue <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <SystemStats stats={systemStats} />
          <ActivityLog entries={activityEntries} />
        </div>
      </div>
    </div>
  );
}
