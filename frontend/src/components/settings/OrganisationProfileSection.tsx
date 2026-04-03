import { Upload, Save } from "lucide-react";
import { useState } from "react";

interface OrganisationProfileSectionProps {
	initialData: {
		orgName: string;
		orgType: string;
		state: string;
		phoneNumber: string;
		logo?: string;
		orgId: string;
	};
	onSave: (data: any) => void;
}

export default function OrganisationProfileSection({ initialData, onSave }: OrganisationProfileSectionProps) {
	const [orgName, setOrgName] = useState(initialData.orgName);
	const [orgType, setOrgType] = useState(initialData.orgType);
	const [state, setState] = useState(initialData.state);
	const [phoneNumber, setPhoneNumber] = useState(initialData.phoneNumber);
	const [logo, setLogo] = useState(initialData.logo);

	const nigerianStates = [
		"Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River",
		"Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano",
		"Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
		"Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
	];

	const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const reader = new FileReader();
			reader.onload = (event) => {
				setLogo(event.target?.result as string);
			};
			reader.readAsDataURL(e.target.files[0]);
		}
	};

	const handleSave = () => {
		onSave({ orgName, orgType, state, phoneNumber, logo });
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-[#dce1fb] mb-2">Organisation Profile</h2>
				<p className="text-[#dce1fb]/70">Manage your organisation's information and branding</p>
			</div>

			<div className="bg-[#151b2d] rounded-xl p-6 space-y-6">
				{/* Organisation Logo */}
				<div>
					<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-3">
						Organisation Logo
					</label>
					<div className="flex items-center gap-4">
						<div className="w-20 h-20 bg-[#191f31] rounded-lg overflow-hidden flex items-center justify-center">
							{logo ? (
								<img src={logo} alt="Organisation logo" className="w-full h-full object-contain" />
							) : (
								<span className="text-[#dce1fb]/50 text-xs text-center px-2">No logo</span>
							)}
						</div>
						<label className="cursor-pointer">
							<input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
							<span className="flex items-center gap-2 bg-[#2e3447] text-[#7bd0ff] px-4 py-2 rounded-lg hover:bg-[#191f31] transition-colors">
								<Upload size={16} />
								Upload Logo
							</span>
						</label>
					</div>
					<p className="text-[#dce1fb]/50 text-xs mt-2">
						Shown in report PDFs and dashboard header
					</p>
				</div>

				{/* Organisation Name */}
				<div>
					<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
						Organisation Name
					</label>
					<input
						type="text"
						value={orgName}
						onChange={(e) => setOrgName(e.target.value)}
						className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all"
					/>
				</div>

				{/* Organisation Type */}
				<div>
					<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
						Organisation Type
					</label>
					<select
						value={orgType}
						onChange={(e) => setOrgType(e.target.value)}
						className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all"
					>
						<option value="hospital">Hospital</option>
						<option value="diagnostic-centre">Diagnostic Centre</option>
						<option value="clinic">Clinic</option>
						<option value="telemedicine">Telemedicine</option>
					</select>
				</div>

				{/* State */}
				<div>
					<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
						State
					</label>
					<select
						value={state}
						onChange={(e) => setState(e.target.value)}
						className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all"
					>
						<option value="">Select state...</option>
						{nigerianStates.map((s) => (
							<option key={s} value={s}>
								{s}
							</option>
						))}
					</select>
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

				{/* Organisation ID (Read-only) */}
				<div>
					<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
						Organisation ID
					</label>
					<input
						type="text"
						value={initialData.orgId}
						readOnly
						className="w-full bg-[#191f31] text-[#dce1fb]/50 px-4 py-3 rounded-lg cursor-not-allowed"
					/>
					<p className="text-[#dce1fb]/50 text-xs mt-1">
						System-generated ID used for support
					</p>
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
