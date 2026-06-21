interface StatCardProps {
	label: string;
	value: string | number;
	sub?: string;
	icon: React.ReactNode;
	accent: "blue" | "amber" | "green" | "red";
}

const ACCENT = {
	blue: {
		bg: "bg-brand-primary",
		text: "text-brand-primary",
		border: "border-brand-primary/20",
		iconBg: "bg-brand-primary/10",
	},
	amber: {
		bg: "bg-amber-500",
		text: "text-amber-500",
		border: "border-amber-500/20",
		iconBg: "bg-amber-500/10",
	},
	green: {
		bg: "bg-emerald-500",
		text: "text-emerald-400",
		border: "border-emerald-500/20",
		iconBg: "bg-emerald-500/10",
	},
	red: {
		bg: "bg-rose-500",
		text: "text-rose-400",
		border: "border-rose-500/20",
		iconBg: "bg-rose-500/10",
	},
};

export default function StatCard({ label, value, sub, icon, accent }: StatCardProps) {
	const a = ACCENT[accent];
	return (
		<div className="glass-panel glass-panel-hover rounded-2xl p-4 sm:p-6 flex items-start justify-between relative overflow-hidden group">
			{/* Color-matched background glow */}
			<div className={`absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-10 group-hover:opacity-20 transition-all duration-500 ${a.bg}`} />
			
			<div className="space-y-3 relative z-10">
				<p className="text-brand-text-muted text-xs font-bold uppercase tracking-wider">{label}</p>
				<div className="space-y-1">
					<p className={`text-4xl font-extrabold tracking-tight ${a.text} text-neon-glow leading-none`}>
						{value}
					</p>
					{sub && <p className="text-brand-text-muted/60 text-xs">{sub}</p>}
				</div>
			</div>
			
			<div className={`p-3 rounded-xl ${a.iconBg} ${a.text} border ${a.border} group-hover:scale-105 transition-transform duration-300 relative z-10`}>
				{icon}
			</div>
		</div>
	);
}