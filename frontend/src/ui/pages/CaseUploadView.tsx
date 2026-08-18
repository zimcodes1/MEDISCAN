import PatientSearch from "../components/PatientSearch";
import ScanDetailsForm from "../components/ScanDetailsForm";
import AssignmentPriorityForm from "../components/AssignmentPriorityForm";
import UploadSuccessState from "../components/UploadSuccessState";
import { Upload } from "lucide-react";
import type { Patient } from "../../utils/types";

interface CaseUploadPageProps {
	uploadSuccess: boolean;
	handleReset: () => void;
	selectedPatient: Patient | null;
	setSelectedPatient: (patient: Patient | null) => void;
	handleSubmit: () => void;
	scanType: string;
	imageFile: File | null;
	viewProjection: string;
	scanDate: string;
	clinicalNotes: string;
	setScanDate: (date: string) => void;
	setScanType: (type: string) => void;
	setImageFile: (file: File | null) => void;
	priority: "routine" | "urgent";
	setPriority: (priority: "routine" | "urgent") => void;
	setViewProjection: (projection: string) => void;
	setClinicalNotes: (notes: string) => void;
	assignedRadiologist: string;
	setAssignedRadiologist: (radiologist: string) => void;
	isFormValid: boolean;
}

export default function CaseUploadView({
	uploadSuccess,
	handleReset,
	selectedPatient,
	setSelectedPatient,
	handleSubmit,
	scanType,
	imageFile,
	viewProjection,
	scanDate,
	clinicalNotes,
	setScanDate,
	setScanType,
	setImageFile,
	priority,
	setPriority,
	setViewProjection,
	setClinicalNotes,
	assignedRadiologist,
	setAssignedRadiologist,
	isFormValid
}: CaseUploadPageProps) {
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
