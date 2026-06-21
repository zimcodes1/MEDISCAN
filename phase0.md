# MediScan AI — Phase 0: Frontend Audit Report

This report presents a comprehensive audit of the existing React prototype, evaluating the routing, authentication layer, upload mechanisms, results presentation, and configuration discipline against the requirements outlined in **Phase 0** of [MediScan_AI_Implementation_Plan_v3.md](file:///home/azimeh/Desktop/MEDISCAN/MediScan_AI_Implementation_Plan_v3.md).

---

## 0.1 Inventory of Pages and Routes

The following is an inventory of every page and route requested in the implementation plan, mapped to its status in the codebase:

| Target Route | Component / File | Current Route | Status | Notes |
|---|---|---|---|---|
| `/login` | [LoginPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/LoginPage.tsx) | `/login` | **Renders but not wired to API** | Form structure is complete but login logic is purely static; bypasses validation and redirects immediately to landing page. |
| `/dashboard` | [DashboardPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/DashboardPage.tsx) | `/dashboard` | **Renders but not wired to API** | Uses static data from [DummyData.ts](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/utils/DummyData.ts). Navigation works and design is clean. |
| `/patients` | *N/A* | *None* | **Missing** | No dedicated route or view exists for viewing a lists of patients. |
| `/patients/:id` | *N/A* | *None* | **Missing** | No patient details route or scan history view exists. |
| `/scans/upload` | [CaseUploadPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/CaseUploadPage.tsx) | `/case-upload` | **Renders but not wired to API & UI incomplete** | Renders at `/case-upload`. Renders patient search and scan details, but lacks condition checkboxes/panels. Submit is stubbed. |
| `/scans/:id/result` | [NeuralAnalysisPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/NeuralAnalysisPage.tsx) | `/neural-analysis` | **Renders but not wired to API & UI incomplete** | Renders at `/neural-analysis`. Shows only one model's findings (Pneumonia) instead of a grid of per-condition finding cards. |

### Additional Routes Found in the Prototype
- `/` — [LandingPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/LandingPage.tsx) (Fully complete marketing landing page)
- `/signup` — [OrganisationSignupPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/OrganisationSignupPage.tsx) (Multi-step signup form with mock handlers)
- `/verify-email` — [EmailVerificationPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/EmailVerificationPage.tsx) (Mock verification screen)
- `/onboarding` — [OrgOnboardingPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/OrgOnboardingPage.tsx) (Form to collect organization information)
- `/staff/accept-invite` — [StaffInviteAcceptancePage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/StaffInviteAcceptancePage.tsx) (Invite completion flow)
- `/patient-reports` — [PatientReportPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/PatientReportPage.tsx) (Clinical report writing form)
- `/patient-reports/:reportId` — [PatientReportViewPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/PatientReportViewPage.tsx) (A readable/printable diagnostic report page)
- `/settings` — [SettingsPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/SettingsPage.tsx) (Mock app settings)
- `*` — [404.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/404.tsx) (Error boundary layout)

---

## 0.2 Auth Layer Audit

An audit of the authentication flows and state management in the current prototype:

- **Login form that POSTs credentials and receives tokens in response**: 
  - **Placeholder**. [LoginPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/LoginPage.tsx) renders the login fields, but the form submission (`handleSubmit`) simply navigates to `/` without calling an API or verifying credentials.
- **React Context (or equivalent) holding the access token in memory**:
  - **Absent**. There is no global authentication context or state provider. User roles are statically determined via a constant export (`userRole`) in [DummyData.ts](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/utils/DummyData.ts#L271).
- **An Axios instance (or fetch wrapper) attaching Authorization headers**:
  - **Absent**. There is no central API utility or custom Axios instance with request interceptors defined.
- **A `401` interceptor to silently refresh the access token**:
  - **Absent**.
- **A `ProtectedRoute` component (or route guards)**:
  - **Absent**. All routes in [App.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/App.tsx) are fully public and accessible without session verification.
- **Role-based conditional rendering**:
  - **Placeholder**. Conditional rendering logic (e.g., `canWriteReport = true`) exists inside [NeuralAnalysisPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/NeuralAnalysisPage.tsx#L19), but it is hardcoded to a mock boolean and not connected to user authentication.

---

## 0.3 Upload Page Audit

An audit of the case upload screen ([CaseUploadPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/CaseUploadPage.tsx)):

- **File input constraints (JPEG/PNG only)**:
  - **Incorrectly implemented**. The file input in [ScanDetailsForm.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/components/ScanDetailsForm.tsx#L103) accepts `.jpg, .jpeg, .png, .dcm, .dicom`. Furthermore, the drag-and-drop handler (`handleDrop`) does not perform any file extension or MIME-type verification, accepting any file format dropped onto the zone.
- **Condition selector checkboxes (Pneumonia, TB, Cardiomegaly, Lung Nodule/Mass)**:
  - **Absent**. No condition checkboxes exist on the page. The scan metadata is limited to a single `scanType` dropdown selector.
- **"Run Comprehensive Panel" toggle**:
  - **Absent**. No panel toggle exists.
- **Submission builds `multipart/form-data` request with image and conditions**:
  - **Absent**. [CaseUploadPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/CaseUploadPage.tsx#L29-L42) only runs basic field-presence checks and updates local state (`uploadSuccess`) to display a success modal. No API requests or payload structures are built.
- **Loading/Spinner state during request in flight**:
  - **Absent**. The state transitions are instant since the logic is entirely mock/client-side.

---

## 0.4 Results Page Audit

An audit of the neural analysis presentation page ([NeuralAnalysisPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/NeuralAnalysisPage.tsx)):

- **Structured as a grid of per-condition finding cards**:
  - **Absent**. The page features a single [AIOutputPanel.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/components/neural-analysis/AIOutputPanel.tsx) designed to show one diagnosis ("Normal" vs "Pneumonia") at a time. It is not capable of displaying multiple conditions concurrently.
- **Slots for condition name, prediction (Positive/Negative), confidence bar, and heatmap placeholder on each card**:
  - **Placeholder**. The structure is present on a single panel, but not formatted as modular, reusable cards inside a grid.
- **Disclaimer banner is present, always visible, and cannot be dismissed**:
  - **Present**. The disclaimer warning banner in [AIOutputPanel.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/components/neural-analysis/AIOutputPanel.tsx#L43-L53) is always rendered and cannot be closed.
- **Clinician notes input exists and is shown only for correct role**:
  - **Absent/Placeholder**. There is no notes input on the analysis view. Instead, notes and clinical findings are collected on [PatientReportPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/PatientReportPage.tsx) (the write-report view), which lacks auth checks.
- **Loading state for computation progress**:
  - **Absent**. The page immediately shows mock data upon routing.

---

## 0.5 Environment Variable Discipline

- **Vite environment variable usage (`import.meta.env.VITE_*`)**:
  - **Absent**. There are no environment variable lookups anywhere in the code.
- **Hardcoded backend URLs**:
  - **None**. No backend requests or base URLs are defined, as the prototype operates entirely on local mock imports.

---

## 0.6 Audit Summary & Action Items

### 1. Complete and Needs No Changes
- **Visual Design and CSS System**: The styling (defined in [index.css](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/index.css)) is premium and utilizes custom variables for the dark blue/neon aesthetic.
- **Landing and Sub-pages**: Marketing assets, layouts, and general design elements for sub-pages (Landing, Signup, Onboarding) are visually polished.
- **Read-only Report View**: The [PatientReportViewPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/PatientReportViewPage.tsx) contains a comprehensive print/export format that is well-designed.
- **Disclaimer Banner**: The disclaimer layout is correct and meets visibility specifications.

### 2. Renders Correctly but Requires API Wiring (Phase 7 Scope)
- **Authentication Forms**: [LoginPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/LoginPage.tsx) must be updated to POST fields to `/api/auth/login` and manage returned tokens.
- **Dashboard Data**: Statistics and queue counts in [DashboardPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/DashboardPage.tsx) must fetch from `/api/scans/` and `/api/patients/` dynamically.
- **Case Upload Submit**: `handleSubmit` in [CaseUploadPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/CaseUploadPage.tsx) needs to generate a `FormData` block and POST it to `/api/scans/upload/`.
- **Diagnostic Writing Form**: [PatientReportPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/PatientReportPage.tsx) must save drafts and sign reports back to database schemas.

### 3. Entirely Missing and Needs to be Built (Immediate Frontend Dev Work)
- **Auth context & state management**: Setup state context, token rotation refresh triggers, and register Axios intercepts for request/response `401` errors.
- **ProtectedRoute**: Guard component wrapping private clinician areas in [App.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/App.tsx).
- **Condition Checkboxes**: Multi-select layout (Pneumonia, TB, Cardiomegaly, Lung Nodule) and "Comprehensive Panel" toggles on the upload screen.
- **Multi-Condition Grid Results View**: Redesign [NeuralAnalysisPage.tsx](file:///home/azimeh/Desktop/MEDISCAN/frontend/src/pages/NeuralAnalysisPage.tsx) (and `AIOutputPanel`) to map over multiple backend findings returned from the API, rendering cards in a grid format with custom warnings (e.g. for Lung Nodule findings).
- **Environment Variable configuration**: Create local config loading using Vite env directives.
