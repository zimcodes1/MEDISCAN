import { Clock, AlertTriangle } from "lucide-react";

interface AssignmentPriorityFormProps {
	uploadedBy: string;
	priority: "routine" | "urgent";
	onPriorityChange: (value: "routine" | "urgent") => void;
	assignedRadiologist: string;
	onAssignedRadiologistChange: (value: string) => void;
	/** Assignment and priority are not stored by the backend yet. */
	disabled?: boolean;
	/** Assignable staff (GET /staff). */
	staff?: { id: string; full_name: string; role?: string }[];
}

export default function AssignmentPriorityForm({
	uploadedBy,
	priority,
	onPriorityChange,
	assignedRadiologist,
	onAssignedRadiologistChange,
	disabled = false,
	staff = [],
}: AssignmentPriorityFormProps) {
	return (
		<div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-6 relative overflow-hidden group">
			<h2 className="text-lg font-bold text-brand-text font-display">Priority</h2>

			{/* Uploaded By */}
			<div>
				<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2">
					Uploaded By
				</label>
				<div className="bg-brand-card/45 border border-brand-border/40 text-brand-text-muted/80 text-sm px-4 py-3 rounded-xl font-medium">
					{uploadedBy}
				</div>
			</div>

			{disabled && (
				<p className="text-amber-500 text-xs bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-2.5 leading-snug">
					Assignment and priority are not saved yet.
				</p>
			)}

			<fieldset
				disabled={disabled}
				className="space-y-6 min-w-0 disabled:opacity-50 disabled:cursor-not-allowed"
			>
			{/* Assign Radiologist */}
			<div>
				<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2">
					Assign Radiologist
				</label>
				<select
					value={assignedRadiologist}
					onChange={(e) => onAssignedRadiologistChange(e.target.value)}
					className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border/60 outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300"
				>
					<option value="">Unassigned</option>
					{staff.map((s) => (
						<option key={s.id} value={s.id}>
							{s.full_name}
							{s.role ? ` (${s.role})` : ""}
						</option>
					))}
				</select>
			</div>

			{/* Priority */}
			<div>
				<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-3">
					Priority
				</label>
				<div className="grid grid-cols-2 gap-3">
					<button
						onClick={() => onPriorityChange("routine")}
						className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border transition-all duration-300 cursor-pointer ${
							priority === "routine"
								? "border-brand-primary/50 bg-brand-primary/10 text-brand-primary shadow-[0_0_15px_rgba(0,210,255,0.08)] font-semibold"
								: "border-brand-border/60 bg-transparent text-brand-text-muted hover:border-brand-primary/30 hover:bg-brand-card/30 hover:text-brand-text"
						}`}
					>
						<Clock size={16} />
						<span className="text-sm">Routine</span>
					</button>

					<button
						onClick={() => onPriorityChange("urgent")}
						className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border transition-all duration-300 cursor-pointer ${
							priority === "urgent"
								? "border-amber-500/50 bg-amber-500/10 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.08)] font-semibold"
								: "border-brand-border/60 bg-transparent text-brand-text-muted hover:border-amber-500/30 hover:bg-brand-card/30 hover:text-brand-text"
						}`}
					>
						<AlertTriangle size={16} />
						<span className="text-sm">Urgent</span>
					</button>
				</div>
			</div>
			</fieldset>
		</div>
	);
}


