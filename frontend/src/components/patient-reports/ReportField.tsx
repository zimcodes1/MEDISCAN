interface ReportFieldProps {
	label: string;
	value: string | React.ReactNode;
	fullWidth?: boolean;
}

export default function ReportField({ label, value, fullWidth = false }: ReportFieldProps) {
	return (
		<div className={fullWidth ? "col-span-2" : ""}>
			<p className="text-[#dce1fb]/70 text-sm mb-1">{label}</p>
			<p className="text-[#dce1fb] font-semibold">{value}</p>
		</div>
	);
}
