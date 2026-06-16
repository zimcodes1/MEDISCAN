interface ReportFieldProps {
	label: string;
	value: string | React.ReactNode;
	fullWidth?: boolean;
}

export default function ReportField({ label, value, fullWidth = false }: ReportFieldProps) {
	return (
		<div className={fullWidth ? "col-span-2 border-t border-brand-border/30 pt-3 mt-1" : ""}>
			<p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-1 font-display">{label}</p>
			<div className="text-brand-text text-sm font-semibold leading-relaxed">{value}</div>
		</div>
	);
}
