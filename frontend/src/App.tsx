import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import OrganisationSignupPage from "./pages/OrganisationSignupPage";
import EmailVerificationPage from "./pages/EmailVerificationPage";
import OrgOnboardingPage from "./pages/OrgOnboardingPage";
import StaffInviteAcceptancePage from "./pages/StaffInviteAcceptancePage";
import DashboardPage from "./pages/DashboardPage";
import CaseUploadPage from "./pages/CaseUploadPage";
import NeuralAnalysisPage from "./pages/NeuralAnalysisPage";
import PatientReportPage from "./pages/PatientReportPage";
import PatientReportViewPage from "./pages/PatientReportViewPage";
import SettingsPage from "./pages/SettingsPage";
import MainLayout from "./components/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import PatientsPage from "./pages/PatientsPage";
import NewPatientPage from "./pages/NewPatientPage";
import PatientDetailPage from "./pages/PatientDetailPage";
import LostPage from "./pages/404";

function App() {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<LandingPage />} />
				<Route path="/login" element={<LoginPage />} />
				<Route path="/signup" element={<OrganisationSignupPage />} />
				<Route path="/verify-email" element={<EmailVerificationPage />} />
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
						<Route path="/patient-reports" element={<PatientReportPage />} />
						<Route
							path="/patient-reports/:reportId"
							element={<PatientReportViewPage />}
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
