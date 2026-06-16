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
		<div className="space-y-6 sm:pt-10">
			<div>
				<h2 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">My Profile</h2>
				<p className="text-brand-text-muted text-sm">Manage your personal information and account settings</p>
			</div>

			<div className="glass-panel rounded-2xl p-6 space-y-6 relative overflow-hidden group">
				{/* Profile Photo */}
				<div>
					<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-3 font-display">
						Profile Photo
					</label>
					<div className="flex items-center gap-4">
						<div className="w-20 h-20 bg-brand-card border border-brand-border/40 rounded-full overflow-hidden flex items-center justify-center shadow-inner">
							{profilePhoto ? (
								<img
									src={profilePhoto}
									alt={fullName}
									className="w-full h-full object-cover"
								/>
							) : (
								<span className="text-brand-primary font-bold text-2xl font-display">
									{fullName.charAt(0).toUpperCase()}
								</span>
							)}
						</div>
						<label className="cursor-pointer">
							<input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
							<span className="flex items-center gap-2 bg-brand-card text-brand-primary border border-brand-border/60 hover:bg-brand-card/85 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300">
								<Upload size={14} />
								Upload Photo
							</span>
						</label>
					</div>
				</div>

				{/* Full Name */}
				<div>
					<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
						Full Name
					</label>
					<input
						type="text"
						value={fullName}
						onChange={(e) => setFullName(e.target.value)}
						className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300"
					/>
				</div>

				{/* Job Title */}
				<div>
					<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
						Job Title
					</label>
					<input
						type="text"
						value={jobTitle}
						onChange={(e) => setJobTitle(e.target.value)}
						className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300"
					/>
				</div>

				{/* Email */}
				<div>
					<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
						Email Address
					</label>
					<input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300"
					/>
					<p className="text-brand-text-muted/60 text-[10px] font-semibold mt-1">
						Changing your email will require re-verification
					</p>
				</div>

				{/* Phone Number */}
				<div>
					<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
						Phone Number
					</label>
					<input
						type="tel"
						value={phoneNumber}
						onChange={(e) => setPhoneNumber(e.target.value)}
						className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300"
					/>
				</div>

				{/* Password Section */}
				<div className="pt-6 border-t border-brand-border/30">
					<h3 className="text-brand-text font-bold text-sm mb-4 font-display">Change Password</h3>

					<div className="space-y-4">
						<div>
							<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
								Current Password *
							</label>
							<input
								type="password"
								value={currentPassword}
								onChange={(e) => setCurrentPassword(e.target.value)}
								placeholder="Required to save any changes"
								className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300 placeholder-brand-text-muted/40"
							/>
						</div>

						<div>
							<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
								New Password (Optional)
							</label>
							<input
								type="password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								placeholder="Leave blank to keep current password"
								className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300 placeholder-brand-text-muted/40"
							/>
						</div>

						<div>
							<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
								Confirm New Password
							</label>
							<input
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300"
							/>
						</div>
					</div>
				</div>

				{/* Save Button */}
				<button
					onClick={handleSave}
					className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg py-3.5 rounded-xl font-extrabold text-sm hover:shadow-[0_0_20px_rgba(0,210,255,0.25)] hover:opacity-95 active:scale-95 transition-all duration-300 cursor-pointer"
				>
					<Save size={16} />
					Save Changes
				</button>
			</div>
		</div>
	);
}
