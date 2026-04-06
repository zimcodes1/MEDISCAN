interface ReportFieldProps {
	label: string;
	value: string | React.ReactNode;
	fullWidth?: boolean;
}

export default function ReportField({ label, value, fullWidth = false }: ReportFieldProps) {
	return (
		<div className={`${fullWidth ? "sm:col-span-2" : ""} min-w-0`}>
			<p className="text-[#dce1fb]/70 text-sm mb-1 break-words">{label}</p>
			<p className="text-[#dce1fb] font-semibold break-words whitespace-pre-wrap">{value}</p>
		</div>
	);
}
