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
import {
	billingData,
	defaultsData,
	notificationSettings,
	orgData,
	profileData,
	radiologists,
	userRole,
} from "../utils/DummyData";

export default function SettingsPage() {
	// Set Page Title
	useEffect(() => {
		document.title = "Settings - Mediscan AI";
	}, []);

	const [activeSection, setActiveSection] = useState("profile");

	const handleSaveProfile = (data: any) => {
		console.log("Saving profile:", data);
	};

	const handleSaveOrg = (data: any) => {
		console.log("Saving org:", data);
	};

	const handleSaveNotifications = (data: any) => {
		console.log("Saving notifications:", data);
	};

	const handleSaveDefaults = (data: any) => {
		console.log("Saving defaults:", data);
	};

	const handleSaveBilling = (email: string) => {
		console.log("Saving billing email:", email);
	};

	return (
		<div className="flex bg-brand-bg min-h-screen">
			{/* Settings Sidebar */}
			<SettingsSidebar
				activeSection={activeSection}
				onSectionChange={setActiveSection}
				userRole={userRole}
			/>
			<div className="flex-1 ml-64 flex flex-col min-w-0">
				<TopBar />

				<main className="pt-16 p-8 mt-5">
					<div className="flex gap-6">
						{/* Content Area */}
						<div className="flex-1 min-w-0">
							{activeSection === "profile" && (
								<MyProfileSection
									initialData={profileData}
									onSave={handleSaveProfile}
								/>
							)}

							{activeSection === "organisation" && userRole === "org-admin" && (
								<OrganisationProfileSection
									initialData={orgData}
									onSave={handleSaveOrg}
								/>
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
								<ScanReportDefaultsSection
									initialData={defaultsData}
									radiologists={radiologists}
									onSave={handleSaveDefaults}
								/>
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
