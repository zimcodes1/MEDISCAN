import { useState } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import ContextBar from "../components/patient-reports/ContextBar";
import FindingsBlock from "../components/patient-reports/FindingsBlock";
import ImpressionBlock from "../components/patient-reports/ImpressionBlock";
import RecommendationBlock from "../components/patient-reports/RecommendationBlock";
import AIAgreementBlock from "../components/patient-reports/AIAgreementBlock";
import SubmissionFooter from "../components/patient-reports/SubmissionFooter";

export default function PatientReportPage() {
	// Context data (from scan)
	const contextData = {
		patientName: "Elias Vance",
		age: 45,
		sex: "Male",
		scanDate: "2024-01-15",
		projection: "PA",
		aiPrediction: "pneumonia" as const,
		confidence: 94,
	};

	// Form state
	const [lungFields, setLungFields] = useState<string[]>([]);
	const [affectedSide, setAffectedSide] = useState("");
	const [severity, setSeverity] = useState("");
	const [detailedFindings, setDetailedFindings] = useState("");

	const [primaryImpression, setPrimaryImpression] = useState("");
	const [secondaryFindings, setSecondaryFindings] = useState("");
	const [impressionNarrative, setImpressionNarrative] = useState("");

	const [recommendedAction, setRecommendedAction] = useState("");
	const [followUpTimeframe, setFollowUpTimeframe] = useState("");
	const [followUpUnit, setFollowUpUnit] = useState("days");
	const [additionalNotes, setAdditionalNotes] = useState("");

	const [agreement, setAgreement] = useState("");
	const [disagreementReason, setDisagreementReason] = useState("");

	const [confirmationChecked, setConfirmationChecked] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [submittedDate, setSubmittedDate] = useState("");

	const handleSaveDraft = () => {
		console.log("Saving draft...");
		// Save draft logic
	};

	const handleSubmitReport = () => {
		if (!confirmationChecked) return;
		
		// Submit report logic
		setIsSubmitted(true);
		setSubmittedDate(new Date().toLocaleString());
		console.log("Report submitted");
	};

	return (
		<div className="flex bg-[#0c1324] min-h-screen">
			<Sidebar />

			<div className="ml-64 flex-1">
				<TopBar />

				<main className="pt-16 p-8">
					{/* Header */}
					<div className="mb-8 mt-5">
						<h1 className="text-2xl font-bold text-[#dce1fb] mb-2">Radiologist Report</h1>
						<p className="text-[#dce1fb]/70">
							{isSubmitted ? "View submitted report" : "Complete structured diagnostic report"}
						</p>
					</div>

					{/* Context Bar */}
					<ContextBar
						patientName={contextData.patientName}
						age={contextData.age}
						sex={contextData.sex}
						scanDate={contextData.scanDate}
						projection={contextData.projection}
						aiPrediction={contextData.aiPrediction}
						confidence={contextData.confidence}
					/>

					{/* Report Form */}
					<div className="space-y-6">
						<FindingsBlock
							lungFields={lungFields}
							affectedSide={affectedSide}
							severity={severity}
							detailedFindings={detailedFindings}
							onLungFieldsChange={setLungFields}
							onAffectedSideChange={setAffectedSide}
							onSeverityChange={setSeverity}
							onDetailedFindingsChange={setDetailedFindings}
							disabled={isSubmitted}
						/>

						<ImpressionBlock
							primaryImpression={primaryImpression}
							secondaryFindings={secondaryFindings}
							impressionNarrative={impressionNarrative}
							onPrimaryImpressionChange={setPrimaryImpression}
							onSecondaryFindingsChange={setSecondaryFindings}
							onImpressionNarrativeChange={setImpressionNarrative}
							disabled={isSubmitted}
						/>

						<RecommendationBlock
							recommendedAction={recommendedAction}
							followUpTimeframe={followUpTimeframe}
							followUpUnit={followUpUnit}
							additionalNotes={additionalNotes}
							onRecommendedActionChange={setRecommendedAction}
							onFollowUpTimeframeChange={setFollowUpTimeframe}
							onFollowUpUnitChange={setFollowUpUnit}
							onAdditionalNotesChange={setAdditionalNotes}
							disabled={isSubmitted}
						/>

						<AIAgreementBlock
							agreement={agreement}
							disagreementReason={disagreementReason}
							onAgreementChange={setAgreement}
							onDisagreementReasonChange={setDisagreementReason}
							disabled={isSubmitted}
						/>

						<SubmissionFooter
							radiologistName="Dr. S. Chen"
							radiologistCredentials="MD, FRCR"
							confirmationChecked={confirmationChecked}
							onConfirmationChange={setConfirmationChecked}
							onSaveDraft={handleSaveDraft}
							onSubmitReport={handleSubmitReport}
							isSubmitted={isSubmitted}
							submittedDate={submittedDate}
							disabled={isSubmitted}
						/>
					</div>
				</main>
			</div>
		</div>
	);
}
