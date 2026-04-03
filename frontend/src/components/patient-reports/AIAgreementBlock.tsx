interface AIAgreementBlockProps {
	agreement: string;
	disagreementReason: string;
	onAgreementChange: (agreement: string) => void;
	onDisagreementReasonChange: (reason: string) => void;
	disabled?: boolean;
}

export default function AIAgreementBlock({
	agreement,
	disagreementReason,
	onAgreementChange,
	onDisagreementReasonChange,
	disabled = false,
}: AIAgreementBlockProps) {
	const showReasonField = agreement === "partially-agree" || agreement === "disagree";

	return (
		<div className="bg-[#151b2d] rounded-xl p-6">
			<h2 className="text-xl font-bold text-[#dce1fb] mb-6">Block 4 — Agreement with AI</h2>

			{/* AI Assessment Agreement */}
			<div className="mb-6">
				<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-3">
					AI Assessment Agreement
				</label>
				<div className="grid grid-cols-3 gap-3">
					{[
						{ value: "agree", label: "Agree" },
						{ value: "partially-agree", label: "Partially Agree" },
						{ value: "disagree", label: "Disagree" },
					].map((option) => (
						<button
							key={option.value}
							onClick={() => !disabled && onAgreementChange(option.value)}
							disabled={disabled}
							className={`p-4 rounded-lg border-2 transition-all ${
								agreement === option.value
									? "border-[#7bd0ff] bg-[#191f31] text-[#7bd0ff]"
									: "border-[#2e3447] bg-transparent text-[#dce1fb] hover:border-[#7bd0ff]/50"
							} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
						>
							{option.label}
						</button>
					))}
				</div>
			</div>

			{/* Reason (conditional) */}
			{showReasonField && (
				<div>
					<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
						Reason for Disagreement
					</label>
					<textarea
						value={disagreementReason}
						onChange={(e) => onDisagreementReasonChange(e.target.value)}
						disabled={disabled}
						placeholder="Explain why you disagree or partially agree with the AI assessment..."
						rows={4}
						className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
					/>
				</div>
			)}
		</div>
	);
}
