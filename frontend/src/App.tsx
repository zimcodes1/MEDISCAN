import {
	BrowserRouter as Router,
	Navigate,
	Routes,
	Route,
} from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import OrganisationSignupPage from "./pages/OrganisationSignupPage";
import PendingApprovalPage from "./pages/PendingApprovalPage";
import EmailVerificationPage from "./pages/EmailVerificationPage";
import OrgOnboardingPage from "./pages/OrgOnboardingPage";
import StaffInviteAcceptancePage from "./pages/StaffInviteAcceptancePage";
import DashboardPage from "./pages/DashboardPage";
import CaseUploadPage from "./pages/CaseUploadPage";
import NeuralAnalysisPage from "./pages/NeuralAnalysisPage";
import ReportsListPage from "./pages/ReportsListPage";
import ReportEditorPage from "./pages/ReportEditorPage";
import SettingsPage from "./pages/SettingsPage";
import MainLayout from "./components/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import PatientsPage from "./pages/PatientsPage";
import NewPatientPage from "./pages/NewPatientPage";
import PatientDetailPage from "./pages/PatientDetailPage";
import LostPage from "./pages/404";
import { DEMO_SIGNUP_FLOW } from "./lib/features";

function App() {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<LandingPage />} />
				<Route path="/login" element={<LoginPage />} />
				<Route path="/signup" element={<OrganisationSignupPage />} />
				<Route path="/pending-approval" element={<PendingApprovalPage />} />
				{/* The backend approves accounts manually; there is no email verification.
				    The old prototype page is only reachable with VITE_DEMO_SIGNUP_FLOW=1. */}
				<Route
					path="/verify-email"
					element={
						DEMO_SIGNUP_FLOW ? (
							<EmailVerificationPage />
						) : (
							<Navigate to="/pending-approval" replace />
						)
					}
				/>
				<Route path="/onboarding" element={<OrgOnboardingPage />} />
				<Route
					path="/staff/accept-invite"
					element={<StaffInviteAcceptancePage />}
				/>

				{/* Everything below requires a signed-in user */}
				<Route element={<ProtectedRoute />}>
					{/* Shared Main Layout for Dashboard & Standard Pages */}
					<Route element={<MainLayout />}>
						<Route path="/dashboard" element={<DashboardPage />} />
						<Route path="/patients" element={<PatientsPage />} />
						<Route path="/patients/new" element={<NewPatientPage />} />
						<Route
							path="/patients/:patientId"
							element={<PatientDetailPage />}
						/>
						<Route path="/scans/:scanId" element={<NeuralAnalysisPage />} />
						<Route path="/case-upload" element={<CaseUploadPage />} />
						<Route path="/neural-analysis" element={<NeuralAnalysisPage />} />
						<Route path="/patient-reports" element={<ReportsListPage />} />
						<Route
							path="/scans/:scanId/report"
							element={<ReportEditorPage />}
						/>
					</Route>

					<Route path="/settings" element={<SettingsPage />} />
				</Route>

				<Route path="*" element={<LostPage />} />
			</Routes>
		</Router>
	);
}

export default App;
