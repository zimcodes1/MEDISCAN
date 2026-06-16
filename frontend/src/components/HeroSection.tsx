import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Zap, Shield, Sparkles, Activity } from "lucide-react";

export default function HeroSection() {
	const navigate = useNavigate();
	const [imageLoaded, setImageLoaded] = useState(false);

	return (
		<section className="relative pt-30 max-sm:pt-25 pb-24 px-4 sm:px-6 lg:px-8 bg-brand-bg overflow-hidden">
			{/* Ambient Glowing Background */}
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
				<div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-brand-primary/10 blur-[120px] animate-pulse duration-[8s]" />
				<div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-brand-secondary/5 blur-[100px]" />
			</div>

			<div className="max-w-7xl mx-auto relative z-10">
				<div className="grid lg:grid-cols-2 gap-16 items-center">
					{/* Left Content */}
					<div className="space-y-8 animate-fade-in-up">
						<div className="space-y-6">
							<div className="inline-flex items-center gap-2.5 bg-brand-card/80 border border-brand-primary/30 px-4 py-3 rounded-full shadow-[0_0_15px_rgba(0,210,255,0.08)]">
								<span className="relative flex h-2 w-2">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
									<span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
								</span>
								<Zap className="text-brand-primary" size={14} />
								<span className="text-brand-primary font-bold text-xs uppercase tracking-wider">
									AI-Powered Medical Scan Analysis
								</span>
							</div>

							<h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-extrabold text-brand-text leading-[1.1] tracking-tight">
								Faster Diagnosis,<br />
								<span className="bg-gradient-to-r from-brand-primary via-brand-primary-hover to-brand-secondary bg-clip-text text-transparent text-neon-glow">
									Better Care
								</span>
							</h1>

							<p className="text-lg text-brand-text-muted leading-relaxed max-w-xl">
								Mediscan NG is an AI-powered decision-support tool that helps
								clinicians analyze chest X-rays faster. Get preliminary findings
								in seconds, with visual explanations to guide your clinical
								judgment.
							</p>
						</div>

						{/* CTA Buttons */}
						<div className="flex flex-col sm:flex-row gap-4">
							<button
								onClick={() => navigate("/signup")}
								className="flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg px-8 py-4.5 rounded-xl hover:shadow-[0_0_30px_rgba(0,210,255,0.35)] transition-all duration-300 font-extrabold text-lg active:scale-95"
							>
								Get Started
								<ArrowRight size={20} />
							</button>
							<button
								onClick={() =>
									document
										.getElementById("features")
										?.scrollIntoView({ behavior: "smooth" })
								}
								className="flex items-center justify-center gap-2 border border-brand-border bg-brand-card/40 hover:bg-brand-border/50 text-brand-text px-8 py-4.5 rounded-xl transition-all duration-300 font-bold text-lg active:scale-95"
							>
								Learn More
							</button>
						</div>

						{/* Trust Badges */}
						<div className="pt-8 border-t border-brand-border/40">
							<div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-brand-text-muted">
								<span className="flex items-center gap-2">
									<Shield size={16} className="text-brand-primary" />
									HIPAA-compliant
								</span>
								<span className="flex items-center gap-2">
									<Activity size={16} className="text-brand-primary" />
									Built for African healthcare
								</span>
								<span className="flex items-center gap-2">
									<Sparkles size={16} className="text-brand-primary" />
									Clinician-reviewed
								</span>
							</div>
						</div>
					</div>

					{/* Right Image */}
					<div className="relative lg:ml-4">
						{/* Double glowing backdrop */}
						<div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 via-brand-secondary/10 to-transparent rounded-3xl blur-3xl opacity-70 animate-pulse duration-[6s]"></div>

						<div className="relative rounded-2xl p-1.5 border border-brand-border/60 bg-brand-card/50 backdrop-blur-sm overflow-hidden group shadow-2xl">
							<div className="absolute inset-0 bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl pointer-events-none z-10" />

							{/* Image Wrapper */}
							<div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-brand-card">
								{!imageLoaded && (
									<div className="absolute inset-0 skeleton-placeholder z-0" />
								)}
								<img
									src="/images/doctor-typing.png"
									alt="Medical X-ray analysis"
									loading="lazy"
									onLoad={() => setImageLoaded(true)}
									className={`w-full h-full object-cover transition-all duration-700 ease-out hover:scale-103 ${imageLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-95 blur-md'
										}`}
								/>
							</div>
						</div>

						{/* Glass floating Badge */}
						<div className="absolute text-center animate-float bottom-6 -left-6 max-sm:left-6 max-sm:bottom-4 bg-brand-card/90 backdrop-blur-lg border border-brand-primary/40 rounded-2xl shadow-[0_15px_30px_-10px_rgba(0,0,0,0.5)] px-6 py-4.5 z-20">
							<div className="flex items-center gap-2 mb-1 justify-center">
								<span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
								<p className="text-sm font-bold text-brand-text uppercase tracking-wide">AI Analysis</p>
							</div>
							<p className="text-xs font-semibold text-brand-primary">Ready in &lt; 5 seconds</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

