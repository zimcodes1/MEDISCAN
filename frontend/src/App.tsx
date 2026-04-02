import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import OrganisationSignupPage from './pages/OrganisationSignupPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import OrgOnboardingPage from './pages/OrgOnboardingPage';
import StaffInviteAcceptancePage from './pages/StaffInviteAcceptancePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<OrganisationSignupPage />} />
        <Route path="/verify-email" element={<EmailVerificationPage />} />
        <Route path="/onboarding" element={<OrgOnboardingPage />} />
        <Route path="/staff/accept-invite" element={<StaffInviteAcceptancePage />} />
      </Routes>
    </Router>
  );
}

export default App
