import { useState } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import PatientSearch from "../components/PatientSearch";
import ScanDetailsForm from "../components/ScanDetailsForm";
import AssignmentPriorityForm from "../components/AssignmentPriorityForm";
import UploadSuccessState from "../components/UploadSuccessState";
import { Upload } from "lucide-react";

interface Patient {
	id: string;
	name: string;
	hospitalId: string;
	age: number;
	sex: string;
}

export default function CaseUploadPage() {
	const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
	const [scanType, setScanType] = useState("chest-xray");
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [viewProjection, setViewProjection] = useState("");
	const [scanDate, setScanDate] = useState(new Date().toISOString().split("T")[0]);
	const [clinicalNotes, setClinicalNotes] = useState("");
	const [assignedRadiologist, setAssignedRadiologist] = useState("");
	const [priority, setPriority] = useState<"routine" | "urgent">("routine");
	const [uploadSuccess, setUploadSuccess] = useState(false);

	const handleSubmit = () => {
		// Validate and submit
		if (!selectedPatient || !imageFile || !viewProjection || !assignedRadiologist) {
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

	const isFormValid = selectedPatient && imageFile && viewProjection && assignedRadiologist;

	return (
		<div className="flex bg-[#0c1324] min-h-screen">
			<Sidebar />

			<div className="w-full lg:ml-[20%] flex-1">
				<TopBar />

				<main className="pt-16 p-4 sm:p-6 lg:p-8">
					{/* Header */}
					<div className="mb-6 sm:mb-8 mt-3 sm:mt-5">
						<h1 className="text-xl sm:text-2xl font-bold text-[#dce1fb] mb-2">New Diagnostic Case</h1>
						<p className="text-sm sm:text-base text-[#dce1fb]/70">Upload and assign chest X-ray scans for AI-assisted analysis.</p>
					</div>

					{uploadSuccess ? (
						<UploadSuccessState
							onViewQueue={() => (window.location.href = "/dashboard")}
							onUploadAnother={handleReset}
						/>
					) : (
						<div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
							{/* Left Column */}
							<div className="xl:col-span-2 space-y-4 sm:space-y-6">
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
							<div className="space-y-4 sm:space-y-6">
								<AssignmentPriorityForm
									uploadedBy="Dr. S. Chen"
									assignedRadiologist={assignedRadiologist}
									priority={priority}
									onAssignedRadiologistChange={setAssignedRadiologist}
									onPriorityChange={setPriority}
								/>

								{/* Submit Button */}
								<button
									onClick={handleSubmit}
									disabled={!isFormValid}
									className="w-full bg-[#7bd0ff] text-[#0c1324] py-3 sm:py-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
								>
									<Upload size={18} className="sm:w-5 sm:h-5" />
									Upload & Queue for Analysis
								</button>
							</div>
						</div>
					)}
				</main>
			</div>
		</div>
	);
}
