import { LayoutDashboard, Upload, Brain, FileText, Settings, HelpCircle, Plus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import Logo from "./svgs/Logo";

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
		<aside className="w-64 bg-brand-bg/95 border-r border-brand-border/60 h-screen flex flex-col fixed left-0 top-0 z-20 shadow-xl backdrop-blur-md print:hidden">
			{/* Logo */}
			<div className="px-6 py-6 flex gap-3 items-center border-b border-brand-border/40">
				<div className="p-1.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20">
					<Logo size={24}/>
				</div>
				<h1 className="text-brand-text text-lg font-bold tracking-tight font-display">
					Mediscan
				</h1>
			</div>

			{/* New Case Button */}
			<div className="px-4 mb-6 mt-6">
				<Link to="/case-upload">
					<button className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg py-3 rounded-xl font-extrabold flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(0,210,255,0.25)] hover:opacity-95 active:scale-95 transition-all duration-300">
						<Plus size={18} />
						New Case
					</button>
				</Link>
			</div>

			{/* Main Navigation */}
			<nav className="flex-1 px-3 space-y-1">
				{navItems.map((item) => {
					const Icon = item.icon;
					const isActive = location.pathname === item.path;
					return (
						<Link
							key={item.path}
							to={item.path}
							className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-2 ${
								isActive
									? "bg-brand-primary/10 text-brand-primary border-brand-primary font-semibold shadow-[inset_0_0_10px_rgba(0,210,255,0.02)]"
									: "text-brand-text-muted hover:text-brand-text hover:bg-brand-card/45 border-transparent"
							}`}
						>
							<Icon size={18} />
							<span className="text-sm font-medium">{item.label}</span>
						</Link>
					);
				})}
			</nav>

			{/* Bottom Navigation */}
			<nav className="px-3 pb-6 space-y-1">
				{bottomItems.map((item) => {
					const Icon = item.icon;
					const isActive = location.pathname === item.path;
					return (
						<Link
							key={item.path}
							to={item.path}
							className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-l-2 ${
								isActive
									? "bg-brand-primary/10 text-brand-primary border-brand-primary font-semibold"
									: "text-brand-text-muted hover:text-brand-text hover:bg-brand-card/45 border-transparent"
							}`}
						>
							<Icon size={18} />
							<span className="text-sm font-medium">{item.label}</span>
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}

