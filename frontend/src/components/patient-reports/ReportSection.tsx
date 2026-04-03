interface ReportSectionProps {
	title: string;
	children: React.ReactNode;
	highlight?: boolean;
}

export default function ReportSection({ title, children, highlight = false }: ReportSectionProps) {
	return (
		<div className={`rounded-xl p-6 mb-6 ${highlight ? "bg-[#ffb95f]/10 border-l-4 border-[#ffb95f]" : "bg-[#151b2d]"}`}>
			<h2 className="text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-4">{title}</h2>
			<div className="space-y-3">{children}</div>
		</div>
	);
}
