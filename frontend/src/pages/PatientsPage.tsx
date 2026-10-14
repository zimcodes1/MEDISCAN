import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Plus, Search, User } from "lucide-react";
import {
  listPatients,
  patientSummary,
  type PatientRecord,
} from "../lib/patients";
import { formatDate } from "../lib/format";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../components/PageStatus";

const PAGE_SIZE = 24;

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    document.title = "Patients - Mediscan AI";
  }, []);

  useEffect(() => {
    let active = true;
    listPatients({ limit: PAGE_SIZE, offset: 0 })
      .then((rows) => {
        if (!active) return;
        setPatients(rows);
        setHasMore(rows.length === PAGE_SIZE);
      })
      .catch((err: unknown) => {
        if (active)
          setError(err instanceof Error ? err.message : "Failed to load patients");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  function retry() {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }

  async function loadMore() {
    setLoadingMore(true);
    setMoreError(null);
    try {
      const rows = await listPatients({
        limit: PAGE_SIZE,
        offset: patients.length,
      });
      setPatients((prev) => [...prev, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      setMoreError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? patients.filter((p) => p.patient_code.toLowerCase().includes(q))
    : patients;

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-brand-text tracking-tight font-display">
            Patients
          </h1>
          <p className="text-brand-text-muted text-sm mt-1">
            {loading
              ? "Loading…"
              : `${patients.length} loaded${hasMore ? " (more available)" : ""}`}
          </p>
        </div>
        <Link
          to="/patients/new"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg px-4 py-2.5 rounded-xl text-sm font-extrabold hover:opacity-95 active:scale-95 transition-all"
        >
          <Plus size={16} />
          New patient
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by patient code..."
          className="w-full bg-brand-card/60 text-brand-text pl-12 pr-4 py-3 rounded-xl border border-brand-border/60 outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all placeholder-brand-text-muted/50 text-sm"
        />
      </div>
      {q && hasMore && (
        <p className="text-brand-text-muted/70 text-xs -mt-3">
          Filtering the patients loaded so far. Load more to search further.
        </p>
      )}

      {loading ? (
        <LoadingState label="Loading patients…" />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : patients.length === 0 ? (
        <EmptyState
          title="No patients yet"
          hint="Register your first patient to start uploading scans."
          action={
            <Link
              to="/patients/new"
              className="text-brand-primary text-sm font-bold hover:text-brand-primary-hover"
            >
              + Register a patient
            </Link>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState title="No matching patients" hint={`Nothing loaded matches "${query}".`} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((p) => (
            <Link
              key={p.id}
              to={`/patients/${p.id}`}
              className="glass-panel glass-panel-hover rounded-2xl p-5 flex items-center gap-4 group"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border bg-brand-primary/10 border-brand-primary/20 text-brand-primary">
                <User size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-brand-text font-bold text-sm truncate">
                  {p.patient_code}
                </p>
                <p className="text-brand-text-muted/70 text-xs font-semibold mt-0.5">
                  {patientSummary(p)}
                </p>
                <p className="text-brand-text-muted/50 text-[10px] uppercase font-bold tracking-wider mt-1.5">
                  Registered {formatDate(p.created_at)}
                </p>
              </div>
              <ChevronRight
                size={16}
                className="text-brand-text-muted/40 group-hover:text-brand-primary transition-colors"
              />
            </Link>
          ))}
        </div>
      )}

      {!loading && !error && hasMore && (
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="text-brand-primary text-sm font-bold px-5 py-2.5 rounded-xl border border-brand-primary/20 hover:bg-brand-primary/10 disabled:opacity-50 transition-all"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
          {moreError && <p className="text-rose-400 text-xs">{moreError}</p>}
        </div>
      )}
    </div>
  );
}
