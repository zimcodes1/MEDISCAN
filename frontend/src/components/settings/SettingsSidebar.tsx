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
		<div className="w-64 bg-brand-bg/95 border-r border-brand-border/60 h-screen flex flex-col fixed left-0 top-0 z-20 shadow-xl backdrop-blur-md py-6 px-4">
			<h2 className="text-brand-text font-bold text-lg mb-4 px-2 font-display">Settings</h2>

			{/* Back to Dashboard Button */}
			<Link to={'/dashboard'} className="block my-4">
				<button className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg py-3 rounded-xl font-extrabold flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(0,210,255,0.25)] hover:opacity-95 active:scale-95 transition-all duration-300">
					<ArrowLeft size={18} />
					Dashboard
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
							className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-2 ${
								isActive
									? isDanger
										? "bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]"
										: "bg-brand-primary/10 text-brand-primary border-brand-primary font-semibold"
									: isDanger
										? "text-[#ffb4ab]/70 hover:bg-[#ffb4ab]/5 border-transparent"
										: "text-brand-text-muted hover:text-brand-text hover:bg-brand-card/45 border-transparent"
							}`}
						>
							<Icon size={18} />
							<span className="text-sm font-medium">{section.label}</span>
						</button>
					);
				})}
			</nav>
		</div>
	);
}

