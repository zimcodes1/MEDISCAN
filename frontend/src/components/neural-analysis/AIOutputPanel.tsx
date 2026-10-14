import { AlertTriangle, Flame } from "lucide-react";
import type { FindingRecord } from "../../lib/scans";
import { formatBytes, formatDateTime } from "../../lib/format";
import StatusBadge from "../StatusBadge";

const DEFAULT_DISCLAIMER =
  "This output is AI-generated and does not constitute an official medical diagnosis.";

interface AIOutputPanelProps {
  findings: FindingRecord[];
  selectedFindingId: string | null;
  onSelectFinding: (id: string) => void;
  patientCode: string | null;
  scanId: string;
  status: string;
  createdAt: string;
  contentType?: string;
  sizeBytes?: number;
  disclaimer?: string;
  heatmapShown: boolean;
}

export default function AIOutputPanel({
  findings,
  selectedFindingId,
  onSelectFinding,
  patientCode,
  scanId,
  status,
  createdAt,
  contentType,
  sizeBytes,
  disclaimer,
  heatmapShown,
}: AIOutputPanelProps) {
  const ranked = [...findings].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-5">
      {/* Disclaimer Banner */}
      <div className="bg-amber-500/5 border border-amber-500/25 p-4 rounded-xl flex items-start gap-3">
        <AlertTriangle
          size={18}
          className="text-amber-500 shrink-0 mt-0.5 animate-pulse"
        />
        <div>
          <p className="text-amber-500 text-xs font-bold uppercase tracking-wider mb-0.5">
            Clinician Review Required
          </p>
          <p className="text-brand-text-muted text-[11px] font-medium leading-relaxed">
            {disclaimer || DEFAULT_DISCLAIMER}
          </p>
        </div>
      </div>

      {/* Findings */}
      <div className="border border-brand-border/40 p-4 rounded-xl bg-brand-card/25">
        <h3 className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-3">
          AI Findings
        </h3>

        {ranked.length === 0 ? (
          <p className="text-brand-text-muted text-xs">
            {status === "processing"
              ? "Analysis in progress."
              : "No findings recorded for this scan."}
          </p>
        ) : (
          <div className="space-y-2">
            {ranked.map((f) => {
              const selected = f.id === selectedFindingId;
              return (
                <button
                  key={f.id}
                  onClick={() => onSelectFinding(f.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                    selected
                      ? "border-brand-primary/40 bg-brand-primary/5"
                      : "border-brand-border/40 bg-brand-card/30 hover:border-brand-primary/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-brand-text text-xs font-bold flex items-center gap-2 min-w-0">
                      <span className="truncate">{f.condition}</span>
                      {f.experimental && (
                        <span className="shrink-0 text-[9px] uppercase font-bold tracking-wider text-amber-400 border border-amber-500/20 bg-amber-500/5 rounded-md px-1.5 py-0.5">
                          Experimental
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {f.has_heatmap && (
                        <Flame
                          size={12}
                          className="text-brand-primary"
                          aria-label="Has heatmap"
                        />
                      )}
                      <span className="text-brand-primary font-extrabold text-sm font-display">
                        {Math.round(f.confidence_pct)}%
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-brand-bg/80 h-1.5 rounded-full overflow-hidden border border-brand-border/30">
                    <div
                      className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, f.confidence_pct))}%`,
                      }}
                    />
                  </div>
                  <p className="text-brand-text-muted/60 text-[10px] font-bold uppercase tracking-wider mt-2">
                    {f.model_name} {f.model_version}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        <p className="text-brand-text-muted/60 text-[10px] leading-relaxed mt-3">
          Scores are raw model outputs, not calibrated probabilities.
        </p>
        {heatmapShown && (
          <p className="text-brand-text-muted/60 text-[10px] leading-relaxed mt-1.5">
            Heatmaps show where the model focused, which may not coincide with
            the pathology. Always check against the original image.
          </p>
        )}
      </div>

      {/* Scan Metadata */}
      <div className="border border-brand-border/40 p-4 rounded-xl bg-brand-card/25">
        <h3 className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-3.5">
          Scan Metadata
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center border-b border-brand-border/30 pb-2">
            <span className="text-brand-text-muted text-xs font-medium">
              Patient
            </span>
            <span className="text-brand-text font-bold text-xs">
              {patientCode ?? "—"}
            </span>
          </div>
          <div className="flex justify-between items-center border-b border-brand-border/30 pb-2">
            <span className="text-brand-text-muted text-xs font-medium">
              Scan ID
            </span>
            <span
              title={scanId}
              className="text-brand-primary font-mono text-xs font-bold"
            >
              {scanId.slice(0, 8)}
            </span>
          </div>
          <div className="flex justify-between items-center border-b border-brand-border/30 pb-2">
            <span className="text-brand-text-muted text-xs font-medium">
              Uploaded
            </span>
            <span className="text-brand-text font-bold text-xs">
              {formatDateTime(createdAt)}
            </span>
          </div>
          <div className="flex justify-between items-center border-b border-brand-border/30 pb-2">
            <span className="text-brand-text-muted text-xs font-medium">
              File
            </span>
            <span className="text-brand-text font-bold text-xs">
              {contentType ?? "—"} · {formatBytes(sizeBytes)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-brand-text-muted text-xs font-medium">
              Status
            </span>
            <StatusBadge status={status} />
          </div>
        </div>
      </div>

      {/* Reports are not wired to the backend yet */}
      <button
        disabled
        title="Report writing is not connected to the backend yet"
        className="w-full bg-brand-card/60 border border-brand-border/40 text-brand-text-muted py-3.5 rounded-xl font-extrabold text-sm opacity-60 cursor-not-allowed"
      >
        Write Report (coming soon)
      </button>
    </div>
  );
}
