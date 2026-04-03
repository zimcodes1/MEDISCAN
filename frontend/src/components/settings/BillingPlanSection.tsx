import { CreditCard, TrendingUp, Save } from "lucide-react";
import { useState } from "react";

interface BillingPlanSectionProps {
	planData: {
		currentPlan: string;
		planPrice: string;
		scansUsed: number;
		scansLimit: number;
		renewalDate: string;
		billingEmail: string;
	};
	onSave: (billingEmail: string) => void;
}

export default function BillingPlanSection({ planData, onSave }: BillingPlanSectionProps) {
	const [billingEmail, setBillingEmail] = useState(planData.billingEmail);

	const usagePercentage = (planData.scansUsed / planData.scansLimit) * 100;

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-[#dce1fb] mb-2">Billing & Plan</h2>
				<p className="text-[#dce1fb]/70">Manage your subscription and billing information</p>
			</div>

			{/* Current Plan */}
			<div className="bg-[#151b2d] rounded-xl p-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<p className="text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">Current Plan</p>
						<div className="flex items-center gap-3">
							<span className="text-2xl font-bold text-[#7bd0ff]">{planData.currentPlan}</span>
							<span className="bg-[#7bd0ff]/10 text-[#7bd0ff] px-3 py-1 rounded-full text-sm font-semibold">
								Active
							</span>
						</div>
						<p className="text-[#dce1fb] mt-1">{planData.planPrice}</p>
					</div>
					<button className="flex items-center gap-2 bg-[#7bd0ff] text-[#0c1324] px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity">
						<TrendingUp size={18} />
						Upgrade Plan
					</button>
				</div>

				{/* Usage Stats */}
				<div className="pt-6 border-t border-[#2e3447]">
					<div className="flex items-center justify-between mb-2">
						<p className="text-[#dce1fb]/70 text-sm">Scans Used This Month</p>
						<p className="text-[#dce1fb] font-semibold">
							{planData.scansUsed} / {planData.scansLimit}
						</p>
					</div>
					<div className="w-full bg-[#2e3447] h-3 rounded-full overflow-hidden">
						<div
							className={`h-full transition-all ${
								usagePercentage >= 90
									? "bg-[#ffb4ab]"
									: usagePercentage >= 70
									? "bg-[#ffb95f]"
									: "bg-[#7bd0ff]"
							}`}
							style={{ width: `${usagePercentage}%` }}
						/>
					</div>
					{usagePercentage >= 90 && (
						<p className="text-[#ffb4ab] text-xs mt-2">
							⚠ You're approaching your monthly scan limit. Consider upgrading your plan.
						</p>
					)}
				</div>

				{/* Renewal Date */}
				<div className="pt-6 border-t border-[#2e3447] mt-6">
					<div className="flex items-center justify-between">
						<p className="text-[#dce1fb]/70 text-sm">Next Renewal Date</p>
						<p className="text-[#dce1fb] font-semibold">{planData.renewalDate}</p>
					</div>
				</div>
			</div>

			{/* Billing Contact */}
			<div className="bg-[#151b2d] rounded-xl p-6">
				<h3 className="text-[#dce1fb] font-semibold mb-4">Billing Contact</h3>
				<div className="space-y-4">
					<div>
						<label className="block text-[#dce1fb]/70 text-xs uppercase tracking-wide mb-2">
							Billing Email
						</label>
						<input
							type="email"
							value={billingEmail}
							onChange={(e) => setBillingEmail(e.target.value)}
							className="w-full bg-[#191f31] text-[#dce1fb] px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-[#7bd0ff]/50 transition-all"
						/>
						<p className="text-[#dce1fb]/50 text-xs mt-1">
							Invoices and billing notifications will be sent to this email
						</p>
					</div>

					<button
						onClick={() => onSave(billingEmail)}
						className="w-full flex items-center justify-center gap-2 bg-[#7bd0ff] text-[#0c1324] py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
					>
						<Save size={18} />
						Update Billing Email
					</button>
				</div>
			</div>

			{/* Payment Method (Read-only for MVP) */}
			<div className="bg-[#151b2d] rounded-xl p-6">
				<div className="flex items-center gap-3 mb-4">
					<CreditCard size={24} className="text-[#7bd0ff]" />
					<div>
						<h3 className="text-[#dce1fb] font-semibold">Payment Method</h3>
						<p className="text-[#dce1fb]/70 text-sm">Bank transfer · Contact support to update</p>
					</div>
				</div>
				<p className="text-[#dce1fb]/50 text-xs">
					For MVP, payment processing is handled manually. Contact support@mediscan.ng to update your
					payment method or discuss custom enterprise plans.
				</p>
			</div>
		</div>
	);
}
