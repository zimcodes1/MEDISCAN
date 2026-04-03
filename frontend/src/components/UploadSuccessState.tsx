import { CheckCircle, ArrowRight } from "lucide-react";

interface UploadSuccessStateProps {
	onViewQueue: () => void;
	onUploadAnother: () => void;
}

export default function UploadSuccessState({ onViewQueue, onUploadAnother }: UploadSuccessStateProps) {
	return (
		<div className="bg-[#151b2d] rounded-xl p-12 text-center">
			<div className="flex justify-center mb-6">
				<div className="w-20 h-20 bg-[#191f31] rounded-full flex items-center justify-center">
					<CheckCircle size={48} className="text-[#4ade80]" />
				</div>
			</div>
			<h2 className="text-3xl font-bold text-[#dce1fb] mb-3">Scan Uploaded Successfully</h2>
			<p className="text-[#dce1fb]/70 mb-8 max-w-md mx-auto">
				Your scan has been queued for AI analysis. You'll be notified when the results are ready for review.
			</p>
			<div className="flex gap-4 justify-center">
				<button
					onClick={onViewQueue}
					className="flex items-center gap-2 bg-[#7bd0ff] text-[#0c1324] px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
				>
					View Queue
					<ArrowRight size={18} />
				</button>
				<button
					onClick={onUploadAnother}
					className="bg-[#2e3447] text-[#7bd0ff] px-6 py-3 rounded-lg font-semibold hover:bg-[#191f31] transition-colors"
				>
					Upload Another Scan
				</button>
			</div>
		</div>
	);
}
