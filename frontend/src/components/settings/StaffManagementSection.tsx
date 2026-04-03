import { Plus, Mail, Edit, Ban, CheckCircle, Trash2, X } from "lucide-react";
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
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold text-[#dce1fb] mb-2">Staff Management</h2>
					<p className="text-[#dce1fb]/70">Manage team members and their access levels</p>
				</div>
				<button
					onClick={() => setShowAddPanel(true)}
					className="flex items-center gap-2 bg-[#7bd0ff] text-[#0c1324] px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
				>
					<Plus size={18} />
					Add Staff Member
				</button>
			</div>

			{/* Staff Table */}
			<div className="bg-[#151b2d] rounded-xl overflow-hidden">
				<table className="w-full">
					<thead className="bg-[#191f31]">
						<tr>
							<th className="text-left text-[#dce1fb]/70 text-xs uppercase tracking-wide px-6 py-4">
								Name
							</th>
							<th className="text-left text-[#dce1fb]/70 text-xs uppercase tracking-wide px-6 py-4">
								Role
							</th>
							<th className="text-left text-[#dce1fb]/70 text-xs uppercase tracking-wide px-6 py-4">
								Email
							</th>
							<th className="text-left text-[#dce1fb]/70 text-xs uppercase tracking-wide px-6 py-4">
								Status
							</th>
							<th className="text-right text-[#dce1fb]/70 text-xs uppercase tracking-wide px-6 py-4">
								Actions
							</th>
						</tr>
					</thead>
					<tbody>
						{staff.map((member) => (
							<tr key={member.id} className="border-t border-[#191f31]">
								<td className="px-6 py-4 text-[#dce1fb] font-semibold">{member.name}</td>
								<td className="px-6 py-4">
									<select
										value={member.role.toLowerCase()}
										onChange={(e) => handleChangeRole(member.id, e.target.value)}
										className="bg-[#191f31] text-[#dce1fb] px-3 py-1 rounded text-sm outline-none focus:ring-2 focus:ring-[#7bd0ff]/50"
									>
										<option value="radiologist">Radiologist</option>
										<option value="clinician">Clinician</option>
										<option value="org-admin">Org Admin</option>
									</select>
								</td>
								<td className="px-6 py-4 text-[#dce1fb]/70">{member.email}</td>
								<td className="px-6 py-4">
									<span
										className={`px-3 py-1 rounded-full text-xs font-semibold ${
											member.status === "active"
												? "bg-[#4ade80]/10 text-[#4ade80]"
												: member.status === "invited"
												? "bg-[#7bd0ff]/10 text-[#7bd0ff]"
												: "bg-[#ffb4ab]/10 text-[#ffb4ab]"
										}`}
									>
										{member.status.charAt(0).toUpperCase() + member.status.slice(1)}
									</span>
								</td>
								<td className="px-6 py-4">
									<div className="flex items-center justify-end gap-2">
										{member.status === "invited" && (
											<button
												onClick={() => handleResendInvite(member.id)}
												className="p-2 text-[#7bd0ff] hover:bg-[#191f31] rounded transition-colors"
												title="Resend invite"
											>
												<Mail size={16} />
											</button>
										)}
										<button
											onClick={() => handleToggleSuspend(member.id)}
											className="p-2 text-[#ffb95f] hover:bg-[#191f31] rounded transition-colors"
											title={member.status === "suspended" ? "Reactivate" : "Suspend"}
										>
											{member.status === "suspended" ? <CheckCircle size={16} /> : <Ban size={16} />}
										</button>
										<button
											onClick={() => handleRemove(member.id)}
											className="p-2 text-[#ffb4ab] hover:bg-[#191f31] rounded transition-colors"
											title="Remove"
										>
											<Trash2 size={16} />
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
				<div className="fixed inset-0 bg-[#0c1324]/80 z-50 flex items-center justify-end">
					<div className="bg-[#151b2d] w-full max-w-md h-full p-6 overflow-y-auto">
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-xl font-bold text-[#dce1fb]">Add Staff Member</h3>
							<button
								onClick={() => setShowAddPanel(false)}
								className="text-[#dce1fb]/70 hover:text-[#dce1fb] transition-colors"
							>
								<X size={24} />
							</button>
						</div>

						<div className="space-y-6">
							<div>
								<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
									Full Name
								</label>
								<input
									type="text"
									value={newStaffName}
									onChange={(e) => setNewStaffName(e.target.value)}
									className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all"
								/>
							</div>

							<div>
								<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
									Work Email
								</label>
								<input
									type="email"
									value={newStaffEmail}
									onChange={(e) => setNewStaffEmail(e.target.value)}
									className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all"
								/>
							</div>

							<div>
								<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
									Role
								</label>
								<select
									value={newStaffRole}
									onChange={(e) => setNewStaffRole(e.target.value)}
									className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all"
								>
									<option value="radiologist">Radiologist</option>
									<option value="clinician">Clinician</option>
								</select>
							</div>

							<button
								onClick={handleAddStaff}
								disabled={!newStaffName || !newStaffEmail}
								className="w-full bg-[#7bd0ff] text-[#0c1324] py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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
