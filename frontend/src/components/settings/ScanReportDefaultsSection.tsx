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
		<div className="space-y-6 sm:pt-10">
			<div>
				<h2 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">Scan & Report Defaults</h2>
				<p className="text-brand-text-muted text-sm">Set organisation-wide defaults for scans and reports</p>
			</div>

			<div className="glass-panel rounded-2xl p-6 space-y-6 relative overflow-hidden group">
				{/* Default Scan Priority */}
				<div>
					<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-3 font-display">
						Default Scan Priority
					</label>
					<div className="grid grid-cols-2 gap-3">
						<button
							type="button"
							onClick={() => setDefaultPriority("routine")}
							className={`p-4 rounded-xl border text-xs font-bold transition-all duration-300 cursor-pointer ${
								defaultPriority === "routine"
									? "border-brand-primary bg-brand-primary/10 text-brand-primary font-extrabold shadow-[0_0_15px_rgba(0,210,255,0.08)]"
									: "border-brand-border/60 bg-brand-card/30 text-brand-text hover:border-brand-primary/45"
							}`}
						>
							Routine
						</button>
						<button
							type="button"
							onClick={() => setDefaultPriority("urgent")}
							className={`p-4 rounded-xl border text-xs font-bold transition-all duration-300 cursor-pointer ${
								defaultPriority === "urgent"
									? "border-amber-500 bg-amber-500/10 text-amber-500 font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.08)]"
									: "border-brand-border/60 bg-brand-card/30 text-brand-text hover:border-amber-500/45"
							}`}
						>
							Urgent
						</button>
					</div>
					<p className="text-brand-text-muted/65 text-[10px] font-semibold mt-2">
						Staff can override this when uploading individual scans
					</p>
				</div>

				{/* Default Report Disclaimer */}
				<div>
					<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
						Default Report Disclaimer Text
					</label>
					<textarea
						value={disclaimerText}
						onChange={(e) => setDisclaimerText(e.target.value)}
						rows={6}
						className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300 resize-none"
					/>
					<p className="text-brand-text-muted/65 text-[10px] font-semibold mt-2">
						This text appears on all PDF reports. Customize to match your organisation's requirements.
					</p>
				</div>

				{/* Auto-assign Scans */}
				<div>
					<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
						Auto-assign Scans To
					</label>
					<select
						value={autoAssignTo}
						onChange={(e) => setAutoAssignTo(e.target.value)}
						className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300"
					>
						<option value="manual">Manual Assignment</option>
						{radiologists.map((rad) => (
							<option key={rad.id} value={rad.id}>
								{rad.name}
							</option>
						))}
					</select>
					<p className="text-brand-text-muted/65 text-[10px] font-semibold mt-2">
						Automatically assign all new scans to a specific radiologist, or require manual assignment
					</p>
				</div>

				{/* Save Button */}
				<button
					onClick={handleSave}
					className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg py-3.5 rounded-xl font-extrabold text-sm hover:shadow-[0_0_20px_rgba(0,210,255,0.25)] hover:opacity-95 active:scale-95 transition-all duration-300 cursor-pointer"
				>
					<Save size={16} />
					Save Defaults
				</button>
			</div>
		</div>
	);
}
