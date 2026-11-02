import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import SettingsSidebar from "../components/settings/SettingsSidebar";
import MyProfileSection from "../components/settings/MyProfileSection";
import OrganisationProfileSection from "../components/settings/OrganisationProfileSection";
import StaffManagementSection from "../components/settings/StaffManagementSection";
import NotificationsSection from "../components/settings/NotificationsSection";
import ScanReportDefaultsSection from "../components/settings/ScanReportDefaultsSection";
import BillingPlanSection from "../components/settings/BillingPlanSection";
import DangerZoneSection from "../components/settings/DangerZoneSection";
import { billingData, notificationSettings } from "../utils/DummyData";
import { useAuth } from "../contexts/AuthContext";

export default function SettingsPage() {
	const { user } = useAuth();
	const userRole: "org-admin" | "radiologist" | "clinician" =
		user?.role === "admin"
			? "org-admin"
			: user?.role === "radiologist"
				? "radiologist"
				: "clinician";
	//Set Previous page for the 404 back button handler to check
	sessionStorage.setItem("lastPage", window.location.href);

	// Set Page Title
	useEffect(() => {
		document.title = "Settings - Mediscan AI";
	}, []);

	const [activeSection, setActiveSection] = useState("profile");
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);

	const handleSaveNotifications = (data: any) => {
		console.log("Saving notifications:", data);
	};

	const handleSaveBilling = (email: string) => {
		console.log("Saving billing email:", email);
	};

	return (
		<div className="flex bg-brand-bg min-h-screen">
			{/* Backdrop for mobile */}
			{isSidebarOpen && (
				<div
					className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 sm:hidden transition-opacity duration-300"
					onClick={() => setIsSidebarOpen(false)}
				/>
			)}

			{/* Settings Sidebar */}
			<SettingsSidebar
				activeSection={activeSection}
				onSectionChange={setActiveSection}
				userRole={userRole}
				isOpen={isSidebarOpen}
				onClose={() => setIsSidebarOpen(false)}
			/>
			<div className="sm:ml-64 flex-1 flex flex-col min-w-0">
				<TopBar onMenuClick={() => setIsSidebarOpen(true)} />

				<main className="pt-16 p-4 sm:p-8 mt-5">
					{/* Profile, organisation, staff and defaults are live; these three are still sample data */}
					{["notifications", "billing", "danger"].includes(activeSection) && (
						<div className="mb-6 bg-amber-500/5 border border-amber-500/20 text-amber-500 text-xs rounded-xl px-4 py-3 leading-snug">
							<span className="font-bold uppercase tracking-wider mr-1">
								Preview:
							</span>
							This section is not connected to the backend yet. What you see is
							sample data, and changes are not saved.
						</div>
					)}
					<div className="flex gap-6">
						{/* Content Area */}
						<div className="flex-1 min-w-0">
							{activeSection === "profile" && (
								<MyProfileSection />
							)}

							{activeSection === "organisation" && userRole === "org-admin" && (
								<OrganisationProfileSection />
							)}

							{activeSection === "staff" && userRole === "org-admin" && (
								<StaffManagementSection />
							)}

							{activeSection === "notifications" && (
								<NotificationsSection
									userRole={userRole}
									initialSettings={notificationSettings}
									onSave={handleSaveNotifications}
								/>
							)}

							{activeSection === "defaults" && userRole === "org-admin" && (
								<ScanReportDefaultsSection />
							)}

							{activeSection === "billing" && userRole === "org-admin" && (
								<BillingPlanSection
									planData={billingData}
									onSave={handleSaveBilling}
								/>
							)}

							{activeSection === "danger" && userRole === "org-admin" && (
								<DangerZoneSection />
							)}
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
