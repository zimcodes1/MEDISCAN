interface ImpressionBlockProps {
	primaryImpression: string;
	secondaryFindings: string;
	impressionNarrative: string;
	onPrimaryImpressionChange: (impression: string) => void;
	onSecondaryFindingsChange: (findings: string) => void;
	onImpressionNarrativeChange: (narrative: string) => void;
	disabled?: boolean;
}

export default function ImpressionBlock({
	primaryImpression,
	secondaryFindings,
	impressionNarrative,
	onPrimaryImpressionChange,
	onSecondaryFindingsChange,
	onImpressionNarrativeChange,
	disabled = false,
}: ImpressionBlockProps) {
	return (
		<div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
			<h2 className="text-lg font-bold text-brand-text mb-6 font-display">Block 2 — Impression</h2>

			{/* Primary Impression */}
			<div className="mb-6">
				<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
					Primary Impression
				</label>
				<select
					value={primaryImpression}
					onChange={(e) => onPrimaryImpressionChange(e.target.value)}
					disabled={disabled}
					className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<option value="">Select primary impression...</option>
					<option value="normal">Normal</option>
					<option value="pneumonia-bacterial">Pneumonia (Bacterial)</option>
					<option value="pneumonia-viral">Pneumonia (Viral)</option>
					<option value="tuberculosis">Tuberculosis</option>
					<option value="cardiomegaly">Cardiomegaly</option>
					<option value="lung-nodule-mass">Lung Nodule / Mass</option>
					<option value="pleural-effusion">Pleural Effusion</option>
					<option value="other">Other</option>
				</select>
			</div>

			{/* Secondary Findings */}
			<div className="mb-6">
				<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
					Secondary Findings (Optional)
				</label>
				<input
					type="text"
					value={secondaryFindings}
					onChange={(e) => onSecondaryFindingsChange(e.target.value)}
					disabled={disabled}
					placeholder="Any incidental findings..."
					className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300 placeholder-brand-text-muted/40 disabled:opacity-50 disabled:cursor-not-allowed"
				/>
			</div>

			{/* Impression Narrative */}
			<div>
				<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
					Impression Narrative
				</label>
				<textarea
					value={impressionNarrative}
					onChange={(e) => onImpressionNarrativeChange(e.target.value)}
					disabled={disabled}
					placeholder="Free text summary of overall impression..."
					rows={6}
					className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300 resize-none placeholder-brand-text-muted/40 disabled:opacity-50 disabled:cursor-not-allowed"
				/>
			</div>
		</div>
	);
}
