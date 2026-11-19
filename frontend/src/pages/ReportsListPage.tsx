import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, FileText } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "../components/PageStatus";
import { REPORTS } from "../lib/features";
import { formatDateTime } from "../lib/format";
import {
  IMPRESSION_LABELS,
  listReports,
  type ReportStatus,
  type ReportSummary,
} from "../lib/reports";

type Tab = "all" | ReportStatus;

export function ReportsTable({ items }: { items: ReportSummary[] }) {
  return (
    <div className="p-4 space-y-2">
      {items.map((r) => (
        <Link
          key={r.id}
          to={`/scans/${r.scan_id}/report`}
          className="flex items-center gap-4 px-5 py-4 rounded-xl border border-brand-border/40 bg-brand-card/50 hover:bg-brand-card/80 hover:border-brand-primary/30 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-brand-primary/10 border-brand-primary/20 text-brand-primary">
            <FileText size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-brand-text text-sm font-bold truncate">{r.patient_code}</p>
            <p className="text-brand-text-muted/60 text-xs mt-0.5">
              {r.primary_impression
                ? (IMPRESSION_LABELS[r.primary_impression] ?? r.primary_impression)
                : "No impression yet"}
              {" · "}
              {r.author.full_name}
            </p>
          </div>
          <span className="hidden sm:inline text-brand-text-muted/60 text-xs">
            {formatDateTime(r.finalised_at ?? r.updated_at)}
          </span>
          <span
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold tracking-wide ${
              r.status === "final"
                ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/20"
                : "text-amber-400 bg-amber-500/5 border-amber-500/20"
            }`}
          >
            {r.status === "final" ? "Submitted" : "Draft"}
          </span>
          <ChevronRight
            size={16}
            className="text-brand-text-muted/40 group-hover:text-brand-primary transition-colors"
          />
        </Link>
      ))}
    </div>
  );
}

export default function ReportsListPage() {
  useEffect(() => {
    document.title = "Reports - Mediscan AI";
  }, []);
  return REPORTS ? <ReportsList /> : <NotAvailable />;
}

function NotAvailable() {
  return (
    <div className="p-4 sm:p-8 space-y-6">
      <h1 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mt-5">
        Patient Reports
      </h1>
      <div className="glass-panel rounded-2xl">
        <EmptyState
          title="Reports are not available yet"
          hint="Report writing needs the reports endpoints on the backend."
        />
      </div>
    </div>
  );
}

function ReportsList() {
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<ReportSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    listReports({ status: tab === "all" ? undefined : tab, limit: 50 })
      .then((r) => active && setItems(r))
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Failed to load reports");
      });
    return () => {
      active = false;
    };
  }, [tab, reloadKey]);

  function choose(next: Tab) {
    if (next === tab) return;
    setItems(null);
    setError(null);
    setTab(next);
  }
  function retry() {
    setItems(null);
    setError(null);
    setReloadKey((k) => k + 1);
  }

  const tabClass = (active: boolean) =>
    `px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${
      active
        ? "bg-gradient-to-r from-brand-primary/15 to-brand-secondary/15 text-brand-primary border border-brand-primary/25"
        : "text-brand-text-muted hover:text-brand-text hover:bg-brand-card/50 border border-transparent"
    }`;

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="mt-5">
        <h1 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">
          Patient Reports
        </h1>
        <p className="text-brand-text-muted text-sm">
          Open a scan and choose Open Report to start a new one.
        </p>
      </div>

      <div className="inline-flex bg-brand-card/45 border border-brand-border/40 p-1 rounded-xl gap-1">
        <button onClick={() => choose("all")} className={tabClass(tab === "all")}>All</button>
        <button onClick={() => choose("draft")} className={tabClass(tab === "draft")}>Drafts</button>
        <button onClick={() => choose("final")} className={tabClass(tab === "final")}>Submitted</button>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : items === null ? (
          <LoadingState label="Loading reports…" />
        ) : items.length === 0 ? (
          <EmptyState
            title="No reports here yet"
            hint="Reports you start from a scan will appear in this list."
          />
        ) : (
          <ReportsTable items={items} />
        )}
      </div>
    </div>
  );
}
