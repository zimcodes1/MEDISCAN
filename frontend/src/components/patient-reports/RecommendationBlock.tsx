interface RecommendationBlockProps {
	recommendedAction: string;
	followUpTimeframe: string;
	followUpUnit: string;
	additionalNotes: string;
	onRecommendedActionChange: (action: string) => void;
	onFollowUpTimeframeChange: (timeframe: string) => void;
	onFollowUpUnitChange: (unit: string) => void;
	onAdditionalNotesChange: (notes: string) => void;
	disabled?: boolean;
}

export default function RecommendationBlock({
	recommendedAction,
	followUpTimeframe,
	followUpUnit,
	additionalNotes,
	onRecommendedActionChange,
	onFollowUpTimeframeChange,
	onFollowUpUnitChange,
	onAdditionalNotesChange,
	disabled = false,
}: RecommendationBlockProps) {
	const showFollowUpFields = recommendedAction === "follow-up-xray";

	return (
		<div className="bg-[#151b2d] rounded-xl p-6">
			<h2 className="text-xl font-bold text-[#dce1fb] mb-6">Block 3 — Recommendation</h2>

			{/* Recommended Action */}
			<div className="mb-6">
				<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
					Recommended Action
				</label>
				<select
					value={recommendedAction}
					onChange={(e) => onRecommendedActionChange(e.target.value)}
					disabled={disabled}
					className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<option value="">Select recommended action...</option>
					<option value="no-action">No further action</option>
					<option value="follow-up-xray">Follow-up X-ray</option>
					<option value="ct-scan">CT scan advised</option>
					<option value="immediate-review">Immediate clinical review</option>
					<option value="refer-specialist">Refer to specialist</option>
				</select>
			</div>

			{/* Follow-up Timeframe (conditional) */}
			{showFollowUpFields && (
				<div className="mb-6">
					<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
						Follow-up Timeframe
					</label>
					<div className="grid grid-cols-2 gap-3">
						<input
							type="number"
							value={followUpTimeframe}
							onChange={(e) => onFollowUpTimeframeChange(e.target.value)}
							disabled={disabled}
							placeholder="Number"
							min="1"
							className="bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						/>
						<select
							value={followUpUnit}
							onChange={(e) => onFollowUpUnitChange(e.target.value)}
							disabled={disabled}
							className="bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<option value="days">Days</option>
							<option value="weeks">Weeks</option>
							<option value="months">Months</option>
						</select>
					</div>
				</div>
			)}

			{/* Additional Notes */}
			<div>
				<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
					Additional Notes
				</label>
				<textarea
					value={additionalNotes}
					onChange={(e) => onAdditionalNotesChange(e.target.value)}
					disabled={disabled}
					placeholder="Any other clinical guidance..."
					rows={4}
					className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
				/>
			</div>
		</div>
	);
}
