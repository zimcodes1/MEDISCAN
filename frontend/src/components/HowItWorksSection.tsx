import { Upload, Cpu, CheckCircle } from "lucide-react";

interface StepProps {
	step: number;
	icon: React.ReactNode;
	title: string;
	description: string;
}

function Step({ step, icon, title, description }: StepProps) {
	return (
		<div className="relative">
			<div className="relative space-y-4 p-5 rounded-2xl border border-[#2e3447] bg-[#191f31]">
				<div className="flex justify-between">
					<div className="w-16 max-sm:w-14 h-16 max-sm:h-14 bg-[#7bd0ff] text-[#0c1324] rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
						{step}
					</div>
					<div className="text-[#7bd0ff] mt-2">{icon}</div>
				</div>
				<h3 className="text-2xl font-bold text-[#dce1fb]">{title}</h3>
				<p className="text-[#dce1fb] leading-relaxed text-lg">{description}</p>
			</div>
		</div>
	);
}

export default function HowItWorksSection() {
	const steps = [
		{
			step: 1,
			icon: <Upload size={32} />,
			title: "Upload X-Ray",
			description:
				"Upload a chest X-ray image in JPEG or PNG format. Our system accepts both digital scans and device photos.",
		},
		{
			step: 2,
			icon: <Cpu size={32} />,
			title: "AI Analysis",
			description:
				"Our trained deep learning model analyzes the image and generates a prediction with confidence scoring in seconds.",
		},
		{
			step: 3,
			icon: <CheckCircle size={32} />,
			title: "Review & Confirm",
			description:
				"Review the AI findings with a visual heatmap overlay. Add clinical notes and confirm your diagnosis.",
		},
	];

	return (
		<section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0c1324]">
			<div className="max-w-7xl mx-auto space-y-12">
				{/* Section Header */}
				<div className="text-center space-y-4">
					<h2 className="text-2xl md:text-4xl font-bold text-[#dce1fb]">
						How It Works
					</h2>
					<p className="text-lg text-[#dce1fb] max-w-2xl mx-auto">
						Three simple steps to get AI-powered diagnostic support
					</p>
				</div>

				{/* Steps Grid */}
				<div className="grid md:grid-cols-3 gap-12">
					{steps.map((item) => (
						<Step
							key={item.step}
							step={item.step}
							icon={item.icon}
							title={item.title}
							description={item.description}
						/>
					))}
				</div>

				{/* Demo Section */}
				<div className="mt-16 bg-gradient-to-r from-[#191f31] to-[#151b2d] rounded-2xl overflow-hidden">
					<div className="grid md:grid-cols-2 gap-8 items-center p-12 max-sm:p-8">
						<div className="space-y-4">
							<h3 className="text-3xl font-bold text-[#dce1fb] mb-6">
								See It In Action
							</h3>
							<p className="text-lg text-[#dce1fb] leading-relaxed">
								Our AI analyzes chest X-rays with 94% accuracy, producing
								detailed heatmaps that highlight areas of concern. Perfect for
								radiologist review and clinician reference.
							</p>
							<div className="flex gap-4 pt-4">
								<div className="flex-1">
									<p className="text-sm text-[#dce1fb]">Accuracy</p>
									<p className="text-2xl font-bold text-[#7bd0ff]">94%</p>
								</div>
								<div className="flex-1">
									<p className="text-sm text-[#dce1fb]">Response Time</p>
									<p className="text-2xl font-bold text-[#7bd0ff]">&lt; 5s</p>
								</div>
								<div className="flex-1">
									<p className="text-sm text-[#dce1fb]">Sensitivity</p>
									<p className="text-2xl font-bold text-[#7bd0ff]">90%+</p>
								</div>
							</div>
						</div>
						<div className="rounded-xl overflow-hidden shadow-2xl">
							<img
								src="/images/physician-reviewing-mri-scan-x-ray-results-with-patient-medical-office.jpg"
								alt="X-ray analysis demo"
								className="w-full h-full object-cover"
							/>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
