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
		<div className="space-y-6 sm:pt-10">
			<div>
				<h2 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">Billing & Plan</h2>
				<p className="text-brand-text-muted text-sm">Manage your subscription and billing information</p>
			</div>

			{/* Current Plan */}
			<div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
					<div>
						<p className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">Current Plan</p>
						<div className="flex items-center gap-3">
							<span className="text-2xl font-bold text-brand-primary tracking-tight font-display">{planData.currentPlan}</span>
							<span className="bg-brand-primary/10 border border-brand-primary/20 text-brand-primary px-3 py-1 rounded-full text-xs font-semibold">
								Active
							</span>
						</div>
						<p className="text-brand-text font-semibold text-sm mt-1">{planData.planPrice}</p>
					</div>
					<button className="flex items-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg px-5 py-2.5 rounded-xl text-xs font-extrabold hover:shadow-[0_0_20px_rgba(0,210,255,0.2)] hover:opacity-95 active:scale-95 transition-all duration-300 cursor-pointer">
						<TrendingUp size={14} />
						Upgrade Plan
					</button>
				</div>

				{/* Usage Stats */}
				<div className="pt-6 border-t border-brand-border/30">
					<div className="flex items-center justify-between mb-2 text-xs font-semibold">
						<p className="text-brand-text-muted">Scans Used This Month</p>
						<p className="text-brand-text font-bold">
							{planData.scansUsed} / {planData.scansLimit}
						</p>
					</div>
					<div className="w-full bg-brand-bg/80 h-3 rounded-full overflow-hidden border border-brand-border/30 p-0.5">
						<div
							className={`h-full rounded-full transition-all duration-500 ${
								usagePercentage >= 90
									? "bg-gradient-to-r from-rose-500 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
									: usagePercentage >= 70
									? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
									: "bg-gradient-to-r from-brand-primary to-brand-secondary shadow-[0_0_10px_rgba(0,210,255,0.4)]"
							}`}
							style={{ width: `${usagePercentage}%` }}
						/>
					</div>
					{usagePercentage >= 90 && (
						<p className="text-rose-400 text-[10px] font-bold uppercase tracking-wider mt-2.5 animate-pulse">
							⚠ You're approaching your monthly scan limit. Consider upgrading your plan.
						</p>
					)}
				</div>

				{/* Renewal Date */}
				<div className="pt-6 border-t border-brand-border/30 mt-6">
					<div className="flex items-center justify-between text-xs font-semibold">
						<p className="text-brand-text-muted">Next Renewal Date</p>
						<p className="text-brand-text font-bold">{planData.renewalDate}</p>
					</div>
				</div>
			</div>

			{/* Billing Contact */}
			<div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
				<h3 className="text-brand-text font-bold text-sm mb-4 font-display">Billing Contact</h3>
				<div className="space-y-4">
					<div>
						<label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
							Billing Email
						</label>
						<input
							type="email"
							value={billingEmail}
							onChange={(e) => setBillingEmail(e.target.value)}
							className="w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300"
						/>
						<p className="text-brand-text-muted/60 text-[10px] font-semibold mt-1">
							Invoices and billing notifications will be sent to this email
						</p>
					</div>

					<button
						onClick={() => onSave(billingEmail)}
						className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg py-3.5 rounded-xl font-extrabold text-sm hover:shadow-[0_0_20px_rgba(0,210,255,0.25)] hover:opacity-95 active:scale-95 transition-all duration-300 cursor-pointer"
					>
						<Save size={16} />
						Update Billing Email
					</button>
				</div>
			</div>

			{/* Payment Method (Read-only for MVP) */}
			<div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary rounded-xl shrink-0">
						<CreditCard size={20} />
					</div>
					<div>
						<h3 className="text-brand-text font-bold text-sm font-display">Payment Method</h3>
						<p className="text-brand-text-muted text-xs font-medium mt-0.5">Bank transfer · Contact support to update</p>
					</div>
				</div>
				<p className="text-brand-text-muted/70 text-[11px] leading-relaxed font-medium pt-3 border-t border-brand-border/30">
					For MVP, payment processing is handled manually. Contact support@mediscan.ng to update your
					payment method or discuss custom enterprise plans.
				</p>
			</div>
		</div>
	);
}
