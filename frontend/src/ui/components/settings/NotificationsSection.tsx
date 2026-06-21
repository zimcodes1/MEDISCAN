import { useState } from "react";
import { Save } from "lucide-react";

interface NotificationsSectionProps {
	userRole: "org-admin" | "radiologist" | "clinician";
	initialSettings: {
		scanResultReady?: boolean;
		scanAssigned?: boolean;
		reportSubmitted?: boolean;
		newStaffJoined?: boolean;
		inAppSound?: boolean;
	};
	onSave: (settings: any) => void;
}

export default function NotificationsSection({
	userRole,
	initialSettings,
	onSave,
}: NotificationsSectionProps) {
	const [scanResultReady, setScanResultReady] = useState(initialSettings.scanResultReady ?? false);
	const [scanAssigned, setScanAssigned] = useState(initialSettings.scanAssigned ?? false);
	const [reportSubmitted, setReportSubmitted] = useState(initialSettings.reportSubmitted ?? false);
	const [newStaffJoined, setNewStaffJoined] = useState(initialSettings.newStaffJoined ?? false);
	const [inAppSound, setInAppSound] = useState(initialSettings.inAppSound ?? true);

	const handleSave = () => {
		onSave({ scanResultReady, scanAssigned, reportSubmitted, newStaffJoined, inAppSound });
	};

	return (
		<div className="space-y-6 sm:pt-10">
			<div>
				<h2 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">Notifications</h2>
				<p className="text-brand-text-muted text-sm">Manage your notification preferences</p>
			</div>

			<div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-6 relative overflow-hidden group">
				{/* Email Notifications */}
				<div>
					<h3 className="text-brand-text font-bold text-sm mb-4 font-display">Email Notifications</h3>
					<div className="space-y-4">
						{userRole === "clinician" && (
							<div className="flex items-center justify-between p-4 bg-brand-card/25 border border-brand-border/40 rounded-xl transition-all duration-300">
								<div>
									<p className="text-brand-text font-semibold text-sm">Scan result is ready</p>
									<p className="text-brand-text-muted text-xs font-medium mt-0.5">
										Get notified when a radiologist completes a report
									</p>
								</div>
								<label className="relative inline-flex items-center cursor-pointer">
									<input
										type="checkbox"
										checked={scanResultReady}
										onChange={(e) => setScanResultReady(e.target.checked)}
										className="sr-only peer"
									/>
									<div className="w-11 h-6 bg-brand-bg/85 border border-brand-border/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-brand-text-muted after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary peer-checked:after:bg-brand-bg peer-checked:after:border-brand-primary"></div>
								</label>
							</div>
						)}

						{userRole === "radiologist" && (
							<div className="flex items-center justify-between p-4 bg-brand-card/25 border border-brand-border/40 rounded-xl transition-all duration-300">
								<div>
									<p className="text-brand-text font-semibold text-sm">Scan is assigned to me</p>
									<p className="text-brand-text-muted text-xs font-medium mt-0.5">
										Get notified when a new scan is assigned for review
									</p>
								</div>
								<label className="relative inline-flex items-center cursor-pointer">
									<input
										type="checkbox"
										checked={scanAssigned}
										onChange={(e) => setScanAssigned(e.target.checked)}
										className="sr-only peer"
									/>
									<div className="w-11 h-6 bg-brand-bg/85 border border-brand-border/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-brand-text-muted after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary peer-checked:after:bg-brand-bg peer-checked:after:border-brand-primary"></div>
								</label>
							</div>
						)}

						{(userRole === "clinician" || userRole === "org-admin") && (
							<div className="flex items-center justify-between p-4 bg-brand-card/25 border border-brand-border/40 rounded-xl transition-all duration-300">
								<div>
									<p className="text-brand-text font-semibold text-sm">Report is submitted</p>
									<p className="text-brand-text-muted text-xs font-medium mt-0.5">
										Get notified when a radiologist submits a report
									</p>
								</div>
								<label className="relative inline-flex items-center cursor-pointer">
									<input
										type="checkbox"
										checked={reportSubmitted}
										onChange={(e) => setReportSubmitted(e.target.checked)}
										className="sr-only peer"
									/>
									<div className="w-11 h-6 bg-brand-bg/85 border border-brand-border/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-brand-text-muted after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary peer-checked:after:bg-brand-bg"></div>
								</label>
							</div>
						)}

						{userRole === "org-admin" && (
							<div className="flex items-center justify-between p-4 bg-brand-card/25 border border-brand-border/40 rounded-xl transition-all duration-300">
								<div>
									<p className="text-brand-text font-semibold text-sm">New staff member joins</p>
									<p className="text-brand-text-muted text-xs font-medium mt-0.5">
										Get notified when a staff member accepts their invite
									</p>
								</div>
								<label className="relative inline-flex items-center cursor-pointer">
									<input
										type="checkbox"
										checked={newStaffJoined}
										onChange={(e) => setNewStaffJoined(e.target.checked)}
										className="sr-only peer"
									/>
									<div className="w-11 h-6 bg-brand-bg/85 border border-brand-border/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-brand-text-muted after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary peer-checked:after:bg-brand-bg peer-checked:after:border-brand-primary"></div>
								</label>
							</div>
						)}
					</div>
				</div>

				{/* In-App Notifications */}
				<div className="pt-6 border-t border-brand-border/30">
					<h3 className="text-brand-text font-bold text-sm mb-4 font-display">In-App Notifications</h3>
					<div className="flex items-center justify-between p-4 bg-brand-card/25 border border-brand-border/40 rounded-xl transition-all duration-300">
						<div>
							<p className="text-brand-text font-semibold text-sm">Notification sound</p>
							<p className="text-brand-text-muted text-xs font-medium mt-0.5">Play a sound for in-app notifications</p>
						</div>
						<label className="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								checked={inAppSound}
								onChange={(e) => setInAppSound(e.target.checked)}
								className="sr-only peer"
							/>
							<div className="w-11 h-6 bg-brand-bg/85 border border-brand-border/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-brand-text-muted after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary peer-checked:after:bg-brand-bg peer-checked:after:border-brand-primary"></div>
						</label>
					</div>
				</div>

				{/* Save Button */}
				<button
					onClick={handleSave}
					className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg py-3.5 rounded-xl font-extrabold text-sm hover:shadow-[0_0_20px_rgba(0,210,255,0.25)] hover:opacity-95 active:scale-95 transition-all duration-300 cursor-pointer"
				>
					<Save size={16} />
					Save Preferences
				</button>
			</div>
		</div>
	);
}
