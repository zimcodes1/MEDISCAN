interface ReportSectionProps {
	title: string;
	children: React.ReactNode;
	highlight?: boolean;
}

export default function ReportSection({ title, children, highlight = false }: ReportSectionProps) {
	return (
		<div className={`rounded-2xl p-6 mb-6 relative overflow-hidden group ${
			highlight 
				? "bg-amber-500/5 border border-amber-500/25" 
				: "glass-panel"
		}`}>
			<h2 className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-4 font-display">
				{title}
			</h2>
			<div className="space-y-3">{children}</div>
		</div>
	);
}
