import Navigation from "../components/Navigation";
import HeroSection from "../components/HeroSection";
import FeaturesSection from "../components/FeaturesSection";
import HowItWorksSection from "../components/HowItWorksSection";
import BenefitsSection from "../components/BenefitsSection";
import CTASection from "../components/CTASection";
import Footer from "../components/Footer";
import { useEffect } from "react";

export default function LandingPage() {
	//Set Previous page for the 404 back button handler to check
	sessionStorage.setItem("lastPage", window.location.href);
	useEffect(() => {
		document.title = "Mediscan - AI-Powered Medical Scan Analysis";
	}, []);
	return (
		<div className="w-full bg-[#0c1324]">
			<Navigation />
			<HeroSection />
			<FeaturesSection />
			<HowItWorksSection />
			<BenefitsSection />
			<CTASection />
			<Footer />
		</div>
	);
}
