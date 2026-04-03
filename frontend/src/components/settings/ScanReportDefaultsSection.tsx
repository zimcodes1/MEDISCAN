import { Save } from "lucide-react";
import { useState } from "react";

interface ScanReportDefaultsSectionProps {
	initialData: {
		defaultPriority: "routine" | "urgent";
		disclaimerText: string;
		autoAssignTo: string;
	};
	radiologists: Array<{ id: string; name: string }>;
	onSave: (data: any) => void;
}

export default function ScanReportDefaultsSection({
	initialData,
	radiologists,
	onSave,
}: ScanReportDefaultsSectionProps) {
	const [defaultPriority, setDefaultPriority] = useState(initialData.defaultPriority);
	const [disclaimerText, setDisclaimerText] = useState(initialData.disclaimerText);
	const [autoAssignTo, setAutoAssignTo] = useState(initialData.autoAssignTo);

	const handleSave = () => {
		onSave({ defaultPriority, disclaimerText, autoAssignTo });
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-[#dce1fb] mb-2">Scan & Report Defaults</h2>
				<p className="text-[#dce1fb]/70">Set organisation-wide defaults for scans and reports</p>
			</div>

			<div className="bg-[#151b2d] rounded-xl p-6 space-y-6">
				{/* Default Scan Priority */}
				<div>
					<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-3">
						Default Scan Priority
					</label>
					<div className="grid grid-cols-2 gap-3">
						<button
							onClick={() => setDefaultPriority("routine")}
							className={`p-4 rounded-lg border-2 transition-all ${
								defaultPriority === "routine"
									? "border-[#7bd0ff] bg-[#191f31] text-[#7bd0ff]"
									: "border-[#2e3447] bg-transparent text-[#dce1fb] hover:border-[#7bd0ff]/50"
							}`}
						>
							Routine
						</button>
						<button
							onClick={() => setDefaultPriority("urgent")}
							className={`p-4 rounded-lg border-2 transition-all ${
								defaultPriority === "urgent"
									? "border-[#ffb95f] bg-[#191f31] text-[#ffb95f]"
									: "border-[#2e3447] bg-transparent text-[#dce1fb] hover:border-[#ffb95f]/50"
							}`}
						>
							Urgent
						</button>
					</div>
					<p className="text-[#dce1fb]/50 text-xs mt-2">
						Staff can override this when uploading individual scans
					</p>
				</div>

				{/* Default Report Disclaimer */}
				<div>
					<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
						Default Report Disclaimer Text
					</label>
					<textarea
						value={disclaimerText}
						onChange={(e) => setDisclaimerText(e.target.value)}
						rows={6}
						className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all resize-none"
					/>
					<p className="text-[#dce1fb]/50 text-xs mt-2">
						This text appears on all PDF reports. Customize to match your organisation's requirements.
					</p>
				</div>

				{/* Auto-assign Scans */}
				<div>
					<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
						Auto-assign Scans To
					</label>
					<select
						value={autoAssignTo}
						onChange={(e) => setAutoAssignTo(e.target.value)}
						className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all"
					>
						<option value="manual">Manual Assignment</option>
						{radiologists.map((rad) => (
							<option key={rad.id} value={rad.id}>
								{rad.name}
							</option>
						))}
					</select>
					<p className="text-[#dce1fb]/50 text-xs mt-2">
						Automatically assign all new scans to a specific radiologist, or require manual assignment
					</p>
				</div>

				{/* Save Button */}
				<button
					onClick={handleSave}
					className="w-full flex items-center justify-center gap-2 bg-[#7bd0ff] text-[#0c1324] py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
				>
					<Save size={18} />
					Save Defaults
				</button>
			</div>
		</div>
	);
}
