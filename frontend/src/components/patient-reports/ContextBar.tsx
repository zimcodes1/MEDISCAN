import { AlertTriangle, CheckCircle } from "lucide-react";

interface AIFinding {
	condition: string;
	prediction: "normal" | "detected";
	confidence: number;
	isExperimental?: boolean;
}

interface ContextBarProps {
	patientName: string;
	age: number;
	sex: string;
	scanDate: string;
	projection: string;
	aiFindings: AIFinding[];
}

export default function ContextBar({
	patientName,
	age,
	sex,
	scanDate,
	projection,
	aiFindings,
}: ContextBarProps) {
	const detectedFindings = aiFindings.filter(f => f.prediction === "detected");
	const hasFindings = detectedFindings.length > 0;

	return (
		<div className="glass-panel rounded-2xl p-6 mb-6 relative overflow-hidden group">
			<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
				<div className="flex flex-wrap items-center gap-6 text-sm">
					<div>
						<p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">Patient</p>
						<p className="text-brand-text font-bold text-base">{patientName}</p>
					</div>
					<div className="hidden sm:block w-px h-8 bg-brand-border/40" />
					<div>
						<p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">Demographics</p>
						<p className="text-brand-text font-semibold">
							{age}y · {sex}
						</p>
					</div>
					<div className="hidden sm:block w-px h-8 bg-brand-border/40" />
					<div>
						<p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">Scan Date</p>
						<p className="text-brand-text font-semibold">{scanDate}</p>
					</div>
					<div className="hidden sm:block w-px h-8 bg-brand-border/40" />
					<div>
						<p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">Projection</p>
						<p className="text-brand-text font-semibold">{projection}</p>
					</div>
				</div>
				
				<div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shrink-0 ${
					hasFindings 
						? "bg-rose-500/5 border-rose-500/20 text-rose-400" 
						: "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
				}`}>
					{hasFindings ? (
						<AlertTriangle size={18} className="shrink-0" />
					) : (
						<CheckCircle size={18} className="shrink-0" />
					)}
					<div>
						<p className="text-brand-text-muted text-[9px] font-bold uppercase tracking-wider">AI Panel Summary</p>
						<p className="font-extrabold text-xs tracking-wide uppercase mt-0.5">
							{hasFindings 
								? `Detected: ${detectedFindings.map(f => f.condition).join(", ")}`
								: "No Anomalies Detected"}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
