import { Search, Bell, HelpCircle } from "lucide-react";

export default function TopBar() {
	return (
		<header className="h-16 bg-[#0c1324] border-b border-[#191f31] flex items-center justify-between px-6 fixed top-0 left-64 right-0 z-10">
			{/* Search Bar */}
			<div className="flex items-center gap-3 flex-1 max-w-md">
				<Search size={18} className="text-[#dce1fb]" />
				<input
					type="text"
					placeholder="Search patients or scans..."
					className="bg-transparent text-[#dce1fb] placeholder-[#dce1fb]/50 outline-none w-full"
				/>
			</div>

			{/* Right Section */}
			<div className="flex items-center gap-4">
				<button className="text-[#dce1fb] hover:text-[#7bd0ff] transition-colors">
					<Bell size={20} />
				</button>
				<button className="text-[#dce1fb] hover:text-[#7bd0ff] transition-colors">
					<HelpCircle size={20} />
				</button>
				
				{/* User Profile */}
				<div className="flex items-center gap-3 ml-4">
					<div className="text-right">
						<p className="text-[#dce1fb] text-sm font-semibold">Dr. S. Chen</p>
						<p className="text-[#dce1fb]/70 text-xs">RADIOLOGY AI SPECIALIST</p>
					</div>
					<img
						src="/images/doctor-avatar.jpg"
						alt="Dr. S. Chen"
						className="w-10 h-10 rounded-full object-cover"
					/>
				</div>
			</div>
		</header>
	);
}
