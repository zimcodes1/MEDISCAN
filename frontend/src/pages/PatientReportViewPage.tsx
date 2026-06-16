import { useEffect } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import ReportHeader from "../components/patient-reports/ReportHeader";
import ReportSection from "../components/patient-reports/ReportSection";
import ReportField from "../components/patient-reports/ReportField";
import ReportDisclaimer from "../components/patient-reports/ReportDisclaimer";
import { Download, Printer, AlertTriangle, CheckCircle } from "lucide-react";
import { reportData } from "../utils/DummyData";
export default function PatientReportViewPage() {
	// Set Page Title
	useEffect(() => {
		document.title = "View Result - Mediscan AI";
	}, []);

	const handleExportPDF = () => {
		// Call backend API to generate PDF
		console.log("Exporting PDF...");
		// window.open(`/api/reports/${reportData.reportId}/pdf`, '_blank');
	};

	const handlePrint = () => {
		window.print();
	};

	return (
		<div className="flex bg-brand-bg min-h-screen print:bg-white print:min-h-0 text-brand-text print:text-black">
			<Sidebar />

			<div className="ml-64 flex-1 flex flex-col print:ml-0 print:p-0 print:bg-white">
				<TopBar />

				<main className="pt-16 p-8 relative z-0 flex-1 print:pt-0 print:p-0">
					{/* Page Header with Actions */}
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 mt-5 print:hidden">
						<div>
							<h1 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">
								Diagnostic Report
							</h1>
							<p className="text-brand-text-muted text-sm">
								Read-only view · Signed and submitted
							</p>
						</div>
						<div className="flex gap-3 w-full sm:w-auto">
							<button
								onClick={handlePrint}
								className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-brand-card text-brand-primary border border-brand-border/60 hover:bg-brand-card/80 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 active:scale-95 cursor-pointer"
							>
								<Printer size={15} />
								Print
							</button>
							<button
								onClick={handleExportPDF}
								className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg px-5 py-2.5 rounded-xl text-xs font-extrabold hover:shadow-[0_0_20px_rgba(0,210,255,0.25)] hover:opacity-95 active:scale-95 transition-all duration-300 cursor-pointer"
							>
								<Download size={15} />
								Export PDF
							</button>
						</div>
					</div>

					{/* Report Content */}
					<div className="max-w-5xl print:max-w-full">
						{/* Header */}
						<ReportHeader
							orgName={reportData.orgName}
							orgLogo={reportData.orgLogo}
							reportId={reportData.reportId}
							reportDate={reportData.reportDate}
						/>

						{/* Patient Information */}
						<ReportSection title="Patient Information">
							<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
								<div className="col-span-2">
									<ReportField
										label="Full Name"
										value={reportData.patientName}
									/>
								</div>
								<ReportField label="Patient ID" value={reportData.patientId} />
								<ReportField label="Sex" value={reportData.sex} />
								<ReportField label="Age" value={`${reportData.age} years`} />
							</div>
						</ReportSection>

						{/* Scan Information */}
						<ReportSection title="Scan Information">
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
								<ReportField label="Scan Date" value={reportData.scanDate} />
								<ReportField label="Scan Type" value={reportData.scanType} />
								<ReportField label="Projection" value={reportData.projection} />
								<ReportField label="Scan ID" value={reportData.scanId} />
							</div>
						</ReportSection>

						{/* AI Summary */}
						<ReportSection title="AI-Generated Preliminary Analysis" highlight>
							<p className="text-amber-500 text-xs font-bold uppercase tracking-wider mb-4 font-display print:text-amber-600">
								Multi-Condition Diagnostic Panel Findings
							</p>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 print:grid-cols-1 print:gap-3">
								{reportData.aiFindings.map((finding, idx) => (
									<div
										key={idx}
										className={`p-4 rounded-xl border flex flex-col justify-between gap-3 print:bg-white print:border-gray-200 print:text-black ${
											finding.prediction === "detected"
												? "bg-rose-500/5 border-rose-500/20 text-rose-400"
												: "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
										}`}
									>
										<div className="flex items-start justify-between gap-2">
											<div className="flex items-center gap-2">
												{finding.prediction === "detected" ? (
													<AlertTriangle
														size={16}
														className="shrink-0 text-rose-400 print:text-red-500"
													/>
												) : (
													<CheckCircle
														size={16}
														className="shrink-0 text-emerald-400 print:text-green-600"
													/>
												)}
												<span className="font-extrabold text-sm text-brand-text print:text-black tracking-tight font-display">
													{finding.condition}
												</span>
												{finding.isExperimental && (
													<span className="bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded print:border-gray-300 print:text-gray-500">
														Experimental
													</span>
												)}
											</div>
											<span
												className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
													finding.prediction === "detected"
														? "bg-rose-500/10 text-rose-400 print:bg-red-100 print:text-red-600"
														: "bg-emerald-500/10 text-emerald-400 print:bg-green-100 print:text-green-700"
												}`}
											>
												{finding.prediction === "detected"
													? "Detected"
													: "Normal"}
											</span>
										</div>

										{/* Specific notice for Lung Nodule/Mass findings */}
										{finding.condition === "Lung Nodule/Mass" &&
											finding.prediction === "detected" && (
												<p className="text-rose-400/90 print:text-red-600 text-[10px] font-bold leading-normal bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg -mt-1 print:bg-red-50 print:border-red-100">
													Possible nodule/mass — not a cancer diagnosis. CT
													follow-up recommended.
												</p>
											)}

										{/* Confidence score indicator */}
										<div className="print:hidden">
											<div className="flex justify-between items-center mb-1 text-[10px] text-brand-text-muted font-bold">
												<span>Confidence</span>
												<span>{finding.confidence}%</span>
											</div>
											<div className="w-full bg-brand-bg/60 h-1.5 rounded-full overflow-hidden border border-brand-border/20">
												<div
													className={`h-full rounded-full transition-all duration-500 ${
														finding.prediction === "detected"
															? "bg-gradient-to-r from-rose-500 to-amber-500"
															: "bg-gradient-to-r from-brand-primary to-brand-secondary"
													}`}
													style={{ width: `${finding.confidence}%` }}
												/>
											</div>
										</div>
										<div className="hidden print:block text-xs text-gray-500">
											AI Confidence: {finding.confidence}%
										</div>
									</div>
								))}
							</div>

							<p className="text-amber-500/80 print:text-gray-500 text-[10px] font-bold leading-relaxed border-t border-amber-500/10 print:border-gray-200 pt-3 mt-4">
								* NOTE: The findings above represent automated pre-analysis
								results generated by independent, specialized deep learning
								models. The official radiologist diagnosis, narrative
								impression, and clinical recommendations are detailed below.
							</p>
						</ReportSection>

						{/* Radiologist Findings */}
						<ReportSection title="Radiologist Findings">
							<div className="space-y-5">
								<div>
									<p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2.5 font-display">
										Identified Anomalies
									</p>
									<div className="flex flex-wrap gap-2">
										{reportData.lungFields.map((field, index) => (
											<span
												key={index}
												className="bg-brand-card text-brand-text border border-brand-border/60 px-3.5 py-1.5 rounded-xl text-xs font-semibold print:bg-white print:border-gray-200 print:text-black"
											>
												{field}
											</span>
										))}
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4 border-t border-brand-border/30 pt-4">
									<ReportField
										label="Affected Side"
										value={reportData.affectedSide}
									/>
									<ReportField
										label="Severity Status"
										value={reportData.severity}
									/>
								</div>

								<ReportField
									label="Detailed Findings"
									value={reportData.detailedFindings}
									fullWidth
								/>
							</div>
						</ReportSection>

						{/* Impression */}
						<ReportSection title="Radiologist Impression">
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<ReportField
										label="Primary Impression"
										value={reportData.primaryImpression}
									/>
									<ReportField
										label="Secondary Findings"
										value={reportData.secondaryFindings}
									/>
								</div>
								<ReportField
									label="Clinical Impression Narrative"
									value={reportData.impressionNarrative}
									fullWidth
								/>
							</div>
						</ReportSection>

						{/* Recommendation */}
						<ReportSection title="Clinical Recommendation">
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<ReportField
										label="Recommended Action"
										value={reportData.recommendedAction}
									/>
									<ReportField
										label="Follow-up Timeframe"
										value={reportData.followUpTimeframe}
									/>
								</div>
								<ReportField
									label="Additional Notes"
									value={reportData.additionalNotes}
									fullWidth
								/>
							</div>
						</ReportSection>

						{/* Signature */}
						<ReportSection title="Report Authenticity & Signature">
							<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
								<div>
									<p className="text-brand-text print:text-black font-extrabold text-base tracking-tight font-display">
										{reportData.radiologistName}
									</p>
									<p className="text-brand-text-muted text-xs font-semibold mt-0.5">
										{reportData.radiologistTitle}
									</p>
								</div>
								<div className="sm:text-right">
									<p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider">
										Submitted
									</p>
									<p className="text-brand-text print:text-black font-bold text-xs mt-0.5">
										{reportData.submissionTimestamp}
									</p>
								</div>
							</div>
							<div className="mt-4 pt-3 border-t border-brand-border/30 flex items-center gap-2 text-emerald-400 print:text-green-700">
								<CheckCircle size={15} />
								<span className="text-[10px] font-extrabold uppercase tracking-wider">
									Digitally Signed & Verified
								</span>
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
