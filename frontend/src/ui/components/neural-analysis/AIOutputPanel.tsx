import {
	AlertTriangle,
	CheckCircle,
	User,
} from "lucide-react";

interface AIOutputPanelProps {
	prediction: "normal" | "pneumonia";
	confidence: number;
	gradCamSummary: string;
	patientName: string;
	scanId: string;
	dateUploaded: string;
	projection: string;
	uploadedBy: string;
	assignedRadiologist: string;
	reportStatus: "pending" | "completed";
	priority: "routine" | "urgent";
	preAnalysisNotes?: string;
	onWriteReport: () => void;
	canWriteReport: boolean;
}

export default function AIOutputPanel({
	prediction,
	confidence,
	gradCamSummary,
	patientName,
	scanId,
	dateUploaded,
	projection,
	uploadedBy,
	assignedRadiologist,
	reportStatus,
	priority,
	preAnalysisNotes,
	onWriteReport,
	canWriteReport,
}: AIOutputPanelProps) {
	return (
		<div className="space-y-5">
			{/* Disclaimer Banner */}
			<div className="bg-amber-500/5 border border-amber-500/25 p-4 rounded-xl flex items-start gap-3">
				<AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5 animate-pulse" />
				<div>
					<p className="text-amber-500 text-xs font-bold uppercase tracking-wider mb-0.5">
						Clinician Review Required
					</p>
					<p className="text-brand-text-muted text-[11px] font-medium leading-relaxed">
						This output is AI-generated and does not constitute an official medical diagnosis.
					</p>
				</div>
			</div>

			{/* AI Prediction */}
			<div className="border border-brand-border/40 p-4 rounded-xl bg-brand-card/25">
				<h3 className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2.5">
					AI Prediction
				</h3>
				<div
					className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
						prediction === "normal"
							? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
							: "bg-rose-500/5 border-rose-500/20 text-rose-400"
					}`}
				>
					{prediction === "normal" ? (
						<CheckCircle size={18} className="shrink-0" />
					) : (
						<AlertTriangle size={18} className="shrink-0" />
					)}
					<span className="font-extrabold text-xs tracking-wider uppercase">
						{prediction === "normal" ? "Normal Scan" : "Possible Pneumonia"}
					</span>
				</div>
			</div>

			{/* Confidence Score */}
			<div className="border border-brand-border/40 p-4 rounded-xl bg-brand-card/25">
				<h3 className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2">
					Confidence Score
				</h3>
				<div className="flex items-baseline justify-between mb-2">
					<span className="text-3xl font-extrabold text-brand-primary tracking-tight font-display">
						{confidence}%
					</span>
					<span className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider">
						{confidence >= 90 ? "High Confidence" : confidence >= 70 ? "Moderate" : "Low"}
					</span>
				</div>
				<div className="w-full bg-brand-bg/80 h-2.5 rounded-full overflow-hidden border border-brand-border/30 p-0.5">
					<div
						className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full shadow-[0_0_10px_rgba(0,210,255,0.4)] transition-all duration-500"
						style={{ width: `${confidence}%` }}
					/>
				</div>
			</div>

			{/* Grad-CAM Summary */}
			<div className="border border-brand-border/40 p-4 rounded-xl bg-brand-card/25">
				<h3 className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2.5">
					Model Attention Analysis
				</h3>
				<p className="text-brand-text text-xs leading-relaxed font-semibold">
					{gradCamSummary}
				</p>
			</div>

			{/* Scan Metadata */}
			<div className="border border-brand-border/40 p-4 rounded-xl bg-brand-card/25">
				<h3 className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-3.5">
					Scan Metadata
				</h3>
				<div className="space-y-3">
					<div className="flex justify-between items-center border-b border-brand-border/30 pb-2">
						<span className="text-brand-text-muted text-xs font-medium">Patient</span>
						<span className="text-brand-text font-bold text-xs">{patientName}</span>
					</div>
					<div className="flex justify-between items-center border-b border-brand-border/30 pb-2">
						<span className="text-brand-text-muted text-xs font-medium">Scan ID</span>
						<span className="text-brand-primary font-mono text-xs font-bold">{scanId}</span>
					</div>
					<div className="flex justify-between items-center border-b border-brand-border/30 pb-2">
						<span className="text-brand-text-muted text-xs font-medium">Date Uploaded</span>
						<span className="text-brand-text font-bold text-xs">{dateUploaded}</span>
					</div>
					<div className="flex justify-between items-center border-b border-brand-border/30 pb-2">
						<span className="text-brand-text-muted text-xs font-medium">Projection</span>
						<span className="text-brand-text font-bold text-xs">{projection}</span>
					</div>
					<div className="flex justify-between items-center">
						<span className="text-brand-text-muted text-xs font-medium">Uploaded By</span>
						<span className="text-brand-text font-bold text-xs">{uploadedBy}</span>
					</div>
				</div>
			</div>

			{/* Assignment Info */}
			<div className="border border-brand-border/40 p-4 rounded-xl bg-brand-card/25">
				<h3 className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-3.5">
					Case Assignment
				</h3>
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="w-6 h-6 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
								<User size={12} className="text-brand-primary" />
							</div>
							<span className="text-brand-text text-xs font-bold">{assignedRadiologist}</span>
						</div>
						<span
							className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${
								reportStatus === "pending"
									? "bg-amber-500/5 border-amber-500/20 text-amber-500"
									: "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
							}`}
						>
							{reportStatus === "pending"
								? "Awaiting Report"
								: "Report Complete"}
						</span>
					</div>
					
					<div className="flex items-center justify-between border-t border-brand-border/30 pt-3">
						<span className="text-brand-text-muted text-xs font-medium">Priority Status</span>
						<span
							className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${
								priority === "urgent"
									? "bg-rose-500/5 border-rose-500/20 text-rose-400 animate-pulse"
									: "bg-brand-primary/5 border-brand-primary/20 text-brand-primary"
							}`}
						>
							{priority === "urgent" ? "Urgent" : "Routine"}
						</span>
					</div>
				</div>
			</div>

			{/* Pre-Analysis Notes */}
			{preAnalysisNotes && (
				<div className="border border-brand-border/40 p-4 rounded-xl bg-brand-card/25">
					<h3 className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2">
						Pre-Analysis Notes
					</h3>
					<p className="text-brand-text text-xs leading-relaxed italic font-medium">
						"{preAnalysisNotes}"
					</p>
				</div>
			)}

			{/* Write Report Button */}
			{canWriteReport && (
				<button
					onClick={onWriteReport}
					className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg py-3.5 rounded-xl font-extrabold text-sm hover:shadow-[0_0_20px_rgba(0,210,255,0.25)] hover:opacity-95 active:scale-95 transition-all duration-300"
				>
					Write Report
				</button>
			)}
		</div>
	);
}
