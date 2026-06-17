import type { ScanQueueItem } from "../components/dashboard/ScanRow";
export const pendingCases = [
    {
        id: 1,
        name: "Elias Vance",
        uid: "UID: RAD-9921-X",
        modality: "Chest X-ray",
        status: "Flagged",
        statusColor: "#ffb95f",
        confidence: "94%",
        confidenceLabel: "Abnormality",
        action: "Review Now",
    },
    {
        id: 2,
        name: "Sarah Connor",
        uid: "UID: RAD-4042-M",
        modality: "Hand X-ray",
        status: "AI analyzing",
        statusColor: "#7bd0ff",
        confidence: "45%",
        confidenceLabel: "Processing",
        action: "Waiting...",
    },
    {
        id: 3,
        name: "Arthur Morgan",
        uid: "UID: RAD-1899-K",
        modality: "Chest X-ray",
        status: "Ready",
        statusColor: "#4ade80",
        confidence: "99%",
        confidenceLabel: "Clear",
        action: "Open Report",
    },
    {
        id: 4,
        name: "Jules Winnfield",
        uid: "UID: RAD-7700-B",
        modality: "Hand X-ray",
        status: "AI analyzing",
        statusColor: "#7bd0ff",
        confidence: "12%",
        confidenceLabel: "Processing",
        action: "Waiting...",
    },
];

export const sessionHistory = [
    { time: "09:42 AM", message: "Successfully processed Case #8821 (Pelvic CT)" },
    { time: "09:15 AM", message: "Auto-flagged anomaly in Case #8921 (Chest)" },
    { time: "08:50 AM", message: "Database sync completed. 124 records updated." },
    { time: "08:00 AM", message: "System diagnostics: Optimal performance." },
];

//Dashboard Page Dummy Data for the Scan Queue
export const SCAN_QUEUE: ScanQueueItem[] = [
    {
        id: "SCN-00841",
        patientName: "Emeka Okafor",
        patientCode: "PAT-3312",
        modality: "Chest X-Ray",
        projection: "PA",
        uploadedBy: "Dr. Nwosu",
        uploadedAt: "09:14 AM",
        priority: "urgent",
        status: "flagged",
        confidence: 94,
        prediction: "Pneumonia",
    },
    {
        id: "SCN-00842",
        patientName: "Aisha Bello",
        patientCode: "PAT-1190",
        modality: "Chest X-Ray",
        projection: "AP",
        uploadedBy: "Dr. Adeyemi",
        uploadedAt: "09:31 AM",
        priority: "urgent",
        status: "processing",
        confidence: null,
        prediction: null,
    },
    {
        id: "SCN-00843",
        patientName: "Chidi Eze",
        patientCode: "PAT-4457",
        modality: "Chest X-Ray",
        projection: "PA",
        uploadedBy: "Dr. Nwosu",
        uploadedAt: "09:45 AM",
        priority: "routine",
        status: "ready",
        confidence: 71,
        prediction: "Pneumonia",
    },
    {
        id: "SCN-00844",
        patientName: "Fatima Garba",
        patientCode: "PAT-2280",
        modality: "Chest X-Ray",
        projection: "Lateral",
        uploadedBy: "Dr. Ibrahim",
        uploadedAt: "10:02 AM",
        priority: "routine",
        status: "ready",
        confidence: 12,
        prediction: "Normal",
    },
    {
        id: "SCN-00845",
        patientName: "Oluwaseun Adeyemi",
        patientCode: "PAT-5591",
        modality: "Chest X-Ray",
        projection: "PA",
        uploadedBy: "Dr. Adeyemi",
        uploadedAt: "10:18 AM",
        priority: "routine",
        status: "reviewed",
        confidence: 88,
        prediction: "Pneumonia",
    },
];

// Mock data - would come from API/route params
export const scanData = {
    originalImageUrl: "/images/chest-scan.jpeg",
    heatmapImageUrl: "/images/chest-scan-heatmap.jpg",
    prediction: "pneumonia" as const,
    confidence: 94,
    gradCamSummary: "Model attention concentrated in right lower lobe, consistent with consolidation pattern. Secondary focus detected in left mid-zone.",
    patientName: "Elias Vance",
    scanId: "RAD-9921-X",
    dateUploaded: "2024-01-15",
    projection: "PA (Posteroanterior)",
    uploadedBy: "Dr. Nwosu",
    assignedRadiologist: "Dr. S. Chen",
    reportStatus: "pending" as const,
    priority: "urgent" as const,
    preAnalysisNotes: "Patient presenting with persistent cough and fever for 5 days. Suspected lower respiratory tract infection.",
};

export const NigerianStates = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Borno', 'Cross River',
    'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna',
    'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun',
    'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

// Context data (from scan - updated for multi-condition v2 scope)
export const contextData = {
    patientName: "Elias Vance",
    age: 45,
    sex: "Male",
    scanDate: "2024-01-15",
    projection: "PA",
    aiFindings: [
        { condition: "Pneumonia", prediction: "detected" as const, confidence: 94, isExperimental: false },
        { condition: "Tuberculosis", prediction: "normal" as const, confidence: 98, isExperimental: false },
        { condition: "Cardiomegaly", prediction: "normal" as const, confidence: 97, isExperimental: false },
        { condition: "Lung Nodule/Mass", prediction: "detected" as const, confidence: 88, isExperimental: false },
        { condition: "Rib Fracture", prediction: "normal" as const, confidence: 95, isExperimental: true }
    ]
};

// Mock report data - would come from API
export const reportData = {
    // Header
    orgName: "Lagos General Hospital",
    orgLogo: undefined,
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

    // AI Summary (Multi-condition Panel)
    aiFindings: [
        { condition: "Pneumonia", prediction: "detected" as const, confidence: 94, isExperimental: false },
        { condition: "Tuberculosis", prediction: "normal" as const, confidence: 98, isExperimental: false },
        { condition: "Cardiomegaly", prediction: "normal" as const, confidence: 97, isExperimental: false },
        { condition: "Lung Nodule/Mass", prediction: "detected" as const, confidence: 88, isExperimental: false },
        { condition: "Rib Fracture", prediction: "normal" as const, confidence: 95, isExperimental: true }
    ],

    // Findings
    lungFields: ["Consolidation present", "Increased opacity", "Possible nodule right mid-zone"],
    affectedSide: "Right",
    severity: "Moderate",
    detailedFindings:
        "Right lower lobe demonstrates increased opacity with air bronchograms consistent with consolidation. In addition, there is a round, well-circumscribed nodular opacity (approximately 1.5 cm) in the right mid-zone. Left lung field appears clear. No pleural effusion or pneumothorax identified. Cardiac silhouette is within normal limits.",

    // Impression
    primaryImpression: "Pneumonia (Bacterial) and Lung Nodule (Right Mid-Zone)",
    secondaryFindings: "Recommend CT chest for lung nodule evaluation",
    impressionNarrative:
        "The radiographic findings are consistent with right lower lobe pneumonia, likely bacterial in origin. The pattern of consolidation with air bronchograms supports this diagnosis. Additionally, a possible lung nodule is noted in the right mid-zone. Follow-up chest CT is recommended to further characterize the nodule.",

    // Recommendation
    recommendedAction: "Chest CT follow-up & Follow-up X-ray",
    followUpTimeframe: "Immediate for CT / 7 days for X-ray",
    additionalNotes:
        "Recommend clinical correlation with patient symptoms and laboratory findings. Obtain chest CT to evaluate the right mid-zone nodule. Follow-up chest X-ray in 7 days to assess response of the consolidative process to antibiotic therapy.",

    // Agreement
    aiAgreement: "Agree",

    // Signature
    radiologistName: "Dr. Sarah Chen",
    radiologistTitle: "MD, FRCR - Consultant Radiologist",
    submissionTimestamp: "January 15, 2024 at 14:32",
};

// Mock data for settings page
export const profileData = {
    fullName: "Dr. Nwosu",
    jobTitle: "Consultant Radiologist",
    email: "s.chen@hospital.com",
    phoneNumber: "+234 801 234 5678",
    profilePhoto: "/images/doctor.jpg",
};

export const orgData = {
    orgName: "Lagos General Hospital",
    orgType: "hospital",
    state: "Lagos",
    phoneNumber: "+234 800 123 4567",
    orgId: "ORG-2024-LGH-001",
};

export const notificationSettings = {
    scanResultReady: true,
    scanAssigned: true,
    reportSubmitted: true,
    newStaffJoined: false,
    inAppSound: true,
};

export const defaultsData = {
    defaultPriority: "routine" as const,
    disclaimerText:
        "This report is generated using AI-assisted diagnostic tools and has been reviewed and signed by a qualified radiologist. The findings and recommendations contained herein are for clinical decision support purposes only and should be interpreted in conjunction with the patient's clinical presentation and other diagnostic findings.",
    autoAssignTo: "manual",
};

export const radiologists = [
    { id: "1", name: "Dr. S. Chen" },
    { id: "2", name: "Dr. A. Patel" },
];

export const billingData = {
    currentPlan: "Professional",
    planPrice: "₦40,000/month",
    scansUsed: 342,
    scansLimit: 500,
    renewalDate: "February 15, 2024",
    billingEmail: "billing@hospital.com",
};

// Mock user role - would come from auth context
export const userRole: "org-admin" | "radiologist" | "clinician" = "org-admin";

import { type Patient } from "./types";
// Mock search results
export const mockPatients: Patient[] = [
    { id: "1", name: "Sarah Daniel", hospitalId: "RAD-4042-M", age: 45, sex: "Female" },
    { id: "2", name: "Mohammed Ali", hospitalId: "RAD-1899-K", age: 52, sex: "Male" },
    { id: "1", name: "Mary Connor", hospitalId: "RAD-4041-M", age: 25, sex: "Female" },
    { id: "2", name: "James Morgan", hospitalId: "RAD-1839-K", age: 52, sex: "Male" },
    { id: "1", name: "Aisha Ismail", hospitalId: "RAD-4047-R", age: 43, sex: "Female" },
    { id: "2", name: "Abdul Sale", hospitalId: "RAD-1819-L", age: 12, sex: "Male" },
    { id: "1", name: "Mariam Abu", hospitalId: "RAD-4022-H", age: 35, sex: "Female" },
    { id: "2", name: "Isa Sule", hospitalId: "RAD-1839-F", age: 56, sex: "Male" },
];