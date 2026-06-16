import {
	Activity,
	AlertTriangle,
	CheckCircle2,
	ChevronRight,
	ImageIcon,
	Info,
} from "lucide-react";
import { ActivityLog } from "../components/dashboard/ActivityLogs";
import SystemStats from "../components/dashboard/SystemStats";
import StatCard from "../components/dashboard/StatCard";
import ScanRow from "../components/dashboard/ScanRow";
import { SCAN_QUEUE } from "../utils/DummyData";
import { useEffect } from "react";

//Main Dashboard Page

export default function DashboardPage() {
	// Set Page Title
	useEffect(() => {
		document.title = "Dashboard - Mediscan AI";
	}, []);

	const pending = SCAN_QUEUE.filter((s) => s.status !== "reviewed");
	const urgent = SCAN_QUEUE.filter(
		(s) => s.priority === "urgent" && s.status !== "reviewed",
	);
	const flagged = SCAN_QUEUE.filter((s) => s.status === "flagged");
	const reviewed = SCAN_QUEUE.filter((s) => s.status === "reviewed");

	return (
		<div className="p-4 sm:p-8 space-y-7">
			{/* Page Header */}
			<div>
				<h1 className="text-3xl font-extrabold text-brand-text tracking-tight font-display">
					Good morning, Dr. Nwosu
				</h1>
				<p className="text-brand-text-muted text-sm mt-1">
					{new Date().toLocaleDateString("en-NG", {
						weekday: "long",
						day: "numeric",
						month: "long",
						year: "numeric",
					})}
					{" · "}Lagos University Teaching Hospital
				</p>
			</div>

			{/* Compact Disclaimer Banner */}
			<div className="flex items-center gap-2.5 bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-2.5 text-amber-500 text-xs">
				<AlertTriangle size={14} className="shrink-0" />
				<p className="leading-snug">
					<span className="font-bold uppercase tracking-wider mr-1">
						AI Support Notice:
					</span>
					All findings are preliminary clinical decision-support data and
					must be verified by a clinician.
				</p>
			</div>

			{/* Stat Cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
				<StatCard
					label="Pending Review"
					value={pending.length}
					sub="In your queue"
					icon={<ImageIcon size={18} />}
					accent="blue"
				/>
				<StatCard
					label="Urgent"
					value={urgent.length}
					sub="High priority"
					icon={<AlertTriangle size={18} />}
					accent="amber"
				/>
				<StatCard
					label="AI Flagged"
					value={flagged.length}
					sub="Possible findings"
					icon={<Activity size={18} />}
					accent="red"
				/>
				<StatCard
					label="Reviewed Today"
					value={reviewed.length}
					sub="Signed off"
					icon={<CheckCircle2 size={18} />}
					accent="green"
				/>
			</div>

			{/* Main Content Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
				{/* Scan Queue — 2 cols */}
				<div className="lg:col-span-2 max-sm:w-full max-sm:overflow-x-scroll sm:overflow-hidden ">
					<div className="max-sm:w-150 bg-brand-card/60 backdrop-blur-md rounded-2xl border border-brand-border/60 overflow-hidden shadow-lg">
						<div className="flex items-center justify-between px-6 py-5 border-b border-brand-border/40">
							<div>
								<h2 className="text-brand-text text-base font-bold font-display">
									Scan Queue
								</h2>
								<div className="flex items-center gap-2 mt-1">
									<p className="text-brand-text-muted text-xs">
										{pending.length} pending · {urgent.length} urgent
									</p>
									<span className="w-1 h-1 bg-brand-text-muted/40 rounded-full" />
									<p className="hidden sm:flex text-[10px] text-brand-primary font-bold  items-center gap-1">
										<Info size={11} /> Click row to review
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<button className="text-brand-text-muted text-xs font-semibold hover:text-brand-primary transition-colors px-3 py-1.5 rounded-xl hover:bg-brand-border/40">
									All
								</button>
								<button className="text-rose-400 text-xs font-extrabold bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl active:scale-95 transition-all">
									Urgent first
								</button>
							</div>
						</div>

						{/* Table Head */}
						<div className="grid grid-cols-12 gap-4 px-6 py-3.5 text-brand-text-muted/40 text-[10px] uppercase font-bold tracking-widest border-b border-brand-border/40">
							<div className="col-span-4">Patient</div>
							<div className="col-span-2">Priority</div>
							<div className="col-span-3">Status</div>
							<div className="col-span-3 pl-2">AI Verdict</div>
						</div>

						{/* Rows */}
						<div className="p-4 space-y-2">
							{SCAN_QUEUE.map((scan) => (
								<ScanRow key={scan.id} scan={scan} />
							))}
						</div>

						<div className="px-6 py-4.5 border-t border-brand-border/40 bg-brand-card/30 flex justify-between items-center">
							<p className="text-brand-text-muted/50 text-xs font-medium">
								Showing {SCAN_QUEUE.length} scans
							</p>
							<button className="text-brand-primary text-xs font-bold hover:text-brand-primary-hover flex items-center gap-1 transition-colors">
								View full queue <ChevronRight size={14} />
							</button>
						</div>
					</div>
				</div>

				{/* Right column */}
				<div className="space-y-6">
					<SystemStats />
					<ActivityLog />
				</div>
			</div>
		</div>
	);
}
