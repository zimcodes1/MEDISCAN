import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, User } from "lucide-react";
import {
  listPatients,
  patientSummary,
  type PatientRecord,
} from "../../lib/patients";

export default function RecentPatients() {
  const [patients, setPatients] = useState<PatientRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listPatients({ limit: 20 })
      .then((rows) => {
        if (!active) return;
        const newestFirst = [...rows].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        setPatients(newestFirst.slice(0, 5));
      })
      .catch((err: unknown) => {
        if (active)
          setError(err instanceof Error ? err.message : "Failed to load patients");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-brand-border/40">
        <h2 className="text-brand-text text-base font-bold font-display">
          Patients
        </h2>
        <Link
          to="/patients"
          className="text-brand-primary text-xs font-bold hover:text-brand-primary-hover flex items-center gap-1 transition-colors"
        >
          View all <ChevronRight size={14} />
        </Link>
      </div>

      {error ? (
        <p className="px-6 py-8 text-center text-rose-400 text-xs break-words">
          {error}
        </p>
      ) : patients === null ? (
        <p className="px-6 py-8 text-center text-brand-text-muted text-xs">
          Loading…
        </p>
      ) : patients.length === 0 ? (
        <div className="px-6 py-8 text-center space-y-2">
          <p className="text-brand-text-muted text-xs">No patients yet.</p>
          <Link
            to="/patients/new"
            className="text-brand-primary text-xs font-bold hover:text-brand-primary-hover"
          >
            + Register a patient
          </Link>
        </div>
      ) : (
        <div className="p-3 space-y-1">
          {patients.map((p) => (
            <Link
              key={p.id}
              to={`/patients/${p.id}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-brand-card/60 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border bg-brand-primary/10 border-brand-primary/20 text-brand-primary">
                <User size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-brand-text text-sm font-bold truncate">
                  {p.patient_code}
                </p>
                <p className="text-brand-text-muted/60 text-xs">
                  {patientSummary(p)}
                </p>
              </div>
              <ChevronRight
                size={14}
                className="text-brand-text-muted/40 group-hover:text-brand-primary transition-colors"
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
