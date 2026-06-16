import { FileCheck, Save } from "lucide-react";

interface SubmissionFooterProps {
	clinicianName: string;
	clinicianCredentials: string;
	confirmationChecked: boolean;
	onConfirmationChange: (checked: boolean) => void;
	onSaveDraft: () => void;
	onSubmitReport: () => void;
	isSubmitted?: boolean;
	submittedDate?: string;
	disabled?: boolean;
}

export default function SubmissionFooter({
	clinicianName,
	clinicianCredentials,
	confirmationChecked,
	onConfirmationChange,
	onSaveDraft,
	onSubmitReport,
	isSubmitted = false,
	submittedDate,
	disabled = false,
}: SubmissionFooterProps) {
	return (
		<div className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden group">
			{/* Clinician Info */}
			<div className="mb-6">
				<div className="flex items-center justify-between mb-4">
					<div>
						<p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-1 font-display">Reporting Clinician</p>
						<p className="text-brand-text font-bold text-base font-display">
							{clinicianName}, {clinicianCredentials}
						</p>
					</div>
					{isSubmitted && submittedDate && (
						<div className="text-right">
							<p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-1 font-display">Report Submitted</p>
							<p className="text-brand-text font-semibold">{submittedDate}</p>
						</div>
					)}
				</div>
			</div>

			{!isSubmitted ? (
				<>
					{/* Confirmation Checkbox */}
					<label className="flex items-start gap-3 p-4 bg-brand-card/25 border border-brand-border/40 rounded-xl mb-6 cursor-pointer hover:bg-brand-card/50 hover:border-brand-primary/30 transition-all duration-300">
						<input
							type="checkbox"
							checked={confirmationChecked}
							onChange={(e) => onConfirmationChange(e.target.checked)}
							disabled={disabled}
							className="w-4 h-4 mt-0.5 rounded border-brand-border/80 bg-brand-card/60 text-brand-primary focus:ring-brand-primary/50 focus:border-brand-primary"
						/>
						<span className="text-brand-text text-xs font-semibold leading-relaxed">
							I confirm this report reflects my independent clinical assessment and is subject to review.
						</span>
					</label>

					{/* Action Buttons */}
					<div className="flex gap-4">
						<button
							onClick={onSaveDraft}
							disabled={disabled}
							className="flex-1 flex items-center justify-center gap-2 bg-brand-card text-brand-primary border border-brand-border/60 hover:bg-brand-card/80 py-3 rounded-xl text-xs font-bold transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
						>
							<Save size={14} />
							Save Draft
						</button>
						<button
							onClick={onSubmitReport}
							disabled={!confirmationChecked || disabled}
							className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg py-3 rounded-xl text-xs font-extrabold hover:shadow-[0_0_20px_rgba(0,210,255,0.2)] hover:opacity-95 active:scale-95 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
						>
							<FileCheck size={14} />
							Submit <span className="hidden sm:inline">& Sign Report</span>
						</button>
					</div>
				</>
			) : (
				<div className="flex items-center justify-center gap-3 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20 text-emerald-400 font-extrabold text-xs tracking-wider uppercase">
					<FileCheck size={16} className="shrink-0" />
					<span>Report Submitted & Signed</span>
				</div>
			)}
		</div>
	);
}
