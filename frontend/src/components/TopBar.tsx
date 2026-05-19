import { Search, Bell, HelpCircle } from "lucide-react";

export default function TopBar() {
	return (
		<header className="h-16 bg-[#0c1324] border-b border-[#191f31] flex items-center justify-between px-6 fixed top-0 w-8/10 right-0 z-10">
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
				<button className="relative text-[#dce1fb]/50 hover:text-[#dce1fb] transition-colors">
					<Bell size={18} />
					<span className="absolute -top-1 -right-1 w-4 h-4 bg-[#f08080] rounded-full text-[9px] text-white flex items-center justify-center font-bold">
						3
					</span>
				</button>
				<button className="text-[#dce1fb] hover:text-[#7bd0ff] transition-colors">
					<HelpCircle size={20} />
				</button>

				{/* User Profile */}
				<div className="flex items-center gap-3 ml-4">
					<div className="text-right">
						<p className="text-[#dce1fb] text-sm font-semibold">Dr. Nwosu</p>
						<p className="text-[#dce1fb]/70 text-xs">RADIOLOGY AI SPECIALIST</p>
					</div>

					<span className="flex overflow-hidden items-start border-2 border-amber-600 w-10 h-10 rounded-full object-cover">
						<img
							src="/images/doctor.jpg"
							alt="Dr. Nwosu"

						/>
					</span>
				</div>
			</div>
		</header>
	);
}
