interface ReportHeaderProps {
	orgName: string;
	orgLogo?: string;
	reportId: string;
	reportDate: string;
}

export default function ReportHeader({ orgName, orgLogo, reportId, reportDate }: ReportHeaderProps) {
	return (
		<div className="glass-panel rounded-2xl p-6 mb-6 relative overflow-hidden group">
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div className="flex items-center gap-4">
					{orgLogo && (
						<div className="w-16 h-16 rounded-xl bg-brand-card border border-brand-border/60 p-2 flex items-center justify-center">
							<img src={orgLogo} alt={orgName} className="max-w-full max-h-full object-contain" />
						</div>
					)}
					<div>
						<h1 className="text-xl font-extrabold text-brand-text font-display tracking-tight">{orgName}</h1>
						<p className="text-brand-text-muted text-xs font-semibold">Diagnostic Radiology Report</p>
					</div>
				</div>
				<div className="sm:text-right w-full sm:w-auto border-t sm:border-t-0 border-brand-border/30 pt-3 sm:pt-0">
					<p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">Report ID</p>
					<p className="text-brand-primary font-mono text-xs font-bold">{reportId}</p>
					<p className="text-brand-text-muted text-[11px] mt-1.5 font-medium">{reportDate}</p>
				</div>
			</div>
		</div>
	);
}
