export default function ReportDisclaimer() {
	return (
		<div className="glass-panel border-l-4 border-brand-primary rounded-2xl p-6 mt-6 relative overflow-hidden group">
			<p className="text-brand-text text-xs leading-relaxed font-semibold">
				<span className="text-brand-primary font-bold uppercase tracking-wider text-[10px] block mb-1.5 font-display">Medical Disclaimer</span> This report is generated using AI-assisted
				diagnostic tools and has been reviewed and signed by a qualified radiologist. The findings and
				recommendations contained herein are for clinical decision support purposes only and should be
				interpreted in conjunction with the patient's clinical presentation and other diagnostic findings.
				This report does not constitute a definitive diagnosis and should not replace clinical judgment.
			</p>
			<p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mt-4 pt-3 border-t border-brand-border/30">
				MediScan NG is a decision-support tool. All outputs must be reviewed by qualified medical
				professionals.
			</p>
		</div>
	);
}
