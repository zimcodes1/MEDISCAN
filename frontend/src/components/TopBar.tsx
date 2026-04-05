import { Search, Bell, HelpCircle } from "lucide-react";

export default function TopBar() {
	return (
		<header className="h-16 bg-[#0c1324] border-b border-[#191f31] flex items-center justify-between px-4 sm:px-6 fixed top-0 w-full lg:w-4/5 right-0 z-10">
			{/* Search Bar */}
			<div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-md ml-12 lg:ml-0">
				<Search size={16} className="text-[#dce1fb] sm:w-[18px] sm:h-[18px] flex-shrink-0" />
				<input
					type="text"
					placeholder="Search patients..."
					className="bg-transparent text-[#dce1fb] placeholder-[#dce1fb]/50 outline-none w-full text-sm"
				/>
			</div>

			{/* Right Section */}
			<div className="flex items-center gap-2 sm:gap-4">
				<button className="relative text-[#dce1fb]/50 hover:text-[#dce1fb] transition-colors">
					<Bell size={16} className="sm:w-[18px] sm:h-[18px]" />
					<span className="absolute -top-1 -right-1 w-4 h-4 bg-[#f08080] rounded-full text-[9px] text-white flex items-center justify-center font-bold">
						3
					</span>
				</button>
				<button className="hidden sm:block text-[#dce1fb] hover:text-[#7bd0ff] transition-colors">
					<HelpCircle size={20} />
				</button>

				{/* User Profile */}
				<div className="flex items-center gap-2 sm:gap-3 ml-2 sm:ml-4">
					<div className="hidden md:block text-right">
						<p className="text-[#dce1fb] text-sm font-semibold">Dr. S. Chen</p>
						<p className="text-[#dce1fb]/70 text-xs">RADIOLOGY AI SPECIALIST</p>
					</div>
					<img
						src="/images/doctor-avatar.jpg"
						alt="Dr. S. Chen"
						className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
					/>
				</div>
			</div>
		</header>
	);
}
