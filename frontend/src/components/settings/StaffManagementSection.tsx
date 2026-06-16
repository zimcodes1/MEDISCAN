import { Plus, Mail, Ban, CheckCircle, Trash2, X } from "lucide-react";
import { useState } from "react";

interface StaffMember {
	id: string;
	name: string;
	role: string;
	email: string;
	status: "active" | "invited" | "suspended";
}

export default function StaffManagementSection() {
	const [staff, setStaff] = useState<StaffMember[]>([
		{ id: "1", name: "Dr. S. Chen", role: "Radiologist", email: "s.chen@hospital.com", status: "active" },
		{ id: "2", name: "Dr. M. Johnson", role: "Clinician", email: "m.johnson@hospital.com", status: "active" },
		{ id: "3", name: "Dr. A. Patel", role: "Radiologist", email: "a.patel@hospital.com", status: "invited" },
	]);

	const [showAddPanel, setShowAddPanel] = useState(false);
	const [newStaffName, setNewStaffName] = useState("");
	const [newStaffEmail, setNewStaffEmail] = useState("");
	const [newStaffRole, setNewStaffRole] = useState("clinician");

	const handleAddStaff = () => {
		const newStaff: StaffMember = {
			id: Date.now().toString(),
			name: newStaffName,
			role: newStaffRole === "radiologist" ? "Radiologist" : "Clinician",
			email: newStaffEmail,
			status: "invited",
		};
		setStaff([...staff, newStaff]);
		setShowAddPanel(false);
		setNewStaffName("");
		setNewStaffEmail("");
		setNewStaffRole("clinician");
	};

	const handleResendInvite = (id: string) => {
		console.log("Resending invite to", id);
	};

	const handleChangeRole = (id: string, newRole: string) => {
		setStaff(staff.map((s) => (s.id === id ? { ...s, role: newRole } : s)));
	};

	const handleToggleSuspend = (id: string) => {
		setStaff(
			staff.map((s) =>
				s.id === id ? { ...s, status: s.status === "suspended" ? "active" : "suspended" } : s
			)
		);
	};

	const handleRemove = (id: string) => {
		if (confirm("Are you sure you want to remove this staff member?")) {
			setStaff(staff.filter((s) => s.id !== id));
		}
	};

	return (
		<div className="space-y-6 sm:pt-10">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h2 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">Staff Management</h2>
					<p className="text-brand-text-muted text-sm">Manage team members and their access levels</p>
				</div>
				<button
					onClick={() => setShowAddPanel(true)}
					className="flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg px-4 py-2.5 rounded-xl text-xs font-extrabold hover:shadow-[0_0_20px_rgba(0,210,255,0.25)] hover:opacity-95 active:scale-95 transition-all duration-300 cursor-pointer self-start sm:self-auto"
				>
					<Plus size={15} />
					Add Staff Member
				</button>
			</div>

			{/* Staff Table */}
			<div className="w-full max-sm:hide-scrollbar overflow-x-auto glass-panel rounded-2xl border border-brand-border/40 relative">
				<table className="w-full min-w-[800px]">
					<thead className="bg-brand-card/65 border-b border-brand-border/40">
						<tr>
							<th className="text-left text-brand-text-muted text-[10px] font-bold uppercase tracking-wider px-6 py-4 font-display">
								Name
							</th>
							<th className="text-left text-brand-text-muted text-[10px] font-bold uppercase tracking-wider px-6 py-4 font-display">
								Role
							</th>
							<th className="text-left text-brand-text-muted text-[10px] font-bold uppercase tracking-wider px-6 py-4 font-display">
								Email
							</th>
							<th className="text-left text-brand-text-muted text-[10px] font-bold uppercase tracking-wider px-6 py-4 font-display">
								Status
							</th>
							<th className="text-right text-brand-text-muted text-[10px] font-bold uppercase tracking-wider px-6 py-4 font-display">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-brand-border/30">
						{staff.map((member) => (
							<tr key={member.id} className="hover:bg-brand-card/20 transition-all duration-200">
								<td className="px-6 py-4 text-brand-text font-semibold text-sm">{member.name}</td>
								<td className="px-6 py-4">
									<select
										value={member.role.toLowerCase()}
										onChange={(e) => handleChangeRole(member.id, e.target.value)}
										className="bg-brand-card/60 text-brand-text text-xs px-3 py-1.5 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300"
									>
										<option value="radiologist">Radiologist</option>
										<option value="clinician">Clinician</option>
										<option value="org-admin">Org Admin</option>
									</select>
								</td>
								<td className="px-6 py-4 text-brand-text-muted text-xs font-medium">{member.email}</td>
								<td className="px-6 py-4">
									<span
										className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border ${member.status === "active"
											? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
											: member.status === "invited"
												? "bg-brand-primary/5 border-brand-primary/20 text-brand-primary"
												: "bg-rose-500/5 border-rose-500/20 text-rose-400"
											}`}
									>
										{member.status}
									</span>
								</td>
								<td className="px-6 py-4">
									<div className="flex items-center justify-end gap-1.5">
										{member.status === "invited" && (
											<button
												onClick={() => handleResendInvite(member.id)}
												className="p-2 text-brand-primary hover:bg-brand-card hover:text-brand-primary rounded-lg transition-colors cursor-pointer"
												title="Resend invite"
											>
												<Mail size={14} />
											</button>
										)}
										<button
											onClick={() => handleToggleSuspend(member.id)}
											className="p-2 text-amber-500 hover:bg-brand-card hover:text-amber-500 rounded-lg transition-colors cursor-pointer"
											title={member.status === "suspended" ? "Reactivate" : "Suspend"}
										>
											{member.status === "suspended" ? <CheckCircle size={14} /> : <Ban size={14} />}
										</button>
										<button
											onClick={() => handleRemove(member.id)}
											className="p-2 text-rose-400 hover:bg-brand-card hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
											title="Remove"
										>
											<Trash2 size={14} />
										</button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Add Staff Slide-over Panel */}
			{showAddPanel && (
				<div className="fixed inset-0 bg-brand-bg/85 backdrop-blur-sm z-50 flex items-center justify-end">
					<div className="glass-panel w-full max-w-md h-full p-6 overflow-y-auto flex flex-col border-l border-brand-border/60">
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-xl font-extrabold text-brand-text font-display tracking-tight">Add Staff Member</h3>
							<button
								onClick={() => setShowAddPanel(false)}
								className="text-brand-text-muted hover:text-brand-text hover:bg-brand-card/45 p-1.5 rounded-lg transition-colors cursor-pointer"
							>
								<X size={20} />
							</button>
						</div>

						<div className="space-y-6">
							<div>
								<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
									Full Name
								</label>
								<input
									type="text"
									value={newStaffName}
									onChange={(e) => setNewStaffName(e.target.value)}
									className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300"
								/>
							</div>

							<div>
								<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
									Work Email
								</label>
								<input
									type="email"
									value={newStaffEmail}
									onChange={(e) => setNewStaffEmail(e.target.value)}
									className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300"
								/>
							</div>

							<div>
								<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
									Role
								</label>
								<select
									value={newStaffRole}
									onChange={(e) => setNewStaffRole(e.target.value)}
									className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300"
								>
									<option value="radiologist">Radiologist</option>
									<option value="clinician">Clinician</option>
								</select>
							</div>

							<button
								onClick={handleAddStaff}
								disabled={!newStaffName || !newStaffEmail}
								className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg py-3.5 rounded-xl font-extrabold text-sm hover:shadow-[0_0_20px_rgba(0,210,255,0.2)] hover:opacity-95 active:scale-95 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
							>
								Send Invite
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
