import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { createPatient } from "../lib/patients";

// `value` must match the backend's accepted literals for `sex`.
const SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
];

export default function NewPatientPage() {
  const navigate = useNavigate();
  const [sex, setSex] = useState("");
  const [yearOfBirth, setYearOfBirth] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "New Patient - Mediscan AI";
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const currentYear = new Date().getFullYear();
    let yob: number | undefined;
    if (yearOfBirth.trim() !== "") {
      yob = Number(yearOfBirth);
      if (!Number.isInteger(yob) || yob < 1900 || yob > currentYear) {
        setError(`Year of birth must be between 1900 and ${currentYear}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const patient = await createPatient({
        sex: sex || undefined,
        year_of_birth: yob,
      });
      navigate(`/patients/${patient.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register patient");
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full bg-brand-card/60 text-brand-text px-4 py-3 rounded-xl border border-brand-border/60 outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all placeholder-brand-text-muted/50 text-sm";

  return (
    <div className="p-4 sm:p-8 max-w-xl space-y-6">
      <Link
        to="/patients"
        className="inline-flex items-center gap-1.5 text-brand-text-muted text-xs font-semibold hover:text-brand-primary transition-colors"
      >
        <ArrowLeft size={14} /> Back to patients
      </Link>

      <div>
        <h1 className="text-3xl font-extrabold text-brand-text tracking-tight font-display">
          New patient
        </h1>
        <p className="text-brand-text-muted text-sm mt-1">
          A patient code is assigned automatically. No name is stored.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5"
      >
        <div>
          <label className="block text-brand-text-muted text-xs font-bold uppercase tracking-wider mb-2">
            Sex
          </label>
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value)}
            className={inputClass}
          >
            <option value="">Not specified</option>
            {SEX_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-brand-text-muted text-xs font-bold uppercase tracking-wider mb-2">
            Year of birth
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={yearOfBirth}
            onChange={(e) => setYearOfBirth(e.target.value)}
            placeholder="e.g. 1985"
            className={inputClass}
          />
        </div>

        {error && (
          <p className="text-rose-400 text-sm bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3 break-words">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg px-5 py-2.5 rounded-xl text-sm font-extrabold hover:opacity-95 active:scale-95 disabled:opacity-50 transition-all"
          >
            {submitting ? "Registering…" : "Register patient"}
          </button>
          <Link
            to="/patients"
            className="text-brand-text-muted text-sm font-semibold hover:text-brand-text transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
