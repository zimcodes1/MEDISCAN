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
		"Possible nodule/mass",
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
		<div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
			<h2 className="text-lg font-bold text-brand-text mb-6 font-display">Block 1 — Findings</h2>

			{/* Lung Fields */}
			<div className="mb-6">
				<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-3 font-display">
					Lung Fields
				</label>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
					{lungFieldOptions.map((option) => (
						<label
							key={option}
							className={`flex items-center gap-3 p-3 rounded-xl border border-brand-border/40 transition-all duration-300 ${
								disabled 
									? "cursor-not-allowed opacity-50 bg-transparent" 
									: "cursor-pointer bg-brand-card/25 hover:bg-brand-card/60 hover:border-brand-primary/45"
							}`}
						>
							<input
								type="checkbox"
								checked={lungFields.includes(option)}
								onChange={() => handleCheckboxChange(option)}
								disabled={disabled}
								className="w-4 h-4 rounded border-brand-border/80 bg-brand-card/60 text-brand-primary outline-none focus:ring-brand-primary/50 focus:border-brand-primary"
							/>
							<span className="text-brand-text text-sm font-semibold">{option}</span>
						</label>
					))}
				</div>
			</div>

			{/* Affected Side */}
			<div className="mb-6">
				<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-3 font-display">
					Affected Side
				</label>
				<div className="grid grid-cols-4 gap-3">
					{["Left", "Right", "Bilateral", "N/A"].map((side) => (
						<button
							key={side}
							type="button"
							onClick={() => !disabled && onAffectedSideChange(side)}
							disabled={disabled}
							className={`p-3 rounded-xl border text-xs font-bold transition-all duration-300 ${
								affectedSide === side
									? "border-brand-primary bg-brand-primary/10 text-brand-primary font-extrabold shadow-[0_0_15px_rgba(0,210,255,0.08)]"
									: "border-brand-border/60 bg-brand-card/30 text-brand-text-muted hover:border-brand-primary/40 hover:text-brand-text hover:bg-brand-card/75"
							} ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
						>
							{side}
						</button>
					))}
				</div>
			</div>

			{/* Severity */}
			<div className="mb-6">
				<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
					Severity
				</label>
				<select
					value={severity}
					onChange={(e) => onSeverityChange(e.target.value)}
					disabled={disabled}
					className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<option value="">Select severity...</option>
					<option value="mild">Mild</option>
					<option value="moderate">Moderate</option>
					<option value="severe">Severe</option>
				</select>
			</div>

			{/* Detailed Findings */}
			<div>
				<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
					Detailed Findings
				</label>
				<textarea
					value={detailedFindings}
					onChange={(e) => onDetailedFindingsChange(e.target.value)}
					disabled={disabled}
					placeholder="Describe what you observe in the image..."
					rows={6}
					className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300 resize-none placeholder-brand-text-muted/40 disabled:opacity-50 disabled:cursor-not-allowed"
				/>
			</div>
		</div>
	);
}
