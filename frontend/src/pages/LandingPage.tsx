import Navigation from '../components/Navigation';
import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import HowItWorksSection from '../components/HowItWorksSection';
import BenefitsSection from '../components/BenefitsSection';
import CTASection from '../components/CTASection';
import Footer from '../components/Footer';

export default function LandingPage() {
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
