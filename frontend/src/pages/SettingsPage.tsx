import { useState } from "react";
import TopBar from "../components/TopBar";
import SettingsSidebar from "../components/settings/SettingsSidebar";
import MyProfileSection from "../components/settings/MyProfileSection";
import OrganisationProfileSection from "../components/settings/OrganisationProfileSection";
import StaffManagementSection from "../components/settings/StaffManagementSection";
import NotificationsSection from "../components/settings/NotificationsSection";
import ScanReportDefaultsSection from "../components/settings/ScanReportDefaultsSection";
import BillingPlanSection from "../components/settings/BillingPlanSection";
import DangerZoneSection from "../components/settings/DangerZoneSection";

export default function SettingsPage() {
	// Mock user role - would come from auth context
	const userRole: "org-admin" | "radiologist" | "clinician" = "org-admin";

	const [activeSection, setActiveSection] = useState("profile");

	// Mock data
	const profileData = {
		fullName: "Dr. Sarah Chen",
		jobTitle: "Consultant Radiologist",
		email: "s.chen@hospital.com",
		phoneNumber: "+234 801 234 5678",
		profilePhoto: "/images/doctor-avatar.jpg",
	};

	const orgData = {
		orgName: "Lagos General Hospital",
		orgType: "hospital",
		state: "Lagos",
		phoneNumber: "+234 800 123 4567",
		logo: "/images/hospital-logo.png",
		orgId: "ORG-2024-LGH-001",
	};

	const notificationSettings = {
		scanResultReady: true,
		scanAssigned: true,
		reportSubmitted: true,
		newStaffJoined: false,
		inAppSound: true,
	};

	const defaultsData = {
		defaultPriority: "routine" as const,
		disclaimerText:
			"This report is generated using AI-assisted diagnostic tools and has been reviewed and signed by a qualified radiologist. The findings and recommendations contained herein are for clinical decision support purposes only and should be interpreted in conjunction with the patient's clinical presentation and other diagnostic findings.",
		autoAssignTo: "manual",
	};

	const radiologists = [
		{ id: "1", name: "Dr. S. Chen" },
		{ id: "2", name: "Dr. A. Patel" },
	];

	const billingData = {
		currentPlan: "Professional",
		planPrice: "₦40,000/month",
		scansUsed: 342,
		scansLimit: 500,
		renewalDate: "February 15, 2024",
		billingEmail: "billing@hospital.com",
	};

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
		<div className="flex bg-[#0c1324] min-h-screen">
			{/* Settings Sidebar */}
			<SettingsSidebar
				activeSection={activeSection}
				onSectionChange={setActiveSection}
				userRole={userRole}
			/>
			<div className="flex-1">
				<TopBar />

				<main className="w-8/10 ml-[20%] pt-16 p-8 mt-5">
					<div className="flex gap-6">
						{/* Content Area */}
						<div className="flex-1">
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
