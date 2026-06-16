import { useState } from "react";
import { Upload, Cpu, CheckCircle } from "lucide-react";

interface StepProps {
	step: number;
	icon: React.ReactNode;
	title: string;
	description: string;
}

function Step({ step, icon, title, description }: StepProps) {
	return (
		<div className="relative z-10 group">
			<div className="space-y-6 p-8 rounded-2xl border border-brand-border bg-brand-card/60 backdrop-blur-md hover:border-brand-primary/45 hover:bg-brand-card transition-all duration-300">
				<div className="flex justify-between items-center">
					<div className="w-14 h-14 bg-gradient-to-tr from-brand-primary to-brand-secondary text-brand-bg rounded-xl flex items-center justify-center text-xl font-extrabold shadow-[0_4px_15px_rgba(0,210,255,0.25)]">
						0{step}
					</div>
					<div className="text-brand-primary p-2.5 bg-brand-primary/5 rounded-xl border border-brand-primary/10 group-hover:border-brand-primary/30 transition-all duration-300">
						{icon}
					</div>
				</div>
				<h3 className="text-2xl font-bold text-brand-text group-hover:text-brand-primary transition-colors duration-300">{title}</h3>
				<p className="text-brand-text-muted leading-relaxed text-base">{description}</p>
			</div>
		</div>
	);
}

export default function HowItWorksSection() {
	const [imageLoaded, setImageLoaded] = useState(false);
	
	const steps = [
		{
			step: 1,
			icon: <Upload size={28} />,
			title: "Upload X-Ray",
			description:
				"Upload a chest X-ray image in JPEG or PNG format. Our system accepts both digital scans and device photos.",
		},
		{
			step: 2,
			icon: <Cpu size={28} />,
			title: "AI Analysis",
			description:
				"Our trained deep learning model analyzes the image and generates a prediction with confidence scoring in seconds.",
		},
		{
			step: 3,
			icon: <CheckCircle size={28} />,
			title: "Review & Confirm",
			description:
				"Review the AI findings with a visual heatmap overlay. Add clinical notes and confirm your diagnosis.",
		},
	];

	return (
		<section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-brand-bg relative overflow-hidden border-t border-brand-border/40">
			{/* Ambient background glow */}
			<div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-brand-secondary/5 blur-[120px]" />
			
			<div className="max-w-7xl mx-auto space-y-20">
				{/* Section Header */}
				<div className="text-center space-y-4 max-w-3xl mx-auto">
					<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-brand-primary/20 bg-brand-primary/5 text-brand-primary text-xs font-bold uppercase tracking-wider">
						Workflow
					</div>
					<h2 className="text-3xl md:text-5xl font-extrabold text-brand-text tracking-tight">
						How It Works
					</h2>
					<p className="text-lg text-brand-text-muted">
						Three simple steps to get AI-powered diagnostic support
					</p>
				</div>

				{/* Steps Grid */}
				<div className="relative">
					{/* Connecting Line */}
					<div className="absolute top-1/2 left-8 right-8 h-[2px] bg-gradient-to-r from-brand-primary/30 via-brand-secondary/20 to-brand-primary/30 -translate-y-16 hidden lg:block z-0" />
					
					<div className="grid md:grid-cols-3 gap-8">
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
				</div>

				{/* Demo Section */}
				<div className="bg-gradient-to-br from-brand-card to-brand-bg/40 border border-brand-border/60 rounded-3xl overflow-hidden shadow-2xl relative">
					{/* Subtle abstract lines in panel */}
					<div className="absolute inset-0 bg-grid-white/[0.01] pointer-events-none" />
					
					<div className="grid lg:grid-cols-2 gap-12 items-center p-12 max-sm:p-6 relative z-10">
						<div className="space-y-6">
							<h3 className="text-3xl md:text-4xl font-extrabold text-brand-text tracking-tight">
								See It In Action
							</h3>
							<p className="text-lg text-brand-text-muted leading-relaxed">
								Our AI analyzes chest X-rays with 94% accuracy, producing
								detailed heatmaps that highlight areas of concern. Perfect for
								radiologist review and clinician reference.
							</p>
							
							{/* Stats Dashboard Layout */}
							<div className="grid grid-cols-3 gap-4 pt-6 border-t border-brand-border/60">
								<div className="space-y-1">
									<p className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">Accuracy</p>
									<p className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-brand-primary to-brand-primary-hover bg-clip-text text-transparent text-neon-glow">94%</p>
								</div>
								<div className="space-y-1">
									<p className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">Response</p>
									<p className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-brand-primary to-brand-primary-hover bg-clip-text text-transparent text-neon-glow">&lt; 5s</p>
								</div>
								<div className="space-y-1">
									<p className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">Sensitivity</p>
									<p className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-brand-primary to-brand-primary-hover bg-clip-text text-transparent text-neon-glow">90%+</p>
								</div>
							</div>
						</div>
						
						{/* Demo Image Showcase */}
						<div className="relative rounded-2xl p-1.5 border border-brand-border/60 bg-brand-bg/50 overflow-hidden shadow-xl aspect-[4/3] group">
							{!imageLoaded && (
								<div className="absolute inset-0 skeleton-placeholder" />
							)}
							<img
								src="/images/physician-reviewing-mri-scan-x-ray-results-with-patient-medical-office.jpg"
								alt="X-ray analysis demo"
								loading="lazy"
								onLoad={() => setImageLoaded(true)}
								className={`w-full h-full object-cover rounded-xl transition-all duration-700 ease-out group-hover:scale-103 ${
									imageLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-95 blur-md'
								}`}
							/>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

