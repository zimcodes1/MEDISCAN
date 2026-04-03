export default function ReportDisclaimer() {
	return (
		<div className="bg-[#191f31] border-l-4 border-[#7bd0ff] rounded-lg p-6 mt-6">
			<p className="text-[#dce1fb] text-sm leading-relaxed">
				<span className="font-semibold">Medical Disclaimer:</span> This report is generated using AI-assisted
				diagnostic tools and has been reviewed and signed by a qualified radiologist. The findings and
				recommendations contained herein are for clinical decision support purposes only and should be
				interpreted in conjunction with the patient's clinical presentation and other diagnostic findings.
				This report does not constitute a definitive diagnosis and should not replace clinical judgment.
			</p>
			<p className="text-[#dce1fb]/70 text-xs mt-3">
				MediScan NG is a decision-support tool. All outputs must be reviewed by qualified medical
				professionals.
			</p>
		</div>
	);
}
