import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorState, LoadingState } from "../PageStatus";
import { useOrg } from "../../contexts/OrgContext";
import { getOrgSettings, updateOrgSettings, type OrgSettings } from "../../lib/org";
import { listStaff, type StaffMember } from "../../lib/staff";

const LABEL =
  "block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display";

const msg = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;

export default function ScanReportDefaultsSection() {
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [s, rads] = await Promise.all([
          getOrgSettings(),
          // same fallback as the upload form: everyone, if there are no radiologists yet
          listStaff("radiologist").then((r) => (r.length ? r : listStaff())),
        ]);
        if (!active) return;
        setSettings(s);
        setStaff(rads);
      } catch (err) {
        if (active) setError(msg(err, "Failed to load defaults"));
      }
    })();
    return () => {
      active = false;
    };
  }, [attempt]);

  if (error)
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          setError(null);
          setAttempt((n) => n + 1);
        }}
      />
    );
  if (!settings) return <LoadingState label="Loading defaults…" />;
  return <DefaultsForm initial={settings} staff={staff} />;
}

function DefaultsForm({
  initial,
  staff,
}: {
  initial: OrgSettings;
  staff: StaffMember[];
}) {
  const { reload } = useOrg();
  const [priority, setPriority] = useState(initial.default_priority);
  const [disclaimer, setDisclaimer] = useState(initial.report_disclaimer);
  const [assignTo, setAssignTo] = useState(initial.auto_assign_to_id ?? "manual");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null,
  );

  async function handleSave() {
    setSaving(true);
    setNotice(null);
    try {
      await updateOrgSettings({
        default_priority: priority,
        auto_assign_to_id: assignTo === "manual" ? null : assignTo,
        report_disclaimer: disclaimer,
      });
      await reload(); // reports and the upload form read these
      setNotice({ kind: "ok", text: "Defaults saved." });
    } catch (err) {
      setNotice({ kind: "error", text: msg(err, "Could not save defaults") });
    } finally {
      setSaving(false);
    }
  }

  const choice = (active: boolean, accent: "primary" | "amber") =>
    `p-4 rounded-xl border text-xs font-bold transition-all duration-300 cursor-pointer ${
      active
        ? accent === "primary"
          ? "border-brand-primary bg-brand-primary/10 text-brand-primary font-extrabold shadow-[0_0_15px_rgba(0,210,255,0.08)]"
          : "border-amber-500 bg-amber-500/10 text-amber-500 font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.08)]"
        : accent === "primary"
          ? "border-brand-border/60 bg-brand-card/30 text-brand-text hover:border-brand-primary/45"
          : "border-brand-border/60 bg-brand-card/30 text-brand-text hover:border-amber-500/45"
    }`;

  return (
    <div className="space-y-6 sm:pt-10">
      <div>
        <h2 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">
          Scan & Report Defaults
        </h2>
        <p className="text-brand-text-muted text-sm">
          Set organisation-wide defaults for scans and reports
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-6 relative overflow-hidden group">
        <div>
          <label className={`${LABEL} mb-3`}>Default Scan Priority</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPriority("routine")}
              className={choice(priority === "routine", "primary")}
            >
              Routine
            </button>
            <button
              type="button"
              onClick={() => setPriority("urgent")}
              className={choice(priority === "urgent", "amber")}
            >
              Urgent
            </button>
          </div>
          <p className="text-brand-text-muted/65 text-[10px] font-semibold mt-2">
            Staff can override this when uploading individual scans
          </p>
        </div>

        <div>
          <label className={LABEL}>Default Report Disclaimer Text</label>
          <textarea
            value={disclaimer}
            onChange={(e) => setDisclaimer(e.target.value)}
            rows={6}
            maxLength={2000}
            className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300 resize-none"
          />
          <p className="text-brand-text-muted/65 text-[10px] font-semibold mt-2">
            Appears on every printed report. {disclaimer.length}/2000
          </p>
        </div>

        <div>
          <label className={LABEL}>Auto-assign Scans To</label>
          <select
            value={assignTo}
            onChange={(e) => setAssignTo(e.target.value)}
            className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300"
          >
            <option value="manual">Manual Assignment</option>
            {/* keep a saved assignee selectable even if they're no longer in the list */}
            {assignTo !== "manual" && !staff.some((s) => s.id === assignTo) && (
              <option value={assignTo}>Current assignee</option>
            )}
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
          <p className="text-brand-text-muted/65 text-[10px] font-semibold mt-2">
            Automatically assign new scans to one person, or require manual
            assignment
          </p>
        </div>

        {notice && (
          <p
            className={`text-sm rounded-xl px-4 py-3 border break-words ${
              notice.kind === "ok"
                ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/20"
                : "text-rose-400 bg-rose-500/5 border-rose-500/20"
            }`}
          >
            {notice.text}
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg py-3.5 rounded-xl font-extrabold text-sm hover:shadow-[0_0_20px_rgba(0,210,255,0.25)] hover:opacity-95 active:scale-95 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          {saving ? "Saving…" : "Save Defaults"}
        </button>
      </div>
    </div>
  );
}
