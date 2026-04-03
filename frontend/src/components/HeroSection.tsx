import { useNavigate } from "react-router-dom";
import { ArrowRight, Zap } from "lucide-react";

export default function HeroSection() {
	const navigate = useNavigate();

	return (
		<section className="pt-25 pb-20 px-4 sm:px-6 lg:px-8 bg-[#0c1324]">
			<div className="max-w-7xl mx-auto">
				<div className="grid md:grid-cols-2 gap-12 items-center">
					{/* Left Content */}
					<div className="space-y-8">
						<div className="space-y-4">
						<div className="inline-flex items-center gap-2 bg-[#191f31] border border-[#7bd0ff] px-4 py-2 rounded-full">
							<i className="text-xl text-[#7bd0ff] animate-pulse">•</i>
							<Zap className="text-[#7bd0ff] animate-pulse" size={18} />
							<span className="text-[#7bd0ff] font-medium text-sm">
									AI-Powered Medical Scan Analysis
								</span>
							</div>
						<h1 className="roboto text-5xl md:text-6xl font-bold text-[#dce1fb] leading-tight">
							Faster Diagnosis,
							<span className="text-[#7bd0ff]"> Better Care</span>
							</h1>
						<p className="text-lg text-[#dce1fb] leading-relaxed">
								MediScan NG is an AI-powered decision-support tool that helps
								clinicians analyze chest X-rays faster. Get preliminary findings
								in seconds, with visual explanations to guide your clinical
								judgment.
							</p>
						</div>

						{/* CTA Buttons */}
						<div className="flex flex-col sm:flex-row gap-4">
							<button
								onClick={() => navigate("/signup")}
								className="flex items-center justify-center gap-2 text-[#0c1324] px-8 py-4 rounded-lg hover:opacity-90 transition-opacity font-semibold text-lg"
								style={{
									background: 'linear-gradient(135deg, #7bd0ff 0%, #008abb 100%)'
								}}
							>
								Get Started
								<ArrowRight size={20} />
							</button>
							<button
								onClick={() =>
									document
										.getElementById("about")
										?.scrollIntoView({ behavior: "smooth" })
								}
								className="flex items-center justify-center gap-2 border-2 border-[#7bd0ff] hover:bg-[#7bd0ff] hover:text-[#0c1324] text-[#7bd0ff] px-8 py-4 rounded-lg transition-colors font-semibold text-lg"
							>
								Learn More
							</button>
						</div>

						{/* Trust Badge */}
					<div className="pt-4 text-sm text-[#dce1fb]">
						<p>
							<i className="text-[#7bd0ff] text-lg px-1">•</i> HIPAA-compliant{" "}
							<i className="text-[#7bd0ff] text-lg px-1">•</i> Built for
							African healthcare{" "}
							<i className="text-[#7bd0ff] text-lg px-1">•</i>{" "}
								Clinician-reviewed
							</p>
						</div>
					</div>

					{/* Right Image */}
					<div className="relative">
						<div className="absolute inset-0 bg-gradient-to-r from-[#7bd0ff] to-[#008abb] rounded-2xl opacity-10 blur-3xl"></div>
						<span className="block w-fit h-fit rounded-2xl overflow-hidden">
							<img
								src="/images/doctor-typing.png"
								alt="Medical X-ray analysis"
								className="relative shadow-2xl w-full object-cover hover:scale-105 transition-transform duration-300"
							/>
						</span>
						{/* Badge */}
						<div className="absolute animate-bounce bottom-6 left-6 bg-[#191f31] border border-[#7bd0ff] rounded-lg shadow-lg px-4 py-3">
							<p className="text-sm font-semibold text-[#dce1fb]">AI Analysis</p>
							<p className="text-xs text-[#7bd0ff]">Ready in &lt; 5 seconds</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
