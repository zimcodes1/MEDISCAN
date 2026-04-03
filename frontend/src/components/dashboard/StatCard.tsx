interface StatCardProps {
	label: string;
	value: string | number;
	sub?: string;
	icon: React.ReactNode;
	accent: "blue" | "amber" | "green" | "red";
}
const ACCENT = {
	blue: {
		bg: "bg-[#1a2540]",
		text: "text-[#7bd0ff]",
		border: "border-[#7bd0ff]/20",
		iconBg: "bg-[#7bd0ff]/10",
	},
	amber: {
		bg: "bg-[#251e14]",
		text: "text-[#ffb95f]",
		border: "border-[#ffb95f]/20",
		iconBg: "bg-[#ffb95f]/10",
	},
	green: {
		bg: "bg-[#142018]",
		text: "text-[#5dca9e]",
		border: "border-[#5dca9e]/20",
		iconBg: "bg-[#5dca9e]/10",
	},
	red: {
		bg: "bg-[#251414]",
		text: "text-[#f08080]",
		border: "border-[#f08080]/20",
		iconBg: "bg-[#f08080]/10",
	},
};

export default function StatCard({ label, value, sub, icon, accent }: StatCardProps) {
	const a = ACCENT[accent];
	return (
		<div className={`bg-[#111827] border ${a.border} rounded-xl p-5 flex items-start justify-between`}>
			<div>
				<p className="text-[#dce1fb]/50 text-xs uppercase tracking-widest mb-2">{label}</p>
				<p className={`text-3xl font-bold ${a.text} leading-none mb-1`}>{value}</p>
				{sub && <p className="text-[#dce1fb]/40 text-xs mt-1">{sub}</p>}
			</div>
			<div className={`${a.iconBg} p-2.5 rounded-lg ${a.text}`}>{icon}</div>
		</div>
	);
}