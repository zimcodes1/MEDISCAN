import { LayoutDashboard, Upload, Brain, FileText, Settings, HelpCircle, Plus, X, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import Logo from "./svgs/Logo";

export default function Sidebar() {
	const location = useLocation();
	const [isOpen, setIsOpen] = useState(false);

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

			{/* Sidebar */}
			<aside
				className={`w-64 lg:w-1/5 bg-[#151b2d] h-screen flex flex-col fixed left-0 top-0 z-40 transition-transform duration-300 ${
					isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
				}`}
			>
				{/* Logo */}
				<div className="px-3 py-5 flex gap-2 items-center">
					<Logo size={32} />
					<h1 className="text-[#7bd0ff] text-xl font-bold tracking-wide">Mediscan</h1>
				</div>

				{/* New Case Button */}
				<div className="px-4 mb-6 mt-4">
					<button
						onClick={() => setIsOpen(false)}
						className="w-full bg-[#7bd0ff] text-[#0c1324] py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
					>
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
								onClick={() => setIsOpen(false)}
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
								onClick={() => setIsOpen(false)}
								className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#dce1fb] hover:bg-[#191f31] transition-colors"
							>
								<Icon size={20} />
								<span className="font-medium">{item.label}</span>
							</Link>
						);
					})}
				</nav>
			</aside>
		</>
	);
}
