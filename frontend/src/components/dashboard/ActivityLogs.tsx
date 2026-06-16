import { Clock, AlertTriangle, ShieldCheck, Upload, CheckCircle2 } from "lucide-react";

interface ActivityLogItem {
	time: string;
	message: string;
	type: "flagged" | "reviewed" | "uploaded" | "complete";
}

const ACTIVITY_ICON: Record<ActivityLogItem["type"], { icon: React.ReactNode; color: string; bg: string }> = {
	flagged: { icon: <AlertTriangle size={12} />, color: "text-rose-400 border-rose-500/20", bg: "bg-rose-500/5" },
	reviewed: { icon: <ShieldCheck size={12} />, color: "text-emerald-400 border-emerald-500/20", bg: "bg-emerald-500/5" },
	uploaded: { icon: <Upload size={12} />, color: "text-brand-primary border-brand-primary/20", bg: "bg-brand-primary/5" },
	complete: { icon: <CheckCircle2 size={12} />, color: "text-brand-text-muted/60 border-brand-border/40", bg: "bg-brand-card/40" },
};

const ACTIVITY_LOG: ActivityLogItem[] = [
	{ time: "10:18 AM", message: "SCN-00845 reviewed and signed by you", type: "reviewed" },
	{ time: "10:02 AM", message: "SCN-00844 analysis complete — Normal", type: "complete" },
	{ time: "09:45 AM", message: "SCN-00843 flagged — possible pneumonia (71%)", type: "flagged" },
	{ time: "09:31 AM", message: "SCN-00842 uploaded by Dr. Adeyemi", type: "uploaded" },
	{ time: "09:14 AM", message: "SCN-00841 flagged URGENT — pneumonia (94%)", type: "flagged" },
	{ time: "08:55 AM", message: "SCN-00840 reviewed and signed by you", type: "reviewed" },
];

export function ActivityLog() {
	return (
		<div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
			<div className="flex items-center justify-between mb-5 border-b border-brand-border/40 pb-3">
				<h3 className="text-brand-text text-sm font-bold font-display">Activity Log</h3>
				<Clock size={14} className="text-brand-text-muted/40" />
			</div>
			<div className="space-y-4">
				{ACTIVITY_LOG.map((item, i) => {
					const cfg = ACTIVITY_ICON[item.type];
					return (
						<div key={i} className="flex items-start gap-3.5 group/item">
							<div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${cfg.color} ${cfg.bg} group-hover/item:scale-105 transition-transform duration-200`}>
								{cfg.icon}
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-brand-text-muted text-xs leading-snug">{item.message}</p>
								<p className="text-brand-text-muted/40 text-[9px] uppercase tracking-wider font-bold mt-1">{item.time}</p>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

