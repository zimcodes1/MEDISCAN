interface ReportHeaderProps {
	orgName: string;
	orgLogo?: string;
	reportId: string;
	reportDate: string;
}

export default function ReportHeader({ orgName, orgLogo, reportId, reportDate }: ReportHeaderProps) {
	return (
		<div className="bg-[#151b2d] rounded-xl p-6 mb-6">
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-4">
					{orgLogo && (
						<img src={orgLogo} alt={orgName} className="w-16 h-16 object-contain" />
					)}
					<div>
						<h1 className="text-2xl font-bold text-[#dce1fb]">{orgName}</h1>
						<p className="text-[#dce1fb]/70 text-sm">Diagnostic Radiology Report</p>
					</div>
				</div>
				<div className="text-right">
					<p className="text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-1">Report ID</p>
					<p className="text-[#dce1fb] font-mono font-semibold">{reportId}</p>
					<p className="text-[#dce1fb]/70 text-xs mt-2">{reportDate}</p>
				</div>
			</div>
		</div>
	);
}
