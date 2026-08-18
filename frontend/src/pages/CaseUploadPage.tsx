import CaseUploadView from "../ui/pages/CaseUploadView";
import type { Patient } from "../utils/types";
import { useState, useEffect } from "react";

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
        !!(selectedPatient && imageFile && viewProjection && assignedRadiologist);

    return (
        <>
            <CaseUploadView
                uploadSuccess={uploadSuccess}
                handleReset={handleReset}
                selectedPatient={selectedPatient}
                setSelectedPatient={setSelectedPatient}
                handleSubmit={handleSubmit}
                scanType={scanType}
                imageFile={imageFile}
                viewProjection={viewProjection}
                scanDate={scanDate}
                clinicalNotes={clinicalNotes}
                setScanDate={setScanDate}
                setScanType={setScanType}
                setImageFile={setImageFile}
                priority={priority}
                setPriority={setPriority}
                setViewProjection={setViewProjection}
                setClinicalNotes={setClinicalNotes}
                assignedRadiologist={assignedRadiologist}
                setAssignedRadiologist={setAssignedRadiologist}
                isFormValid={isFormValid}
            />
        </>
    );
}