import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import ReportHeader from "../components/patient-reports/ReportHeader";
import ReportSection from "../components/patient-reports/ReportSection";
import ReportField from "../components/patient-reports/ReportField";
import ReportDisclaimer from "../components/patient-reports/ReportDisclaimer";
import { Download, Printer, AlertTriangle, CheckCircle } from "lucide-react";

export default function PatientReportViewPage() {
	// Mock report data - would come from API
	const reportData = {
		// Header
		orgName: "Lagos General Hospital",
		orgLogo: "/images/hospital-logo.png",
		reportId: "RPT-2024-001234",
		reportDate: "January 15, 2024 14:32",

		// Patient Info
		patientName: "Elias Vance",
		patientId: "RAD-9921-X",
		dateOfBirth: "March 12, 1979",
		sex: "Male",
		age: 45,

		// Scan Info
		scanDate: "January 15, 2024",
		scanType: "Chest X-Ray",
		projection: "PA (Posteroanterior)",
		scanId: "SCN-2024-9921",

		// AI Summary
		aiPrediction: "Possible Pneumonia",
		aiConfidence: 94,
		aiPredictionType: "pneumonia" as const,

		// Findings
		lungFields: ["Consolidation present", "Increased opacity"],
		affectedSide: "Right",
		severity: "Moderate",
		detailedFindings:
			"Right lower lobe demonstrates increased opacity with air bronchograms consistent with consolidation. Left lung field appears clear. No pleural effusion or pneumothorax identified. Cardiac silhouette is within normal limits.",

		// Impression
		primaryImpression: "Pneumonia (Bacterial)",
		secondaryFindings: "None",
		impressionNarrative:
			"The radiographic findings are consistent with right lower lobe pneumonia, likely bacterial in origin. The pattern of consolidation with air bronchograms supports this diagnosis. No complications such as pleural effusion or abscess formation are evident.",

		// Recommendation
		recommendedAction: "Follow-up X-ray",
		followUpTimeframe: "7 days",
		additionalNotes:
			"Recommend clinical correlation with patient symptoms and laboratory findings. Follow-up chest X-ray in 7 days to assess treatment response. If symptoms worsen or fail to improve, consider CT chest for further evaluation.",

		// Agreement
		aiAgreement: "Agree",

		// Signature
		radiologistName: "Dr. Sarah Chen",
		radiologistTitle: "MD, FRCR - Consultant Radiologist",
		submissionTimestamp: "January 15, 2024 at 14:32",
	};

	const handleExportPDF = () => {
		// Call backend API to generate PDF
		console.log("Exporting PDF...");
		// window.open(`/api/reports/${reportData.reportId}/pdf`, '_blank');
	};

	const handlePrint = () => {
		window.print();
	};

	return (
		<div className="flex bg-[#0c1324] min-h-screen">
			<Sidebar />

		<div className="w-full lg:ml-[20%] flex-1">
			<TopBar />

			<main className="pt-20 p-4 sm:p-6 lg:p-8">
				{/* Page Header with Actions */}
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8 mt-5">
					<div>
						<h1 className="text-4xl font-bold text-[#dce1fb] mb-2">Diagnostic Report</h1>
						<p className="text-[#dce1fb]/70">Read-only view · Signed and submitted</p>
					</div>
					<div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
						<button
							onClick={handlePrint}
							className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#2e3447] text-[#7bd0ff] px-6 py-3 rounded-lg font-semibold hover:bg-[#191f31] transition-colors"
						>
							<Printer size={18} />
							Print
						</button>
						<button
							onClick={handleExportPDF}
							className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#7bd0ff] text-[#0c1324] px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
						>
							<Download size={18} />
							Export PDF
						</button>
					</div>
				</div>

					{/* Report Content */}
					<div className="max-w-5xl">
						{/* Header */}
						<ReportHeader
							orgName={reportData.orgName}
							orgLogo={reportData.orgLogo}
							reportId={reportData.reportId}
							reportDate={reportData.reportDate}
						/>

						{/* Patient Information */}
						<ReportSection title="Patient Information">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<ReportField label="Full Name" value={reportData.patientName} />
								<ReportField label="Patient ID" value={reportData.patientId} />
								<ReportField label="Date of Birth" value={reportData.dateOfBirth} />
								<ReportField label="Sex" value={reportData.sex} />
								<ReportField label="Age" value={`${reportData.age} years`} />
							</div>
						</ReportSection>

						{/* Scan Information */}
						<ReportSection title="Scan Information">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<ReportField label="Scan Date" value={reportData.scanDate} />
								<ReportField label="Scan Type" value={reportData.scanType} />
								<ReportField label="Projection" value={reportData.projection} />
								<ReportField label="Scan ID" value={reportData.scanId} />
							</div>
						</ReportSection>

						{/* AI Summary */}
						<ReportSection title="AI-Generated Preliminary Analysis" highlight>
							<div className="flex items-center gap-3 mb-3">
								{reportData.aiPredictionType === "pneumonia" ? (
									<AlertTriangle size={24} className="text-[#ffb95f]" />
								) : (
									<CheckCircle size={24} className="text-[#4ade80]" />
								)}
								<div>
									<p className="text-[#dce1fb] font-semibold text-lg">{reportData.aiPrediction}</p>
									<p className="text-[#dce1fb]/70 text-sm">
										AI Confidence: {reportData.aiConfidence}%
									</p>
								</div>
							</div>
							<p className="text-[#ffb95f] text-xs italic">
								Note: This is an AI-generated preliminary finding. The final diagnosis below has been
								independently assessed and confirmed by a qualified radiologist.
							</p>
						</ReportSection>

						{/* Radiologist Findings */}
						<ReportSection title="Radiologist Findings">
							<div className="space-y-4">
								<div>
									<p className="text-[#dce1fb]/70 text-sm mb-2">Lung Fields</p>
									<div className="flex flex-wrap gap-2">
										{reportData.lungFields.map((field, index) => (
											<span
												key={index}
												className="bg-[#191f31] text-[#dce1fb] px-3 py-1 rounded-full text-sm"
											>
												{field}
											</span>
										))}
									</div>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<ReportField label="Affected Side" value={reportData.affectedSide} />
									<ReportField label="Severity" value={reportData.severity} />
								</div>
								<ReportField
									label="Detailed Findings"
									value={
										<p className="text-[#dce1fb] leading-relaxed mt-2">
											{reportData.detailedFindings}
										</p>
									}
									fullWidth
								/>
							</div>
						</ReportSection>

						{/* Impression */}
						<ReportSection title="Impression">
							<div className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<ReportField label="Primary Impression" value={reportData.primaryImpression} />
								<ReportField label="Secondary Findings" value={reportData.secondaryFindings} />
							</div>
							<ReportField
								label="Clinical Impression"
									value={
										<p className="text-[#dce1fb] leading-relaxed mt-2">
											{reportData.impressionNarrative}
										</p>
									}
									fullWidth
								/>
							</div>
						</ReportSection>

						{/* Recommendation */}
						<ReportSection title="Recommendation">
							<div className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<ReportField label="Recommended Action" value={reportData.recommendedAction} />
									<ReportField label="Follow-up Timeframe" value={reportData.followUpTimeframe} />
								</div>
								<ReportField
									label="Additional Clinical Notes"
									value={
										<p className="text-[#dce1fb] leading-relaxed mt-2">
											{reportData.additionalNotes}
										</p>
									}
									fullWidth
								/>
							</div>
						</ReportSection>

						{/* Signature */}
						<ReportSection title="Report Signed By">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-[#dce1fb] font-semibold text-lg">
										{reportData.radiologistName}
									</p>
									<p className="text-[#dce1fb]/70">{reportData.radiologistTitle}</p>
								</div>
								<div className="text-right">
									<p className="text-[#dce1fb]/70 text-sm">Submitted</p>
									<p className="text-[#dce1fb] font-semibold">{reportData.submissionTimestamp}</p>
								</div>
							</div>
							<div className="mt-4 flex items-center gap-2 text-[#4ade80]">
								<CheckCircle size={18} />
								<span className="text-sm font-semibold">Digitally Signed & Verified</span>
							</div>
						</ReportSection>

						{/* Disclaimer */}
						<ReportDisclaimer />
					</div>
				</main>
			</div>
		</div>
	);
}
