import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/landingPage";
import LoginPage from "./pages/loginPage";
import OrganisationSignupPage from "./pages/organisationSignUpPage";
import EmailVerificationPage from "./pages/emailVerificationPage";
import OrgOnboardingPage from "./pages/orgOnboardingPage";
import StaffInviteAcceptancePage from "./pages/staffInviteAcceptancePage";
import DashboardPage from "./pages/dashboardPage";
import CaseUploadPage from "./pages/caseUploadPage";
import NeuralAnalysisPage from "./pages/neuralAnalysisPage";
import PatientReportPage from "./pages/patientReportPage";
import PatientReportViewPage from "./pages/patientReportViewPage";
import SettingsPage from "./pages/settingsPage";
import MainLayout from "./ui/components/MainLayout";
import LostPage from "./ui/pages/404";

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
				<Route path="*" element={<LostPage />} />

				{/* Shared Main Layout for Dashboard & Standard Pages */}
				<Route element={<MainLayout />}>
					<Route path="/dashboard" element={<DashboardPage />} />
					<Route path="/case-upload" element={<CaseUploadPage />} />
					<Route path="/neural-analysis" element={<NeuralAnalysisPage />} />
					<Route path="/patient-reports" element={<PatientReportPage />} />
					<Route
						path="/patient-reports/:reportId"
						element={<PatientReportViewPage />}
					/>
				</Route>

				<Route path="/settings" element={<SettingsPage />} />
			</Routes>
		</Router>
	);
}

export default App;
