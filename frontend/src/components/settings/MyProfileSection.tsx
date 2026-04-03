import { Upload, Save } from "lucide-react";
import { useState } from "react";

interface MyProfileSectionProps {
	initialData: {
		fullName: string;
		jobTitle: string;
		email: string;
		phoneNumber: string;
		profilePhoto?: string;
	};
	onSave: (data: any) => void;
}

export default function MyProfileSection({ initialData, onSave }: MyProfileSectionProps) {
	const [fullName, setFullName] = useState(initialData.fullName);
	const [jobTitle, setJobTitle] = useState(initialData.jobTitle);
	const [email, setEmail] = useState(initialData.email);
	const [phoneNumber, setPhoneNumber] = useState(initialData.phoneNumber);
	const [profilePhoto, setProfilePhoto] = useState(initialData.profilePhoto);
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const reader = new FileReader();
			reader.onload = (event) => {
				setProfilePhoto(event.target?.result as string);
			};
			reader.readAsDataURL(e.target.files[0]);
		}
	};

	const handleSave = () => {
		if (!currentPassword) {
			alert("Current password is required to save changes");
			return;
		}
		onSave({ fullName, jobTitle, email, phoneNumber, profilePhoto, currentPassword, newPassword });
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-[#dce1fb] mb-2">My Profile</h2>
				<p className="text-[#dce1fb]/70">Manage your personal information and account settings</p>
			</div>

			<div className="bg-[#151b2d] rounded-xl p-6 space-y-6">
				{/* Profile Photo */}
				<div>
					<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-3">
						Profile Photo
					</label>
					<div className="flex items-center gap-4">
						<div className="w-20 h-20 bg-[#191f31] rounded-full overflow-hidden flex items-center justify-center">
							{profilePhoto ? (
								<img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
							) : (
								<span className="text-[#dce1fb]/50 text-2xl">
									{fullName.charAt(0).toUpperCase()}
								</span>
							)}
						</div>
						<label className="cursor-pointer">
							<input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
							<span className="flex items-center gap-2 bg-[#2e3447] text-[#7bd0ff] px-4 py-2 rounded-lg hover:bg-[#191f31] transition-colors">
								<Upload size={16} />
								Upload Photo
							</span>
						</label>
					</div>
				</div>

				{/* Full Name */}
				<div>
					<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
						Full Name
					</label>
					<input
						type="text"
						value={fullName}
						onChange={(e) => setFullName(e.target.value)}
						className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all"
					/>
				</div>

				{/* Job Title */}
				<div>
					<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
						Job Title
					</label>
					<input
						type="text"
						value={jobTitle}
						onChange={(e) => setJobTitle(e.target.value)}
						className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all"
					/>
				</div>

				{/* Email */}
				<div>
					<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
						Email Address
					</label>
					<input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all"
					/>
					<p className="text-[#dce1fb]/50 text-xs mt-1">
						Changing your email will require re-verification
					</p>
				</div>

				{/* Phone Number */}
				<div>
					<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
						Phone Number
					</label>
					<input
						type="tel"
						value={phoneNumber}
						onChange={(e) => setPhoneNumber(e.target.value)}
						className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all"
					/>
				</div>

				{/* Password Section */}
				<div className="pt-6 border-t border-[#2e3447]">
					<h3 className="text-[#dce1fb] font-semibold mb-4">Change Password</h3>
					
					<div className="space-y-4">
						<div>
							<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
								Current Password *
							</label>
							<input
								type="password"
								value={currentPassword}
								onChange={(e) => setCurrentPassword(e.target.value)}
								placeholder="Required to save any changes"
								className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all"
							/>
						</div>

						<div>
							<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
								New Password (Optional)
							</label>
							<input
								type="password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								placeholder="Leave blank to keep current password"
								className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all"
							/>
						</div>

						<div>
							<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
								Confirm New Password
							</label>
							<input
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all"
							/>
						</div>
					</div>
				</div>

				{/* Save Button */}
				<button
					onClick={handleSave}
					className="w-full flex items-center justify-center gap-2 bg-[#7bd0ff] text-[#0c1324] py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
				>
					<Save size={18} />
					Save Changes
				</button>
			</div>
		</div>
	);
}
