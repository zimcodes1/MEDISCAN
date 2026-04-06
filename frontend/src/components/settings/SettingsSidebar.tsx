import {
	User,
	Building2,
	Users,
	Bell,
	Settings as SettingsIcon,
	CreditCard,
	AlertTriangle,
	ArrowLeft,
	Menu,
	X
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

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
	const [isOpen, setIsOpen] = useState(false);

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
		<>
			{/* Mobile Menu Button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="lg:hidden fixed top-4 left-4 z-50 bg-[#151b2d] text-[#7bd0ff] p-2 rounded-lg"
			>
				{isOpen ? <X size={24} /> : <Menu size={24} />}
			</button>

			{/* Overlay */}
			{isOpen && (
				<div
					className="lg:hidden fixed inset-0 bg-black/50 z-30"
					onClick={() => setIsOpen(false)}
				/>
			)}

			<div className={`w-64 lg:w-1/5 bg-[#151b2d] left-0 top-0 py-4 px-4 fixed h-screen z-40 transition-transform duration-300 ${
				isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
			}`}>
				<h2 className="text-[#dce1fb] font-bold text-lg mb-4 px-2">Settings</h2>

				{/* Back to Dashboard Button */}
				<Link to={'/dashboard'} className="block my-4" onClick={() => setIsOpen(false)}>
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
								onClick={() => {
									onSectionChange(section.id);
									setIsOpen(false);
								}}
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
		</>
	);
}
