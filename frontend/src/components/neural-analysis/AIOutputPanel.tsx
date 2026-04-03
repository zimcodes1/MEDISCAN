import {
	AlertTriangle,
	CheckCircle,
	Clock,
	User,
	Paperclip,
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
		<div className="space-y-6">
			{/* Disclaimer Banner */}
			<div className="bg-[#ffb95f]/10 border-l-4 border-[#ffb95f] p-4 rounded-lg">
				<p className="text-[#ffb95f] text-sm font-semibold">
					⚠ Possible Findings — Review Required by a Qualified Clinician
				</p>
				<p className="text-[#dce1fb]/70 text-xs mt-1">
					This output does not constitute a medical diagnosis.
				</p>
			</div>

			{/* AI Prediction */}
			<div className="bg-[#151b2d] rounded-xl p-0">
				<h3 className="text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-3">
					AI Prediction
				</h3>
				<div
					className={`flex items-center gap-3 p-4 rounded-lg ${
						prediction === "normal" ? "bg-[#4ade80]/10" : "bg-[#ffb95f]/10"
					}`}
				>
					{prediction === "normal" ? (
						<CheckCircle size={20} className="text-[#4ade80]" />
					) : (
						<AlertTriangle size={20} className="text-[#ffb95f]" />
					)}
					<div>
						<p
							className={`font-bold ${
								prediction === "normal" ? "text-[#4ade80]" : "text-[#ffb95f]"
							}`}
						>
							{prediction === "normal" ? "Normal" : "Possible Pneumonia"}
						</p>
					</div>
				</div>
			</div>

			{/* Confidence Score */}
			<div className="bg-[#151b2d] rounded-xl">
				<h3 className="text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-3">
					Confidence Score
				</h3>
				<div className="flex items-center gap-4 mb-2">
					<span className="text-4xl font-bold text-[#7bd0ff]">
						{confidence}%
					</span>
				</div>
				<div className="w-full bg-[#2e3447] h-2 rounded-full overflow-hidden">
					<div
						className="h-full bg-[#7bd0ff] transition-all"
						style={{ width: `${confidence}%` }}
					/>
				</div>
			</div>

			{/* Grad-CAM Summary */}
			<div className="bg-[#151b2d] rounded-xl">
				<h3 className="text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-3">
					Model Attention Analysis
				</h3>
				<p className="text-[#dce1fb]">{gradCamSummary}</p>
			</div>

			{/* Scan Metadata */}
			<div className="bg-[#151b2d] rounded-xl">
				<h3 className="text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-4">
					Scan Metadata
				</h3>
				<div className="space-y-3">
					<div className="flex justify-between">
						<span className="text-[#dce1fb]/70 text-sm">Patient</span>
						<span className="text-[#dce1fb] font-semibold">{patientName}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-[#dce1fb]/70 text-sm">Scan ID</span>
						<span className="text-[#dce1fb] font-mono text-sm">{scanId}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-[#dce1fb]/70 text-sm">Date Uploaded</span>
						<span className="text-[#dce1fb]">{dateUploaded}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-[#dce1fb]/70 text-sm">Projection</span>
						<span className="text-[#dce1fb]">{projection}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-[#dce1fb]/70 text-sm">Uploaded By</span>
						<span className="text-[#dce1fb]">{uploadedBy}</span>
					</div>
				</div>
			</div>

			{/* Assignment Info */}
			<div className="bg-[#151b2d] rounded-xl">
				<h3 className="text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-4">
					Assignment
				</h3>
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<User size={16} className="text-[#7bd0ff]" />
							<span className="text-[#dce1fb]">{assignedRadiologist}</span>
						</div>
						<span
							className={`px-3 py-1 rounded-full text-xs font-semibold ${
								reportStatus === "pending"
									? "bg-[#ffb95f]/10 text-[#ffb95f]"
									: "bg-[#4ade80]/10 text-[#4ade80]"
							}`}
						>
							{reportStatus === "pending"
								? "Awaiting Report"
								: "Report Complete"}
						</span>
					</div>
					<div className="flex items-center gap-2">
						<Clock
							size={16}
							className={
								priority === "urgent" ? "text-[#ffb95f]" : "text-[#7bd0ff]"
							}
						/>
						<span
							className={`px-3 py-1 rounded-full text-xs font-semibold ${
								priority === "urgent"
									? "bg-[#ffb95f]/10 text-[#ffb95f]"
									: "bg-[#7bd0ff]/10 text-[#7bd0ff]"
							}`}
						>
							{priority === "urgent" ? "Urgent" : "Routine"}
						</span>
					</div>
				</div>
			</div>

			{/* Pre-Analysis Notes */}
			{preAnalysisNotes && (
				<div className="bg-[#151b2d] rounded-xl p-2">
					<h3 className="text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-3">
						Pre-Analysis Notes
					</h3>
					<p className="text-[#dce1fb] text-sm">{preAnalysisNotes}</p>
				</div>
			)}

			{/* Write Report Button */}
			{canWriteReport && (
				<button
					onClick={onWriteReport}
					className="w-full bg-[#7bd0ff] text-[#0c1324] py-4 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
				>
					Write Report
				</button>
			)}
		</div>
	);
}
