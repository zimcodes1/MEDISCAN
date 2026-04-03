import { LayoutDashboard, Upload, Brain, FileText, Settings, HelpCircle, Plus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
	const location = useLocation();

	const navItems = [
		{ icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
		{ icon: Upload, label: "Case Upload", path: "/case-upload" },
		{ icon: Brain, label: "Neural Analysis", path: "/neural-analysis" },
		{ icon: FileText, label: "Patient Reports", path: "/patient-reports" },
	];

	const bottomItems = [
		{ icon: Settings, label: "Settings", path: "/settings" },
		{ icon: HelpCircle, label: "Support", path: "/support" },
	];

	return (
		<aside className="w-64 bg-[#151b2d] h-screen flex flex-col fixed left-0 top-0">
			{/* Logo */}
			<div className=" px-3 py-5 flex gap-2 items-center">
				<img src="/images/logo.png" alt="Mediscan Logo" width={40} />
				<h1 className="text-[#7bd0ff] text-xl font-bold tracking-wide">Mediscan</h1>
			</div>

			{/* New Case Button */}
			<div className="px-4 mb-6">
				<button className="w-full bg-[#7bd0ff] text-[#0c1324] py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
					<Plus size={20} />
					New Case
				</button>
			</div>

			{/* Main Navigation */}
			<nav className="flex-1 px-4 space-y-1">
				{navItems.map((item) => {
					const Icon = item.icon;
					const isActive = location.pathname === item.path;
					return (
						<Link
							key={item.path}
							to={item.path}
							className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
								isActive
									? "bg-[#2e3447] text-[#7bd0ff]"
									: "text-[#dce1fb] hover:bg-[#191f31]"
							}`}
						>
							<Icon size={20} />
							<span className="font-medium">{item.label}</span>
						</Link>
					);
				})}
			</nav>

			{/* Bottom Navigation */}
			<nav className="px-4 pb-6 space-y-1">
				{bottomItems.map((item) => {
					const Icon = item.icon;
					return (
						<Link
							key={item.path}
							to={item.path}
							className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#dce1fb] hover:bg-[#191f31] transition-colors"
						>
							<Icon size={20} />
							<span className="font-medium">{item.label}</span>
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}
