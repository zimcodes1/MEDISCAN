import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ImageIcon,
  Info,
} from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import ScanRow, { type ScanQueueItem } from "../components/dashboard/ScanRow";
import { listAllScans, type ScanRecord } from "../lib/scans";
import { getDashboardStats, type DashboardStats } from "../lib/dashboard";
import { SCAN_WORKFLOW } from "../lib/features";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import { getPatient } from "../lib/patients";
import RecentPatients from "../components/dashboard/RecentPatients";
import { EmptyState, ErrorState, LoadingState } from "../components/PageStatus";
import { useAuth } from "../contexts/AuthContext";

/** What the queue shows for a scan, combining inference and review state. */
function queueStatus(s: ScanRecord): string {
  if (s.status === "processing") return "processing";
  if (s.review_status === "reviewed") return "reviewed";
  if (s.is_flagged) return "flagged";
  return s.status === "completed" ? "ready" : s.status;
}

/** Urgent first, then flagged, then newest. */
function byUrgency(a: ScanRecord, b: ScanRecord): number {
  const rank = (s: ScanRecord) =>
    (s.priority === "urgent" ? 2 : 0) + (s.is_flagged ? 1 : 0);
  return (
    rank(b) - rank(a) ||
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  // Set Previous page for the 404 back button handler to check
  sessionStorage.setItem("lastPage", window.location.href);

  useEffect(() => {
    document.title = "Dashboard - Mediscan AI";
  }, []);

  const [queue, setQueue] = useState<ScanQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (!SCAN_WORKFLOW) return;
    let active = true;
    getDashboardStats()
      .then((s) => active && setStats(s))
      .catch(() => {}); // cards fall back to "—"
    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let mounted = true;

    async function loadQueue() {
      try {
        const scans = (await listAllScans({ limit: 50 })).sort(byUrgency);

        // One lookup per unique patient instead of one per scan.
        const ids = [...new Set(scans.map((s) => s.patient_id).filter(Boolean))];
        const lookups = await Promise.allSettled(ids.map((id) => getPatient(id)));
        const codes = new Map<string, string>();
        lookups.forEach((r, i) => {
          if (r.status === "fulfilled") codes.set(ids[i], r.value.patient_code);
        });

        const mapped: ScanQueueItem[] = await Promise.all(
          scans.map(async (s) => {
            const patientCode = codes.get(s.patient_id) ?? s.patient_id ?? "Unknown";
            const patientName = patientCode;

            const finding =
              s.findings && s.findings.length ? s.findings[0] : undefined;
            return {
              id: s.id,
              patientName,
              patientCode,
              modality: "Chest X-Ray",
              projection: "",
              uploadedBy: "",
              uploadedAt: new Date(s.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              // null until the backend tracks priority
              priority: s.priority ?? null,
              status: queueStatus(s),
              confidence: finding
                ? Math.round(
                    (finding.confidence_pct ?? finding.score * 100) as number,
                  )
                : null,
              prediction: finding ? finding.condition : null,
            } as ScanQueueItem;
          }),
        );

        if (mounted) setQueue(mapped);
      } catch (err: unknown) {
        console.error("failed to load scans", err);
        if (mounted)
          setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadQueue();
    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  function retryQueue() {
    setLoading(true);
    setLoadError(null);
    setReloadKey((k) => k + 1);
  }

  // Without the scan workflow on the backend these cards show "—" instead of
  // a misleading 0; with it, they come from GET /dashboard/stats.
  const hasPriority = queue.some((s) => s.priority !== null);
  const urgent = queue.filter((s) => s.priority === "urgent");

  return (
    <div className="p-4 sm:p-8 space-y-7">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-brand-text tracking-tight font-display">
          Welcome back{user ? `, ${user.full_name}` : ""}
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

      {/* Compact Disclaimer Banner */}
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

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label={stats ? "Pending Review" : "Scans"}
          value={stats ? stats.pending_review : queue.length}
          sub={stats ? "Awaiting review" : "Most recent uploads"}
          icon={<ImageIcon size={18} />}
          accent="blue"
        />
        <StatCard
          label="Urgent"
          value={stats ? stats.urgent : hasPriority ? urgent.length : "—"}
          sub={stats || hasPriority ? "High priority" : "Not tracked yet"}
          icon={<AlertTriangle size={18} />}
          accent="amber"
        />
        <StatCard
          label="AI Flagged"
          value={stats ? stats.flagged : "—"}
          sub={stats ? "Above alert threshold" : "Not tracked yet"}
          icon={<Activity size={18} />}
          accent="red"
        />
        <StatCard
          label="Reviewed Today"
          value={stats ? stats.reviewed_today : "—"}
          sub={stats ? "Signed off" : "Not tracked yet"}
          icon={<CheckCircle2 size={18} />}
          accent="green"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Scan Queue — 2 cols */}
        <div className="lg:col-span-2 max-sm:w-full max-sm:overflow-x-scroll sm:overflow-hidden ">
          <div className="max-sm:w-150 bg-brand-card/60 backdrop-blur-md rounded-2xl border border-brand-border/60 overflow-hidden shadow-lg">
            <div className="flex items-center justify-between px-6 py-5 border-b border-brand-border/40">
              <div>
                <h2 className="text-brand-text text-base font-bold font-display">
                  Scan Queue
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-brand-text-muted text-xs">
                    {queue.length} scans
                  </p>
                  <span className="w-1 h-1 bg-brand-text-muted/40 rounded-full" />
                  <p className="hidden sm:flex text-[10px] text-brand-primary font-bold  items-center gap-1">
                    <Info size={11} /> Click row to review
                  </p>
                </div>
              </div>
            </div>

            {/* Table Head */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3.5 text-brand-text-muted/40 text-[10px] uppercase font-bold tracking-widest border-b border-brand-border/40">
              <div className="col-span-4">Patient</div>
              <div className="col-span-2">Priority</div>
              <div className="col-span-3">Status</div>
              <div className="col-span-3 pl-2">AI Verdict</div>
            </div>

            {/* Rows */}
            <div className="p-4 space-y-2">
              {loading ? (
                <LoadingState label="Loading scans…" />
              ) : loadError ? (
                <ErrorState message={loadError} onRetry={retryQueue} />
              ) : queue.length === 0 ? (
                <EmptyState
                  title="No scans yet"
                  hint="Upload a chest X-ray and it will appear in your queue."
                />
              ) : (
                queue.map((scan) => <ScanRow key={scan.id} scan={scan} />)
              )}
            </div>

            <div className="px-6 py-4.5 border-t border-brand-border/40 bg-brand-card/30 flex justify-between items-center">
              <p className="text-brand-text-muted/50 text-xs font-medium">
                Showing {queue.length} scans
              </p>
              <Link
                to="/neural-analysis"
                className="text-brand-primary text-xs font-bold hover:text-brand-primary-hover flex items-center gap-1 transition-colors"
              >
                View all scans <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <RecentPatients />
          {SCAN_WORKFLOW && <ActivityFeed />}
        </div>
      </div>
    </div>
  );
}
