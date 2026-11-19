import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import ErrorBoundary from "./ErrorBoundary";

export default function MainLayout() {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const { pathname } = useLocation();

	return (
		<div className="flex bg-brand-bg min-h-screen font-sans print:bg-white print:min-h-0 text-brand-text print:text-black">
			{/* Backdrop for mobile */}
			{isSidebarOpen && (
				<div
					className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 sm:hidden transition-opacity duration-300"
					onClick={() => setIsSidebarOpen(false)}
				/>
			)}

			<Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

			<div className="sm:ml-64 flex-1 flex flex-col min-w-0 print:ml-0 print:p-0 print:bg-white">
				<TopBar onMenuClick={() => setIsSidebarOpen(true)} />

				<main className="pt-16 flex-1 relative z-0">
					{/* key resets the boundary when you navigate away from a crashed page */}
					<ErrorBoundary key={pathname}>
						<Outlet />
					</ErrorBoundary>
				</main>
			</div>
		</div>
	);
}
