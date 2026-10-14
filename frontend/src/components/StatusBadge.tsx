const STYLES: Record<string, string> = {
  flagged: "text-rose-400 bg-rose-500/5 border-rose-500/20",
  processing: "text-amber-400 bg-amber-500/5 border-amber-500/20",
  ready: "text-emerald-400 bg-emerald-500/5 border-emerald-500/20",
  reviewed: "text-brand-text-muted/65 bg-brand-card/40 border-brand-border/40",
};

const LABELS: Record<string, string> = {
  flagged: "Flagged",
  processing: "Analysing",
  ready: "Ready",
  reviewed: "Reviewed",
};

/** Scan status chip. Unknown statuses from the backend still render, in a neutral style. */
export default function StatusBadge({ status }: { status: string }) {
  const style =
    STYLES[status] ?? "text-brand-text-muted bg-brand-card/40 border-brand-border/40";
  const label = LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-bold tracking-wide ${style}`}
    >
      {label}
    </span>
  );
}
