import { Clock, AlertTriangle } from "lucide-react";

interface AssignmentPriorityFormProps {
	uploadedBy: string;
	assignedRadiologist: string;
	priority: "routine" | "urgent";
	onAssignedRadiologistChange: (value: string) => void;
	onPriorityChange: (value: "routine" | "urgent") => void;
}

export default function AssignmentPriorityForm({
	uploadedBy,
	assignedRadiologist,
	priority,
	onAssignedRadiologistChange,
	onPriorityChange,
}: AssignmentPriorityFormProps) {
	const radiologists = [
		{ id: "1", name: "Dr. S. Chen" },
		{ id: "2", name: "Dr. A. Patel" },
		{ id: "3", name: "Dr. M. Johnson" },
	];

	return (
		<div className="bg-[#151b2d] rounded-xl p-6 space-y-6">
			<h2 className="text-xl font-bold text-[#dce1fb]">Assignment & Priority</h2>

			{/* Uploaded By */}
			<div>
				<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
					Uploaded By
				</label>
				<div className="bg-[#191f31] text-[#dce1fb]/70 px-4 py-3 rounded-lg">
					{uploadedBy}
				</div>
			</div>

			{/* Assign to Radiologist */}
			<div>
				<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
					Assign to Radiologist
				</label>
				<select
					value={assignedRadiologist}
					onChange={(e) => onAssignedRadiologistChange(e.target.value)}
					className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all"
				>
					<option value="">Select radiologist...</option>
					{radiologists.map((rad) => (
						<option key={rad.id} value={rad.id}>
							{rad.name}
						</option>
					))}
				</select>
			</div>

			{/* Priority */}
			<div>
				<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-3">
					Priority
				</label>
				<div className="grid grid-cols-2 gap-3">
					<button
						onClick={() => onPriorityChange("routine")}
						className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
							priority === "routine"
								? "border-[#7bd0ff] bg-[#191f31]"
								: "border-[#2e3447] bg-transparent hover:border-[#7bd0ff]/50"
						}`}
					>
						<Clock size={20} className={priority === "routine" ? "text-[#7bd0ff]" : "text-[#dce1fb]/50"} />
						<span className={priority === "routine" ? "text-[#7bd0ff] font-semibold" : "text-[#dce1fb]/70"}>
							Routine
						</span>
					</button>

					<button
						onClick={() => onPriorityChange("urgent")}
						className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
							priority === "urgent"
								? "border-[#ffb95f] bg-[#191f31]"
								: "border-[#2e3447] bg-transparent hover:border-[#ffb95f]/50"
						}`}
					>
						<AlertTriangle size={20} className={priority === "urgent" ? "text-[#ffb95f]" : "text-[#dce1fb]/50"} />
						<span className={priority === "urgent" ? "text-[#ffb95f] font-semibold" : "text-[#dce1fb]/70"}>
							Urgent
						</span>
					</button>
				</div>
			</div>
		</div>
	);
}
