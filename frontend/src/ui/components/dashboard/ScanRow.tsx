import { AlertTriangle, CheckCircle2, Hourglass, RefreshCw, ShieldCheck, ChevronRight } from "lucide-react";

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

const STATUS_CONFIG: Record<ScanStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
    flagged: {
        label: "Flagged",
        color: "text-rose-400",
        bg: "bg-rose-500/5",
        border: "border-rose-500/20",
        icon: <AlertTriangle size={13} />,
    },
    processing: {
        label: "Analysing",
        color: "text-amber-400",
        bg: "bg-amber-500/5",
        border: "border-amber-500/20",
        icon: <RefreshCw size={13} className="animate-spin" />,
    },
    ready: {
        label: "Ready",
        color: "text-emerald-400",
        bg: "bg-emerald-500/5",
        border: "border-emerald-500/20",
        icon: <CheckCircle2 size={13} />,
    },
    reviewed: {
        label: "Reviewed",
        color: "text-brand-text-muted/65",
        bg: "bg-brand-card/40",
        border: "border-brand-border/40",
        icon: <ShieldCheck size={13} />,
    },
};

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

export default function ScanRow({ scan }: ScanRowProps) {
    const status = STATUS_CONFIG[scan.status];
    const isReviewed = scan.status === "reviewed";
    const initials = getInitials(scan.patientName);
    
    // AI Verdict style configuration
    const confidenceColor = scan.confidence !== null && scan.confidence >= 80 
        ? "text-rose-400 border-rose-500/20 bg-rose-500/5" 
        : scan.confidence !== null && scan.confidence >= 50 
            ? "text-amber-400 border-amber-500/20 bg-amber-500/5" 
            : "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";

    return (
        <div
            className={`grid grid-cols-12 gap-4 items-center px-5 py-4 rounded-xl border border-brand-border/40 transition-all duration-300 cursor-pointer ${
                isReviewed 
                    ? "bg-brand-card/20 opacity-50 hover:opacity-75" 
                    : "bg-brand-card/50 hover:bg-brand-card/80 hover:border-brand-primary/30 hover:shadow-[0_4px_20px_rgba(0,210,255,0.04)]"
            }`}
        >
            {/* Patient Info with Avatar */}
            <div className="col-span-4 flex items-center gap-3.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${
                    isReviewed 
                        ? "bg-brand-card/30 border-brand-border/50 text-brand-text-muted" 
                        : "bg-brand-primary/10 border-brand-primary/20 text-brand-primary"
                }`}>
                    {initials}
                </div>
                <div className="min-w-0">
                    <p className={`text-sm font-bold truncate ${isReviewed ? "text-brand-text-muted" : "text-brand-text"}`}>
                        {scan.patientName}
                    </p>
                    <p className="text-brand-text-muted/60 text-[10px] uppercase font-bold tracking-wider mt-0.5">
                        {scan.patientCode} · {scan.id}
                    </p>
                </div>
            </div>

            {/* Priority */}
            <div className="col-span-2">
                {scan.priority === "urgent" ? (
                    <span className="inline-flex items-center text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider">
                        Urgent
                    </span>
                ) : (
                    <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-lg bg-brand-card/60 text-brand-text-muted/70 border border-brand-border/40 uppercase tracking-wider">
                        Routine
                    </span>
                )}
            </div>

            {/* Status */}
            <div className="col-span-3">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border ${status.bg} ${status.border} ${status.color}`}>
                    {status.icon}
                    <span className="text-xs font-bold tracking-wide">{status.label}</span>
                </div>
            </div>

            {/* AI Verdict & Click Action */}
            <div className="col-span-3 flex items-center justify-between pl-2">
                {scan.confidence !== null && scan.prediction ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-extrabold ${confidenceColor}`}>
                        {scan.prediction} ({scan.confidence}%)
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 text-brand-text-muted/50 text-xs">
                        <Hourglass size={12} />
                        Analysing
                    </span>
                )}
                <ChevronRight size={16} className="text-brand-text-muted/40 group-hover:text-brand-primary transition-colors ml-2" />
            </div>
        </div>
    );
}

