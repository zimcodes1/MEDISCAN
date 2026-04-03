import {
	User,
	Building2,
	Users,
	Bell,
	Settings as SettingsIcon,
	CreditCard,
	AlertTriangle,
	ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";

interface SettingsSidebarProps {
	activeSection: string;
	onSectionChange: (section: string) => void;
	userRole: "org-admin" | "radiologist" | "clinician";
}

export default function SettingsSidebar({
	activeSection,
	onSectionChange,
	userRole,
}: SettingsSidebarProps) {
	const sections = [
		{
			id: "profile",
			label: "My Profile",
			icon: User,
			roles: ["org-admin", "radiologist", "clinician"],
		},
		{
			id: "organisation",
			label: "Organisation Profile",
			icon: Building2,
			roles: ["org-admin"],
		},
		{
			id: "staff",
			label: "Staff Management",
			icon: Users,
			roles: ["org-admin"],
		},
		{
			id: "notifications",
			label: "Notifications",
			icon: Bell,
			roles: ["org-admin", "radiologist", "clinician"],
		},
		{
			id: "defaults",
			label: "Scan & Report Defaults",
			icon: SettingsIcon,
			roles: ["org-admin"],
		},
		{
			id: "billing",
			label: "Billing & Plan",
			icon: CreditCard,
			roles: ["org-admin"],
		},
		{
			id: "danger",
			label: "Danger Zone",
			icon: AlertTriangle,
			roles: ["org-admin"],
		},
	];

	const visibleSections = sections.filter((section) =>
		section.roles.includes(userRole),
	);

	return (
		<div className="w-2/10 bg-[#151b2d] left-0 top-0 py-4 px-4 fixed h-screen">
			<h2 className="text-[#dce1fb] font-bold text-lg mb-4 px-2">Settings</h2>

			{/* New Case Button */}
			<Link to={'/dashboard'} className="block my-4">
				<button className="w-full bg-[#7bd0ff] text-[#0c1324] py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
					<ArrowLeft size={20} />
					Back to Dashboard
				</button>
			</Link>

			<nav className="space-y-1">
				{visibleSections.map((section) => {
					const Icon = section.icon;
					const isActive = activeSection === section.id;
					const isDanger = section.id === "danger";

					return (
						<button
							key={section.id}
							onClick={() => onSectionChange(section.id)}
							className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
								isActive
									? isDanger
										? "bg-[#ffb4ab]/10 text-[#ffb4ab]"
										: "bg-[#2e3447] text-[#7bd0ff]"
									: isDanger
										? "text-[#ffb4ab]/70 hover:bg-[#ffb4ab]/5"
										: "text-[#dce1fb] hover:bg-[#191f31]"
							}`}
						>
							<Icon size={18} />
							<span className="font-medium">{section.label}</span>
						</button>
					);
				})}
			</nav>
		</div>
	);
}
