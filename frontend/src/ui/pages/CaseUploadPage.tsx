import { useState, useEffect } from "react";
import PatientSearch from "../components/PatientSearch";
import ScanDetailsForm from "../components/ScanDetailsForm";
import AssignmentPriorityForm from "../components/AssignmentPriorityForm";
import UploadSuccessState from "../components/UploadSuccessState";
import { Upload } from "lucide-react";
import type { Patient } from "../../utils/types";

export default function CaseUploadPage() {
	//Set Previous page for the 404 back button handler to check
	sessionStorage.setItem("lastPage", window.location.href);
	// Set Page Title
	useEffect(() => {
		document.title = "New Upload - Mediscan AI";
	}, []);

	const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
	const [scanType, setScanType] = useState("chest-xray");
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [viewProjection, setViewProjection] = useState("");
	const [scanDate, setScanDate] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [clinicalNotes, setClinicalNotes] = useState("");
	const [assignedRadiologist, setAssignedRadiologist] = useState("");
	const [priority, setPriority] = useState<"routine" | "urgent">("routine");
	const [uploadSuccess, setUploadSuccess] = useState(false);

	const handleSubmit = () => {
		// Validate and submit
		if (
			!selectedPatient ||
			!imageFile ||
			!viewProjection ||
			!assignedRadiologist
		) {
			alert("Please fill in all required fields");
			return;
		}
		// Simulate upload
		setUploadSuccess(true);
	};

	const handleReset = () => {
		setUploadSuccess(false);
		setSelectedPatient(null);
		setImageFile(null);
		setViewProjection("");
		setScanDate(new Date().toISOString().split("T")[0]);
		setClinicalNotes("");
		setAssignedRadiologist("");
		setPriority("routine");
	};

	const isFormValid =
		selectedPatient && imageFile && viewProjection && assignedRadiologist;

	return (
		<div className="p-4 sm:p-8">
			{/* Header */}
			<div className="mb-8 mt-5">
				<h1 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">
					New Diagnostic Case
				</h1>
				<p className="text-brand-text-muted text-sm">
					Upload and assign chest X-ray scans for AI-assisted analysis.
				</p>
			</div>

			{uploadSuccess ? (
				<UploadSuccessState
					onViewQueue={() => (window.location.href = "/dashboard")}
					onUploadAnother={handleReset}
				/>
			) : (
				<div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
					{/* Left Column */}
					<div className="col-span-2 space-y-6">
						<PatientSearch
							selectedPatient={selectedPatient}
							onPatientSelect={setSelectedPatient}
							onClearPatient={() => setSelectedPatient(null)}
						/>

						<ScanDetailsForm
							scanType={scanType}
							imageFile={imageFile}
							viewProjection={viewProjection}
							scanDate={scanDate}
							clinicalNotes={clinicalNotes}
							onScanTypeChange={setScanType}
							onImageFileChange={setImageFile}
							onViewProjectionChange={setViewProjection}
							onScanDateChange={setScanDate}
							onClinicalNotesChange={setClinicalNotes}
						/>
					</div>

					{/* Right Column */}
					<div className="max-sm:col-span-2 space-y-6">
						<AssignmentPriorityForm
							uploadedBy="Dr. Nwosu"
							priority={priority}
							onPriorityChange={setPriority}
							assignedRadiologist={assignedRadiologist}
							onAssignedRadiologistChange={setAssignedRadiologist}
						/>

						{/* Submit Button */}
						<button
							onClick={handleSubmit}
							disabled={!isFormValid}
							className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg py-3 rounded-xl font-extrabold flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(0,210,255,0.25)] hover:opacity-95 active:scale-95 transition-all duration-300"
						>
							<Upload size={18} />
							Upload
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
