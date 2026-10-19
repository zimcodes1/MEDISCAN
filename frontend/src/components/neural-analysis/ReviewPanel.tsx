import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { updateScan, type Priority, type ScanRecord } from "../../lib/scans";
import type { StaffMember } from "../../lib/staff";
import { formatDate, formatDateTime } from "../../lib/format";

interface ReviewPanelProps {
  scan: ScanRecord;
  staff: StaffMember[];
  onUpdated: (scan: ScanRecord) => void;
}

const PROJECTION_LABEL: Record<string, string> = {
  pa: "PA",
  ap: "AP",
  lateral: "Lateral",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-4 border-b border-brand-border/30 pb-2 last:border-0 last:pb-0">
      <span className="text-brand-text-muted text-xs font-medium shrink-0">
        {label}
      </span>
      <span className="text-brand-text font-bold text-xs text-right">
        {children}
      </span>
    </div>
  );
}

/** Priority, assignment and review actions (api-contract.md sections 1 and 3). */
export default function ReviewPanel({ scan, staff, onUpdated }: ReviewPanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply(patch: Parameters<typeof updateScan>[1]) {
    setBusy(true);
    setError(null);
    try {
      onUpdated(await updateScan(scan.id, patch));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  const reviewed = scan.review_status === "reviewed";
  const priority: Priority = scan.priority ?? "routine";
  const chip = (active: boolean, urgent: boolean) =>
    `flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
      active
        ? urgent
          ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
          : "bg-brand-primary/10 border-brand-primary/30 text-brand-primary"
        : "bg-brand-card/30 border-brand-border/40 text-brand-text-muted hover:border-brand-primary/20"
    }`;

  return (
    <div className="space-y-5">
      <div className="border border-brand-border/40 p-4 rounded-xl bg-brand-card/25">
        <h3 className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-3.5">
          Review
        </h3>

        <div className="space-y-4">
          <div>
            <p className="text-brand-text-muted text-xs font-medium mb-2">
              Priority
            </p>
            <div className="flex gap-2">
              <button
                disabled={busy}
                onClick={() => priority !== "routine" && apply({ priority: "routine" })}
                className={chip(priority === "routine", false)}
              >
                Routine
              </button>
              <button
                disabled={busy}
                onClick={() => priority !== "urgent" && apply({ priority: "urgent" })}
                className={chip(priority === "urgent", true)}
              >
                Urgent
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="assign-to"
              className="block text-brand-text-muted text-xs font-medium mb-2"
            >
              Assigned to
            </label>
            <select
              id="assign-to"
              disabled={busy}
              value={scan.assigned_to?.id ?? ""}
              onChange={(e) => apply({ assigned_to_id: e.target.value || null })}
              className="w-full bg-brand-card/60 text-brand-text text-sm px-3 py-2.5 rounded-xl border border-brand-border/60 outline-none focus:border-brand-primary/50 disabled:opacity-50"
            >
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {`${s.full_name} (${s.role})`}
                </option>
              ))}
            </select>
          </div>

          {reviewed ? (
            <div className="flex items-start gap-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-emerald-400 text-xs font-bold">Reviewed</p>
                <p className="text-brand-text-muted text-[11px] mt-0.5">
                  {scan.reviewed_by?.full_name ?? "Someone"}
                  {scan.reviewed_at ? ` · ${formatDateTime(scan.reviewed_at)}` : ""}
                </p>
              </div>
              <button
                disabled={busy}
                onClick={() => apply({ review_status: "pending" })}
                className="text-brand-text-muted text-[11px] font-bold hover:text-brand-text underline cursor-pointer disabled:opacity-50"
              >
                Undo
              </button>
            </div>
          ) : (
            <button
              disabled={busy}
              onClick={() => apply({ review_status: "reviewed" })}
              className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg py-3 rounded-xl font-extrabold text-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {busy ? "Saving…" : "Mark as reviewed"}
            </button>
          )}

          {error && (
            <p className="text-rose-400 text-xs break-words">{error}</p>
          )}
        </div>
      </div>

      <div className="border border-brand-border/40 p-4 rounded-xl bg-brand-card/25">
        <h3 className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-3.5">
          Clinical Details
        </h3>
        <div className="space-y-3">
          <Row label="Projection">
            {scan.projection ? (PROJECTION_LABEL[scan.projection] ?? scan.projection) : "—"}
          </Row>
          <Row label="Exam date">{scan.exam_date ? formatDate(scan.exam_date) : "—"}</Row>
          <Row label="Uploaded by">{scan.uploaded_by?.full_name ?? "—"}</Row>
          {scan.clinical_notes && (
            <div>
              <p className="text-brand-text-muted text-xs font-medium mb-1.5">
                Clinical notes
              </p>
              <p className="text-brand-text text-xs leading-relaxed whitespace-pre-wrap break-words">
                {scan.clinical_notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
