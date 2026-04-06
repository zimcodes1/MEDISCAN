import { AlertTriangle, CheckCircle } from "lucide-react";

interface ContextBarProps {
	patientName: string;
	age: number;
	sex: string;
	scanDate: string;
	projection: string;
	aiPrediction: "normal" | "pneumonia";
	confidence: number;
}

export default function ContextBar({
	patientName,
	age,
	sex,
	scanDate,
	projection,
	aiPrediction,
	confidence,
}: ContextBarProps) {
	return (
		<div className="bg-[#151b2d] rounded-xl p-6 mb-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-wrap items-center gap-x-6 gap-y-3">
					<div>
						<p className="text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-1">Patient</p>
						<p className="text-[#dce1fb] font-semibold text-lg">{patientName}</p>
					</div>
					<div className="hidden sm:block w-px h-10 bg-[#2e3447]" />
					<div>
						<p className="text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-1">Demographics</p>
						<p className="text-[#dce1fb]">
							{age}y · {sex}
						</p>
					</div>
					<div className="hidden sm:block w-px h-10 bg-[#2e3447]" />
					<div>
						<p className="text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-1">Scan Date</p>
						<p className="text-[#dce1fb]">{scanDate}</p>
					</div>
					<div className="hidden sm:block w-px h-10 bg-[#2e3447]" />
					<div>
						<p className="text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-1">Projection</p>
						<p className="text-[#dce1fb]">{projection}</p>
					</div>
				</div>
				<div className="w-full sm:w-auto flex items-center gap-3">
					{aiPrediction === "normal" ? (
						<CheckCircle size={24} className="text-[#4ade80]" />
					) : (
						<AlertTriangle size={24} className="text-[#ffb95f]" />
					)}
					<div>
						<p className="text-[#dce1fb]/70 text-xs uppercase tracking-wide">AI Prediction</p>
						<p
							className={`font-semibold ${
								aiPrediction === "normal" ? "text-[#4ade80]" : "text-[#ffb95f]"
							}`}
						>
							{aiPrediction === "normal" ? "Normal" : "Possible Pneumonia"} · {confidence}%
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
