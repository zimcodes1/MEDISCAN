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
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-[#dce1fb] mb-2">Notifications</h2>
				<p className="text-[#dce1fb]/70">Manage your notification preferences</p>
			</div>

			<div className="bg-[#151b2d] rounded-xl p-6 space-y-6">
				{/* Email Notifications */}
				<div>
					<h3 className="text-[#dce1fb] font-semibold mb-4">Email Notifications</h3>
					<div className="space-y-4">
						{userRole === "clinician" && (
							<div className="flex items-center justify-between p-4 bg-[#191f31] rounded-lg">
								<div>
									<p className="text-[#dce1fb] font-medium">Scan result is ready</p>
									<p className="text-[#dce1fb]/70 text-sm">
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
									<div className="w-11 h-6 bg-[#2e3447] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7bd0ff]"></div>
								</label>
							</div>
						)}

						{userRole === "radiologist" && (
							<div className="flex items-center justify-between p-4 bg-[#191f31] rounded-lg">
								<div>
									<p className="text-[#dce1fb] font-medium">Scan is assigned to me</p>
									<p className="text-[#dce1fb]/70 text-sm">
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
									<div className="w-11 h-6 bg-[#2e3447] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7bd0ff]"></div>
								</label>
							</div>
						)}

						{(userRole === "clinician" || userRole === "org-admin") && (
							<div className="flex items-center justify-between p-4 bg-[#191f31] rounded-lg">
								<div>
									<p className="text-[#dce1fb] font-medium">Report is submitted</p>
									<p className="text-[#dce1fb]/70 text-sm">
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
									<div className="w-11 h-6 bg-[#2e3447] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7bd0ff]"></div>
								</label>
							</div>
						)}

						{userRole === "org-admin" && (
							<div className="flex items-center justify-between p-4 bg-[#191f31] rounded-lg">
								<div>
									<p className="text-[#dce1fb] font-medium">New staff member joins</p>
									<p className="text-[#dce1fb]/70 text-sm">
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
									<div className="w-11 h-6 bg-[#2e3447] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7bd0ff]"></div>
								</label>
							</div>
						)}
					</div>
				</div>

				{/* In-App Notifications */}
				<div className="pt-6 border-t border-[#2e3447]">
					<h3 className="text-[#dce1fb] font-semibold mb-4">In-App Notifications</h3>
					<div className="flex items-center justify-between p-4 bg-[#191f31] rounded-lg">
						<div>
							<p className="text-[#dce1fb] font-medium">Notification sound</p>
							<p className="text-[#dce1fb]/70 text-sm">Play a sound for in-app notifications</p>
						</div>
						<label className="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								checked={inAppSound}
								onChange={(e) => setInAppSound(e.target.checked)}
								className="sr-only peer"
							/>
							<div className="w-11 h-6 bg-[#2e3447] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7bd0ff]"></div>
						</label>
					</div>
				</div>

				{/* Save Button */}
				<button
					onClick={handleSave}
					className="w-full flex items-center justify-center gap-2 bg-[#7bd0ff] text-[#0c1324] py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
				>
					<Save size={18} />
					Save Preferences
				</button>
			</div>
		</div>
	);
}
