import { AlertTriangle, CheckCircle2, ChevronRight, Hourglass, RefreshCw, ShieldCheck } from "lucide-react";

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


const STATUS_CONFIG: Record<ScanStatus, { label: string; color: string; icon: React.ReactNode }> = {
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

function ConfidencePill({ confidence, prediction }: { confidence: number; prediction: string }) {
    const isPositive = prediction === "Pneumonia";
    const color = confidence >= 80 ? "#f08080" : confidence >= 50 ? "#ffb95f" : "#5dca9e";

    return (
        <div className="flex items-center gap-2">
            <span className="text-[#dce1fb] text-xs tabular-nums w-8">{confidence}%</span>
            <div className="flex-1 h-1 bg-[#1e2740] rounded-full overflow-hidden min-w-[60px]">
                <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${confidence}%`, backgroundColor: color }}
                />
            </div>
            <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
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
        <div
            className={`grid grid-cols-12 gap-3 items-center px-4 py-3.5 rounded-lg border-l-2 transition-colors ${
                isReviewed ? "bg-[#0f1520] opacity-60" : "bg-[#111827] hover:bg-[#141c2f]"
            } ${PRIORITY_BORDER[scan.priority]}`}
        >
            {/* Patient */}
            <div className="col-span-3">
                <p className={`text-sm font-medium ${isReviewed ? "text-[#dce1fb]/50" : "text-[#dce1fb]"}`}>
                    {scan.patientName}
                </p>
                <p className="text-[#dce1fb]/30 text-xs mt-0.5">{scan.patientCode} · {scan.id}</p>
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
                    <span className="text-[10px] text-[#f08080] font-semibold uppercase tracking-wider">Urgent</span>
                )}
            </div>

            {/* Confidence */}
            <div className="col-span-2">
                {scan.confidence !== null && scan.prediction ? (
                    <ConfidencePill confidence={scan.confidence} prediction={scan.prediction} />
                ) : (
                    <div className="flex items-center gap-1.5 text-[#dce1fb]/25 text-xs">
                        <Hourglass size={12} />
                        Pending
                    </div>
                )}
            </div>

            {/* Action */}
            <div className="col-span-1 flex justify-end">
                {!isReviewed && scan.status !== "processing" ? (
                    <button className="flex items-center gap-1 text-[#7bd0ff] text-xs hover:text-white hover:bg-[#7bd0ff]/15 px-2.5 py-1.5 rounded-lg transition-all">
                        {scan.status === "ready" || scan.status === "flagged" ? "Review" : "View"}
                        <ChevronRight size={12} />
                    </button>
                ) : (
                    <button className="text-[#dce1fb]/20 text-xs px-2.5 py-1.5 rounded-lg cursor-default">
                        —
                    </button>
                )}
            </div>
        </div>
    );
}
