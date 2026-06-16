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
		<div className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden group">
			<h2 className="text-lg font-bold text-brand-text mb-6 font-display">Block 4 — Agreement with AI</h2>

			{/* AI Assessment Agreement */}
			<div className="mb-6">
				<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-3 font-display">
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
							type="button"
							onClick={() => !disabled && onAgreementChange(option.value)}
							disabled={disabled}
							className={`p-4 rounded-xl border text-xs font-bold transition-all duration-300 ${
								agreement === option.value
									? "border-brand-primary bg-brand-primary/10 text-brand-primary font-extrabold shadow-[0_0_15px_rgba(0,210,255,0.08)]"
									: "border-brand-border/60 bg-brand-card/30 text-brand-text-muted hover:border-brand-primary/40 hover:text-brand-text hover:bg-brand-card/75"
							} ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
						>
							{option.label}
						</button>
					))}
				</div>
			</div>

			{/* Reason (conditional) */}
			{showReasonField && (
				<div>
					<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
						Reason for Disagreement
					</label>
					<textarea
						value={disagreementReason}
						onChange={(e) => onDisagreementReasonChange(e.target.value)}
						disabled={disabled}
						placeholder="Explain why you disagree or partially agree with the AI assessment..."
						rows={4}
						className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300 resize-none placeholder-brand-text-muted/40 disabled:opacity-50 disabled:cursor-not-allowed"
					/>
				</div>
			)}
		</div>
	);
}
