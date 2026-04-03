import { Clock, AlertTriangle, ShieldCheck, Upload, CheckCircle2 } from "lucide-react";

//Dummy Data

interface ActivityLogItem {
	time: string;
	message: string;
	type: "flagged" | "reviewed" | "uploaded" | "complete";
}

const ACTIVITY_ICON: Record<ActivityLogItem["type"], { icon: React.ReactNode; color: string }> = {
	flagged: { icon: <AlertTriangle size={13} />, color: "text-[#f08080]" },
	reviewed: { icon: <ShieldCheck size={13} />, color: "text-[#5dca9e]" },
	uploaded: { icon: <Upload size={13} />, color: "text-[#7bd0ff]" },
	complete: { icon: <CheckCircle2 size={13} />, color: "text-[#dce1fb]/50" },
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
		<div className="bg-[#0f1520] rounded-xl p-5 border border-[#1e2740]">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-[#dce1fb] text-sm font-semibold">Activity Log</h3>
				<Clock size={14} className="text-[#dce1fb]/30" />
			</div>
			<div className="space-y-3">
				{ACTIVITY_LOG.map((item, i) => {
					const cfg = ACTIVITY_ICON[item.type];
					return (
						<div key={i} className="flex items-start gap-3">
							<div className={`mt-0.5 flex-shrink-0 ${cfg.color}`}>{cfg.icon}</div>
							<div className="flex-1 min-w-0">
								<p className="text-[#dce1fb]/70 text-xs leading-snug">{item.message}</p>
								<p className="text-[#dce1fb]/25 text-[10px] mt-0.5">{item.time}</p>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
