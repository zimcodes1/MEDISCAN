import { useState, useEffect, useRef } from "react";
import PatientSearch from "../components/PatientSearch";
import ScanDetailsForm from "../components/ScanDetailsForm";
import AssignmentPriorityForm from "../components/AssignmentPriorityForm";
import UploadSuccessState from "../components/UploadSuccessState";
import { Upload } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getPatient, type PatientRecord } from "../lib/patients";
import { useAuth } from "../contexts/AuthContext";
import { predict } from "../lib/inference";
import { listStaff, type StaffMember } from "../lib/staff";
import { SCAN_WORKFLOW } from "../lib/features";
import type { Projection } from "../lib/scans";
import { useNotifications } from "../contexts/NotificationsContext";
import { useOrg } from "../contexts/OrgContext";

// Projection, date, notes, priority and assignment are only stored when the
// backend implements the scan workflow (see lib/features.ts).
const METADATA_SAVED = SCAN_WORKFLOW;

export default function CaseUploadPage() {
  const navigate = useNavigate();
  //Set Previous page for the 404 back button handler to check
  sessionStorage.setItem("lastPage", window.location.href);
  // Set Page Title
  useEffect(() => {
    document.title = "New Upload - Mediscan AI";
  }, []);

  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(
    null,
  );

  // Arriving from a patient's page (?patient=<id>): the patient is already chosen, so
  // their code is in the Patient box and the person only has to add the image.
  const [searchParams] = useSearchParams();
  const presetPatientId = searchParams.get("patient");
  useEffect(() => {
    if (!presetPatientId) return;
    let active = true;
    getPatient(presetPatientId)
      .then((p) => active && setSelectedPatient((prev) => prev ?? p))
      .catch(() => {
        // unknown or not theirs to see: leave the search box for them to use
      });
    return () => {
      active = false;
    };
  }, [presetPatientId]);
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
  const { add } = useNotifications();
  const { user } = useAuth();
  const { settings } = useOrg();
  const [staff, setStaff] = useState<StaffMember[]>([]);

  // Start from the organisation's defaults (Settings, Scan & Report Defaults).
  // The form always sends a priority, so without this it would override them.
  const defaultsApplied = useRef(false);
  useEffect(() => {
    if (!settings || defaultsApplied.current) return;
    defaultsApplied.current = true;
    setPriority(settings.default_priority);
    // only admins pick the assignee; for everyone else the server applies the default
    if (user?.role === "admin") setAssignedRadiologist(settings.auto_assign_to_id ?? "");
  }, [settings, user?.role]);

  useEffect(() => {
    if (!METADATA_SAVED) return;
    let active = true;
    // Prefer radiologists; fall back to everyone so assignment still works
    // in organisations that have none yet.
    listStaff("radiologist")
      .then((r) => (r.length ? r : listStaff()))
      .then((r) => active && setStaff(r))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleImageFile = (file: File | null) => {
    if (file && !["image/png", "image/jpeg"].includes(file.type)) {
      add({
        id: String(Date.now()),
        message: "Only PNG or JPEG images are supported",
        time: new Date().toLocaleTimeString(),
      });
      return;
    }
    setImageFile(file);
  };

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedPatient || !imageFile || uploading) return;
    setUploading(true);
    setProgress(0);
    setUploadError(null);
    try {
      const result = await predict(
        imageFile,
        selectedPatient?.id ?? undefined,
        METADATA_SAVED
          ? {
              priority,
              projection: viewProjection
                ? (viewProjection.toLowerCase() as Projection)
                : undefined,
              examDate: scanDate || undefined,
              clinicalNotes: clinicalNotes.trim() || undefined,
              assignedToId:
                user?.role === "admin" ? assignedRadiologist || undefined : undefined,
            }
          : undefined,
        setProgress,
      );
      if (result.saved) {
        setUploadSuccess(true);
      } else {
        // If not saved, we still have findings; show notification
        add({
          id: String(Date.now()),
          message: `Analysis completed (not saved)`,
          time: new Date().toLocaleTimeString(),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setUploadError(message);
      add({
        id: String(Date.now()),
        message: `Upload failed: ${message}`,
        time: new Date().toLocaleTimeString(),
      });
    } finally {
      setUploading(false);
      setProgress(null);
    }
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

  const isFormValid = selectedPatient && imageFile;

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
          onViewQueue={() => navigate("/dashboard")}
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
              onImageFileChange={handleImageFile}
              metadataDisabled={!METADATA_SAVED}
              onViewProjectionChange={setViewProjection}
              onScanDateChange={setScanDate}
              onClinicalNotesChange={setClinicalNotes}
            />
          </div>

          {/* Right Column */}
          <div className="max-sm:col-span-2 space-y-6">
            <AssignmentPriorityForm
              uploadedBy={user?.full_name ?? ""}
              priority={priority}
              onPriorityChange={setPriority}
              assignedRadiologist={assignedRadiologist}
              onAssignedRadiologistChange={setAssignedRadiologist}
              disabled={!METADATA_SAVED}
              staff={staff}
              canAssign={user?.role === "admin"}
            />

            {/* Submit Button */}
            {uploadError && (
              <p
                role="alert"
                className="text-rose-400 text-sm bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3 break-words"
              >
                Upload failed: {uploadError}
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={!isFormValid || uploading}
              className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg py-3 rounded-xl font-extrabold flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(0,210,255,0.25)] hover:opacity-95 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100"
            >
              <Upload size={18} />
              {uploading
                ? progress !== null && progress < 100
                  ? `Uploading… ${progress}%`
                  : "Analysing…"
                : "Upload"}
            </button>
            {!isFormValid && !uploading && (
              <p className="text-amber-500 text-xs leading-snug">
                Select{" "}
                {[!selectedPatient && "a patient", !imageFile && "an image"]
                  .filter(Boolean)
                  .join(" and ")}{" "}
                to upload.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
