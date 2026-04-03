interface FindingsBlockProps {
	lungFields: string[];
	affectedSide: string;
	severity: string;
	detailedFindings: string;
	onLungFieldsChange: (fields: string[]) => void;
	onAffectedSideChange: (side: string) => void;
	onSeverityChange: (severity: string) => void;
	onDetailedFindingsChange: (findings: string) => void;
	disabled?: boolean;
}

export default function FindingsBlock({
	lungFields,
	affectedSide,
	severity,
	detailedFindings,
	onLungFieldsChange,
	onAffectedSideChange,
	onSeverityChange,
	onDetailedFindingsChange,
	disabled = false,
}: FindingsBlockProps) {
	const lungFieldOptions = [
		"Clear",
		"Consolidation present",
		"Increased opacity",
		"Pleural effusion",
		"Other",
	];

	const handleCheckboxChange = (option: string) => {
		if (disabled) return;
		if (lungFields.includes(option)) {
			onLungFieldsChange(lungFields.filter((f) => f !== option));
		} else {
			onLungFieldsChange([...lungFields, option]);
		}
	};

	return (
		<div className="bg-[#151b2d] rounded-xl p-6">
			<h2 className="text-xl font-bold text-[#dce1fb] mb-6">Block 1 — Findings</h2>

			{/* Lung Fields */}
			<div className="mb-6">
				<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-3">
					Lung Fields
				</label>
				<div className="space-y-2">
					{lungFieldOptions.map((option) => (
						<label
							key={option}
							className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
								disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-[#191f31]"
							}`}
						>
							<input
								type="checkbox"
								checked={lungFields.includes(option)}
								onChange={() => handleCheckboxChange(option)}
								disabled={disabled}
								className="w-4 h-4 rounded border-[#2e3447] bg-[#191f31] text-[#7bd0ff] focus:ring-[#7bd0ff] focus:ring-offset-0"
							/>
							<span className="text-[#dce1fb]">{option}</span>
						</label>
					))}
				</div>
			</div>

			{/* Affected Side */}
			<div className="mb-6">
				<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-3">
					Affected Side
				</label>
				<div className="grid grid-cols-4 gap-3">
					{["Left", "Right", "Bilateral", "N/A"].map((side) => (
						<button
							key={side}
							onClick={() => !disabled && onAffectedSideChange(side)}
							disabled={disabled}
							className={`p-3 rounded-lg border-2 transition-all ${
								affectedSide === side
									? "border-[#7bd0ff] bg-[#191f31] text-[#7bd0ff]"
									: "border-[#2e3447] bg-transparent text-[#dce1fb] hover:border-[#7bd0ff]/50"
							} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
						>
							{side}
						</button>
					))}
				</div>
			</div>

			{/* Severity */}
			<div className="mb-6">
				<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
					Severity
				</label>
				<select
					value={severity}
					onChange={(e) => onSeverityChange(e.target.value)}
					disabled={disabled}
					className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<option value="">Select severity...</option>
					<option value="mild">Mild</option>
					<option value="moderate">Moderate</option>
					<option value="severe">Severe</option>
				</select>
			</div>

			{/* Detailed Findings */}
			<div>
				<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
					Detailed Findings
				</label>
				<textarea
					value={detailedFindings}
					onChange={(e) => onDetailedFindingsChange(e.target.value)}
					disabled={disabled}
					placeholder="Describe what you observe in the image..."
					rows={6}
					className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
				/>
			</div>
		</div>
	);
}
