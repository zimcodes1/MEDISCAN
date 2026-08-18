import { useState, useEffect } from "react";
import ContextBar from "../components/patient-reports/ContextBar";
import FindingsBlock from "../components/patient-reports/FindingsBlock";
import ImpressionBlock from "../components/patient-reports/ImpressionBlock";
import RecommendationBlock from "../components/patient-reports/RecommendationBlock";
import AIAgreementBlock from "../components/patient-reports/AIAgreementBlock";
import SubmissionFooter from "../components/patient-reports/SubmissionFooter";
import { contextData } from "../../utils/DummyData";

export default function PatientReportPage() {
	//Set Previous page for the 404 back button handler to check
	sessionStorage.setItem("lastPage", window.location.href);
	// Set Page Title
	useEffect(() => {
		document.title = "Report - Mediscan AI";
	}, []);

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
		<div className="p-4 sm:p-8 flex-1 flex flex-col max-w-5xl">
			{/* Header */}
			<div className="mb-8 mt-5">
				<h1 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">
					Clinician Report
				</h1>
				<p className="text-brand-text-muted text-sm">
					{isSubmitted
						? "View submitted report"
						: "Complete structured diagnostic report"}
				</p>
			</div>

			{/* Context Bar */}
			<ContextBar
				patientName={contextData.patientName}
				age={contextData.age}
				sex={contextData.sex}
				scanDate={contextData.scanDate}
				projection={contextData.projection}
				aiFindings={contextData.aiFindings}
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
					clinicianName="Dr. Elias Vance"
					clinicianCredentials="MD"
					confirmationChecked={confirmationChecked}
					onConfirmationChange={setConfirmationChecked}
					onSaveDraft={handleSaveDraft}
					onSubmitReport={handleSubmitReport}
					isSubmitted={isSubmitted}
					submittedDate={submittedDate}
					disabled={isSubmitted}
				/>
			</div>
		</div>
	);
}
