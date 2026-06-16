import { Upload, Save } from "lucide-react";
import { useState } from "react";
import { NigerianStates as nigerianStates } from "../../utils/DummyData";

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
		<div className="space-y-6 sm:pt-10">
			<div>
				<h2 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">Organisation Profile</h2>
				<p className="text-brand-text-muted text-sm">Manage your organisation's information and branding</p>
			</div>

			<div className="glass-panel rounded-2xl p-6 space-y-6 relative overflow-hidden group">
				{/* Organisation Logo */}
				<div>
					<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-3 font-display">
						Organisation Logo
					</label>
					<div className="flex items-center gap-4">
						<div className="w-20 h-20 bg-brand-card border border-brand-border/80 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
							{logo ? (
								<img src={logo} alt="Organisation logo" className="w-full h-full object-contain" />
							) : (
								<span className="text-brand-primary  text-2xl font-bold text-center px-2">{orgName.slice(0,1).toLocaleUpperCase()}</span>
							)}
						</div>
						<label className="cursor-pointer">
							<input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
							<span className="flex items-center gap-2 bg-brand-card text-brand-primary border border-brand-border/60 hover:bg-brand-card/85 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300">
								<Upload size={14} />
								Upload Logo
							</span>
						</label>
					</div>
					<p className="text-brand-text-muted/65 text-[10px] font-semibold mt-2">
						Shown in report PDFs and dashboard header
					</p>
				</div>

				{/* Organisation Name */}
				<div>
					<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
						Organisation Name
					</label>
					<input
						type="text"
						value={orgName}
						onChange={(e) => setOrgName(e.target.value)}
						className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300"
					/>
				</div>

				{/* Organisation Type */}
				<div>
					<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
						Organisation Type
					</label>
					<select
						value={orgType}
						onChange={(e) => setOrgType(e.target.value)}
						className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300"
					>
						<option value="hospital">Hospital</option>
						<option value="diagnostic-centre">Diagnostic Centre</option>
						<option value="clinic">Clinic</option>
						<option value="telemedicine">Telemedicine</option>
					</select>
				</div>

				{/* State */}
				<div>
					<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
						State
					</label>
					<select
						value={state}
						onChange={(e) => setState(e.target.value)}
						className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300"
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

				{/* Organisation ID (Read-only) */}
				<div>
					<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
						Organisation ID
					</label>
					<input
						type="text"
						value={initialData.orgId}
						readOnly
						className="w-full bg-brand-card/30 text-brand-text-muted/65 px-4 py-3 rounded-xl border border-brand-border/40 cursor-not-allowed"
					/>
					<p className="text-brand-text-muted/60 text-[10px] font-semibold mt-1">
						System-generated ID used for support
					</p>
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
