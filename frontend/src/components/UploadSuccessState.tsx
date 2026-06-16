import { CheckCircle, ArrowRight } from "lucide-react";

interface UploadSuccessStateProps {
	onViewQueue: () => void;
	onUploadAnother: () => void;
}

export default function UploadSuccessState({ onViewQueue, onUploadAnother }: UploadSuccessStateProps) {
	return (
		<div className="glass-panel rounded-3xl p-12 text-center shadow-2xl relative overflow-hidden group max-w-2xl mx-auto">
			{/* Color-matched background glow */}
			<div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-5 bg-emerald-500" />
			
			<div className="flex justify-center mb-6">
				<div className="w-18 h-18 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.15)]">
					<CheckCircle size={32} />
				</div>
			</div>
			<h2 className="text-3xl font-extrabold text-brand-text mb-3 font-display">Scan Uploaded Successfully</h2>
			<p className="text-brand-text-muted/80 mb-8 max-w-md mx-auto leading-relaxed text-sm">
				Your scan has been queued for AI analysis. You'll be notified when the results are ready for review.
			</p>
			<div className="flex gap-4 justify-center">
				<button
					onClick={onViewQueue}
					className="flex items-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg px-6 py-3.5 rounded-xl font-extrabold hover:shadow-[0_0_20px_rgba(0,210,255,0.25)] active:scale-95 transition-all duration-300 cursor-pointer"
				>
					View Queue
					<ArrowRight size={16} />
				</button>
				<button
					onClick={onUploadAnother}
					className="flex items-center justify-center border border-brand-border bg-brand-card/45 hover:bg-brand-border/60 hover:text-brand-primary text-brand-text px-6 py-3.5 rounded-xl font-bold active:scale-95 transition-all duration-300 cursor-pointer"
				>
					Upload Another Scan
				</button>
			</div>
		</div>
	);
}

