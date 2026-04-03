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
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-[#ffb4ab] mb-2">Danger Zone</h2>
				<p className="text-[#dce1fb]/70">Irreversible actions that affect your entire organisation</p>
			</div>

			<div className="bg-[#151b2d] border-2 border-[#ffb4ab]/30 rounded-xl p-6 space-y-6">
				{/* Export All Data */}
				<div className="flex items-start justify-between p-4 bg-[#191f31] rounded-lg">
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-2">
							<Download size={20} className="text-[#7bd0ff]" />
							<h3 className="text-[#dce1fb] font-semibold">Export All Data</h3>
						</div>
						<p className="text-[#dce1fb]/70 text-sm">
							Download a complete archive of all patient records, scans, and reports. This process may
							take up to 24 hours. You'll receive a download link via email.
						</p>
						<p className="text-[#dce1fb]/50 text-xs mt-2">
							Required for NDPR compliance and data portability
						</p>
					</div>
					<button
						onClick={handleExportData}
						disabled={isExporting}
						className="ml-4 flex items-center gap-2 bg-[#2e3447] text-[#7bd0ff] px-4 py-2 rounded-lg font-semibold hover:bg-[#191f31] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
					>
						{isExporting ? "Exporting..." : "Export Data"}
					</button>
				</div>

				{/* Deactivate Organisation */}
				<div className="flex items-start justify-between p-4 bg-[#ffb4ab]/5 border border-[#ffb4ab]/30 rounded-lg">
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-2">
							<XCircle size={20} className="text-[#ffb4ab]" />
							<h3 className="text-[#ffb4ab] font-semibold">Deactivate Organisation Account</h3>
						</div>
						<p className="text-[#dce1fb]/70 text-sm">
							Permanently suspend all staff access and stop all billing. This action can be reversed by
							contacting support within 30 days. After 30 days, all data will be permanently deleted.
						</p>
						<div className="flex items-center gap-2 mt-3 text-[#ffb4ab] text-xs">
							<AlertTriangle size={14} />
							<span className="font-semibold">This action requires confirmation</span>
						</div>
					</div>
					<button
						onClick={() => setShowDeactivateModal(true)}
						className="ml-4 flex items-center gap-2 bg-[#ffb4ab]/10 text-[#ffb4ab] px-4 py-2 rounded-lg font-semibold hover:bg-[#ffb4ab]/20 transition-colors border border-[#ffb4ab]/30 whitespace-nowrap"
					>
						Deactivate Account
					</button>
				</div>
			</div>

			{/* Deactivation Confirmation Modal */}
			{showDeactivateModal && (
				<div className="fixed inset-0 bg-[#0c1324]/90 z-50 flex items-center justify-center p-4">
					<div className="bg-[#151b2d] rounded-xl p-6 max-w-md w-full border-2 border-[#ffb4ab]/30">
						<div className="flex items-center gap-3 mb-4">
							<AlertTriangle size={32} className="text-[#ffb4ab]" />
							<h3 className="text-xl font-bold text-[#ffb4ab]">Confirm Deactivation</h3>
						</div>

						<p className="text-[#dce1fb] mb-4">
							This will immediately suspend access for all staff members and stop billing. Your data will
							be retained for 30 days in case you change your mind.
						</p>

						<p className="text-[#dce1fb]/70 text-sm mb-4">
							Type <span className="font-mono font-semibold text-[#dce1fb]">{orgName}</span> to confirm:
						</p>

						<input
							type="text"
							value={confirmationText}
							onChange={(e) => setConfirmationText(e.target.value)}
							placeholder="Type organisation name"
							className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#ffb4ab]/50 transition-all mb-6"
						/>

						<div className="flex gap-3">
							<button
								onClick={() => {
									setShowDeactivateModal(false);
									setConfirmationText("");
								}}
								className="flex-1 bg-[#2e3447] text-[#dce1fb] py-3 rounded-lg font-semibold hover:bg-[#191f31] transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={handleDeactivate}
								disabled={confirmationText !== orgName}
								className="flex-1 bg-[#ffb4ab] text-[#0c1324] py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Deactivate Account
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
