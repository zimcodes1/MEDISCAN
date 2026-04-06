import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Hourglass,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

type ScanStatus = "flagged" | "processing" | "ready" | "reviewed";
type Priority = "urgent" | "routine";

export interface ScanQueueItem {
  id: string;
  patientName: string;
  patientCode: string;
  modality: string;
  projection: string;
  uploadedBy: string;
  uploadedAt: string;
  priority: Priority;
  status: ScanStatus;
  confidence: number | null;
  prediction: string | null;
}

interface ScanRowProps {
  scan: ScanQueueItem;
}

const STATUS_CONFIG: Record<
  ScanStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  flagged: {
    label: "Flagged",
    color: "text-[#f08080]",
    icon: <AlertTriangle size={14} />,
  },
  processing: {
    label: "Analysing",
    color: "text-[#ffb95f]",
    icon: <RefreshCw size={14} className="animate-spin" />,
  },
  ready: {
    label: "Ready",
    color: "text-[#5dca9e]",
    icon: <CheckCircle2 size={14} />,
  },
  reviewed: {
    label: "Reviewed",
    color: "text-[#dce1fb]/40",
    icon: <ShieldCheck size={14} />,
  },
};

const PRIORITY_BORDER: Record<Priority, string> = {
  urgent: "border-l-[#f08080]",
  routine: "border-l-[#2e3650]",
};

function ConfidencePill({
  confidence,
  prediction,
}: {
  confidence: number;
  prediction: string;
}) {
  const isPositive = prediction === "Pneumonia";
  const numColor =
    confidence >= 80 ? "#f08080" : confidence >= 50 ? "#ffb95f" : "#5dca9e";

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <span
        className="text-[10px] sm:text-xs tabular-nums w-7 sm:w-8 font-medium"
        style={{ color: numColor }}
      >
        {confidence}%
      </span>
      <span
        className="text-[9px] sm:text-[10px] font-medium px-1.5 sm:px-2 py-0.5 rounded-full border whitespace-nowrap"
        style={{
          color: isPositive ? "#f08080" : "#5dca9e",
          borderColor: isPositive ? "#f08080" + "33" : "#5dca9e" + "33",
          backgroundColor: isPositive ? "#f08080" + "11" : "#5dca9e" + "11",
        }}
      >
        {prediction}
      </span>
    </div>
  );
}

export default function ScanRow({ scan }: ScanRowProps) {
  const status = STATUS_CONFIG[scan.status];
  const isReviewed = scan.status === "reviewed";

  return (
    <>
      {/* Desktop View */}
      <div
        className={`hidden md:grid grid-cols-12 gap-3 items-center px-4 py-3.5 rounded-lg border-l-2 transition-colors ${
          isReviewed
            ? "bg-[#0f1520] opacity-60"
            : "bg-[#111827] hover:bg-[#141c2f]"
        } ${PRIORITY_BORDER[scan.priority]}`}
      >
      {/* Patient */}
      <div className="col-span-3">
        <p
          className={`text-sm font-medium ${isReviewed ? "text-[#dce1fb]/50" : "text-[#dce1fb]"}`}
        >
          {scan.patientName}
        </p>
        <p className="text-[#dce1fb]/30 text-xs mt-0.5">
          {scan.patientCode} · {scan.id}
        </p>
      </div>

      {/* Scan Info */}
      <div className="col-span-2">
        <span className="text-[#dce1fb]/60 text-xs bg-[#1e2740] px-2 py-1 rounded">
          {scan.projection}
        </span>
      </div>

      {/* Uploaded */}
      <div className="col-span-2">
        <p className="text-[#dce1fb]/50 text-xs">{scan.uploadedBy}</p>
        <p className="text-[#dce1fb]/30 text-[10px]">{scan.uploadedAt}</p>
      </div>

      {/* Status */}
      <div className="col-span-2">
        <div className={`flex items-center gap-1.5 ${status.color}`}>
          {status.icon}
          <span className="text-xs font-medium">{status.label}</span>
        </div>
        {scan.priority === "urgent" && (
          <span className="text-[10px] text-[#f08080] font-semibold uppercase tracking-wider">
            Urgent
          </span>
        )}
      </div>

      {/* AI Finding + Action — merged to prevent overlap */}
      <div className="col-span-3 flex items-center justify-between gap-2">
        {/* Confidence pill or pending */}
        {scan.confidence !== null && scan.prediction ? (
          <ConfidencePill
            confidence={scan.confidence}
            prediction={scan.prediction}
          />
        ) : (
          <div className="flex items-center gap-1.5 text-[#dce1fb]/25 text-xs">
            <Hourglass size={12} />
            Pending
          </div>
        )}

        {/* Action button */}
        {!isReviewed && scan.status !== "processing" ? (
          <button className="flex items-center gap-1 text-[#7bd0ff] text-xs hover:text-white hover:bg-[#7bd0ff]/15 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0">
            {scan.status === "ready" || scan.status === "flagged"
              ? "Review"
              : "View"}
            <ChevronRight size={12} />
          </button>
        ) : (
          <span className="text-[#dce1fb]/20 text-xs px-2.5 py-1.5 shrink-0">
            —
          </span>
        )}
      </div>
    </div>

    {/* Mobile View */}
    <div
      className={`md:hidden flex flex-col gap-3 px-3 py-3 rounded-lg border-l-2 transition-colors ${
        isReviewed
          ? "bg-[#0f1520] opacity-60"
          : "bg-[#111827] active:bg-[#141c2f]"
      } ${PRIORITY_BORDER[scan.priority]}`}
    >
      {/* Top Row: Patient + Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium truncate ${isReviewed ? "text-[#dce1fb]/50" : "text-[#dce1fb]"}`}
          >
            {scan.patientName}
          </p>
          <p className="text-[#dce1fb]/30 text-[10px] mt-0.5">
            {scan.patientCode} · {scan.id}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={`flex items-center gap-1.5 ${status.color}`}>
            {status.icon}
            <span className="text-xs font-medium">{status.label}</span>
          </div>
          {scan.priority === "urgent" && (
            <span className="text-[10px] text-[#f08080] font-semibold uppercase tracking-wider">
              Urgent
            </span>
          )}
        </div>
      </div>

      {/* Middle Row: Projection + Uploaded */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-[#dce1fb]/60 bg-[#1e2740] px-2 py-1 rounded text-[10px] sm:text-xs">
          {scan.projection}
        </span>
        <div className="text-right">
          <p className="text-[#dce1fb]/50 text-[10px] sm:text-xs">{scan.uploadedBy}</p>
          <p className="text-[#dce1fb]/30 text-[9px] sm:text-[10px]">{scan.uploadedAt}</p>
        </div>
      </div>

      {/* Bottom Row: Confidence + Action */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          {scan.confidence !== null && scan.prediction ? (
            <ConfidencePill
              confidence={scan.confidence}
              prediction={scan.prediction}
            />
          ) : (
            <div className="flex items-center gap-1.5 text-[#dce1fb]/25 text-xs">
              <Hourglass size={12} />
              <span className="text-[10px] sm:text-xs">Pending</span>
            </div>
          )}
        </div>
        {!isReviewed && scan.status !== "processing" && (
          <button className="flex items-center gap-1 text-[#7bd0ff] text-[10px] sm:text-xs hover:text-white hover:bg-[#7bd0ff]/15 px-2 sm:px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap">
            {scan.status === "ready" || scan.status === "flagged"
              ? "Review"
              : "View"}
            <ChevronRight size={10} className="sm:w-3 sm:h-3" />
          </button>
        )}
      </div>
    </div>
    </>
  );
}
