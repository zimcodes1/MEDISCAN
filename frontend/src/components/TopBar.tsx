import { Search, Bell, HelpCircle } from "lucide-react";

export default function TopBar() {
	return (
		<header className="h-16 bg-brand-bg/85 backdrop-blur-md border-b border-brand-border/40 flex items-center justify-between px-6 fixed top-0 left-64 right-0 z-10 transition-all duration-300">
			{/* Search Bar */}
			<div className="flex items-center gap-2.5 flex-1 max-w-sm bg-brand-card/60 border border-brand-border/60 px-4 py-2 rounded-xl focus-within:border-brand-primary/50 focus-within:bg-brand-card transition-all duration-300 group">
				<Search size={16} className="text-brand-text-muted group-focus-within:text-brand-primary transition-colors" />
				<input
					type="text"
					placeholder="Search patients or scans..."
					className="bg-transparent text-brand-text text-sm placeholder-brand-text-muted outline-none w-full"
				/>
			</div>

			{/* Right Section */}
			<div className="flex items-center gap-4">
				<button className="relative p-2 rounded-xl border border-brand-border/60 bg-brand-card/45 hover:bg-brand-card hover:text-brand-primary text-brand-text-muted transition-all duration-300 active:scale-95">
					<Bell size={16} />
					<span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-brand-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(0,210,255,0.5)]" />
				</button>
				<button className="p-2 rounded-xl border border-brand-border/60 bg-brand-card/45 hover:bg-brand-card hover:text-brand-primary text-brand-text-muted transition-all duration-300 active:scale-95">
					<HelpCircle size={16} />
				</button>

				{/* User Profile */}
				<div className="flex items-center gap-3 ml-2">
					<div className="text-right hidden sm:block">
						<p className="text-brand-text text-sm font-bold">Dr. Nwosu</p>
						<p className="text-brand-text-muted text-[9px] font-bold uppercase tracking-wider">Radiology Specialist</p>
					</div>

					<div className="flex shrink-0 border border-brand-primary/30 w-10 h-10 rounded-full overflow-hidden object-cover shadow-[0_0_15px_rgba(0,210,255,0.1)]">
						<img
							src="/images/doctor.jpg"
							alt="Dr. Nwosu"
							className="w-full h-full object-cover"
						/>
					</div>
				</div>
			</div>
		</header>
	);
}

