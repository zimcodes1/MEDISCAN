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
		<div className="bg-[#151b2d] rounded-xl p-6">
			<h2 className="text-xl font-bold text-[#dce1fb] mb-6">Block 2 — Impression</h2>

			{/* Primary Impression */}
			<div className="mb-6">
				<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
					Primary Impression
				</label>
				<select
					value={primaryImpression}
					onChange={(e) => onPrimaryImpressionChange(e.target.value)}
					disabled={disabled}
					className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<option value="">Select primary impression...</option>
					<option value="normal">Normal</option>
					<option value="pneumonia-bacterial">Pneumonia (Bacterial)</option>
					<option value="pneumonia-viral">Pneumonia (Viral)</option>
					<option value="pleural-effusion">Pleural Effusion</option>
					<option value="cardiomegaly">Cardiomegaly</option>
					<option value="other">Other</option>
				</select>
			</div>

			{/* Secondary Findings */}
			<div className="mb-6">
				<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
					Secondary Findings (Optional)
				</label>
				<input
					type="text"
					value={secondaryFindings}
					onChange={(e) => onSecondaryFindingsChange(e.target.value)}
					disabled={disabled}
					placeholder="Any incidental findings..."
					className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
				/>
			</div>

			{/* Impression Narrative */}
			<div>
				<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
					Impression Narrative
				</label>
				<textarea
					value={impressionNarrative}
					onChange={(e) => onImpressionNarrativeChange(e.target.value)}
					disabled={disabled}
					placeholder="Free text summary of overall impression..."
					rows={6}
					className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
				/>
			</div>
		</div>
	);
}
