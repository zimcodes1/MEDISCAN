import { AlertTriangle, Download, XCircle } from "lucide-react";
import { useState } from "react";

export default function DangerZoneSection() {
	const [showDeactivateModal, setShowDeactivateModal] = useState(false);
	const [confirmationText, setConfirmationText] = useState("");
	const [isExporting, setIsExporting] = useState(false);

	const orgName = "Lagos General Hospital";

	const handleExportData = () => {
		setIsExporting(true);
		// Trigger background job
		setTimeout(() => {
			setIsExporting(false);
			alert("Data export initiated. You'll receive a download link via email within 24 hours.");
		}, 2000);
	};

	const handleDeactivate = () => {
		if (confirmationText === orgName) {
			// Deactivate org
			alert("Organisation account deactivated. All staff access has been suspended.");
			setShowDeactivateModal(false);
		}
	};

	return (
		<div className="space-y-6 sm:pt-10">
			<div>
				<h2 className="text-3xl font-extrabold text-rose-500 tracking-tight font-display mb-2">Danger Zone</h2>
				<p className="text-brand-text-muted text-sm">Irreversible actions that affect your entire organisation</p>
			</div>

			<div className="glass-panel border-rose-500/25 bg-rose-500/[0.01] rounded-2xl p-4 sm:p-6 space-y-6 relative overflow-hidden group">
				{/* Export All Data */}
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-brand-card/25 border border-brand-border/40 rounded-xl transition-all duration-300 gap-4">
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-2">
							<Download size={20} className="text-brand-primary" />
							<h3 className="text-brand-text font-semibold text-sm">Export All Data</h3>
						</div>
						<p className="text-brand-text-muted text-xs font-medium mt-0.5">
							Download a complete archive of all patient records, scans, and reports. This process may
							take up to 24 hours. You'll receive a download link via email.
						</p>
						<p className="text-brand-text-muted/60 text-[10px] font-semibold mt-1">
							Required for NDPR compliance and data portability
						</p>
					</div>
					<button
						onClick={handleExportData}
						disabled={isExporting}
						className="sm:ml-4 flex items-center justify-center gap-2 bg-brand-card text-brand-primary border border-brand-border/60 hover:bg-brand-card/85 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
					>
						{isExporting ? "Exporting..." : "Export Data"}
					</button>
				</div>

				{/* Deactivate Organisation */}
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-rose-500/[0.03] border border-rose-500/20 rounded-xl transition-all duration-300 gap-4">
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-2">
							<XCircle size={20} className="text-rose-500" />
							<h3 className="text-rose-500 font-semibold text-sm">Deactivate Organisation Account</h3>
						</div>
						<p className="text-brand-text-muted text-xs font-medium mt-0.5">
							Permanently suspend all staff access and stop all billing. This action can be reversed by
							contacting support within 30 days. After 30 days, all data will be permanently deleted.
						</p>
						<div className="flex items-center gap-2 mt-2 text-rose-500/80 text-[10px] font-semibold">
							<AlertTriangle size={12} />
							<span>This action requires confirmation</span>
						</div>
					</div>
					<button
						onClick={() => setShowDeactivateModal(true)}
						className="sm:ml-4 flex items-center justify-center gap-2 bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap cursor-pointer"
					>
						Deactivate Account
					</button>
				</div>
			</div>

			{/* Deactivation Confirmation Modal */}
			{showDeactivateModal && (
				<div className="fixed inset-0 bg-brand-bg/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
					<div className="glass-panel border-rose-500/30 bg-brand-card rounded-2xl p-6 max-w-md w-full relative overflow-hidden shadow-2xl">
						<div className="flex items-center gap-3 mb-4">
							<AlertTriangle size={32} className="text-rose-500" />
							<h3 className="text-xl font-extrabold text-rose-500 tracking-tight font-display">Confirm Deactivation</h3>
						</div>

						<p className="text-brand-text text-sm mb-4 leading-relaxed font-medium">
							This will immediately suspend access for all staff members and stop billing. Your data will
							be retained for 30 days in case you change your mind.
						</p>

						<p className="text-brand-text-muted text-xs font-medium mb-4">
							Type <span className="font-mono font-bold text-brand-text bg-brand-bg/80 px-2 py-0.5 rounded border border-brand-border/40">{orgName}</span> to confirm:
						</p>

						<input
							type="text"
							value={confirmationText}
							onChange={(e) => setConfirmationText(e.target.value)}
							placeholder="Type organisation name"
							className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-rose-500/50 focus:bg-brand-card transition-all duration-300 placeholder-brand-text-muted/40 mb-6"
						/>

						<div className="flex gap-3">
							<button
								onClick={() => {
									setShowDeactivateModal(false);
									setConfirmationText("");
								}}
								className="flex-1 bg-brand-card text-brand-text-muted border border-brand-border/60 hover:text-brand-text hover:bg-brand-card-hover py-3 rounded-xl font-bold text-sm transition-all duration-300 cursor-pointer"
							>
								Cancel
							</button>
							<button
								onClick={handleDeactivate}
								disabled={confirmationText !== orgName}
								className="flex-1 bg-rose-600 text-brand-text py-3 rounded-xl font-bold text-sm hover:bg-rose-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] active:scale-95 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
							>
								Deactivate
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
