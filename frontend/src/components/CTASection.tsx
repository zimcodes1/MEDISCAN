import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield } from 'lucide-react';

export default function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ background: 'linear-gradient(135deg, #7bd0ff 0%, #008abb 100%)' }}>
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Main Content */}
        <div className="space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-[#0c1324] leading-tight">
            Ready to Transform Your Diagnostic Workflow?
          </h2>
          <p className="text-xl text-[#0c1324] max-w-2xl mx-auto leading-relaxed">
            Join healthcare providers across Nigeria who are using Mediscan NG to deliver faster, more confident diagnoses.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <button
            onClick={() => navigate('/signup')}
            className="flex items-center justify-center gap-2 bg-[#0c1324] text-[#7bd0ff] px-8 py-4 rounded-lg hover:bg-[#151b2d] transition-colors font-semibold text-lg"
          >
            Start Free Trial
            <ArrowRight size={20} />
          </button>
          <button
            className="flex items-center justify-center gap-2 border-2 border-[#0c1324] text-[#0c1324] px-8 py-4 rounded-lg hover:bg-[#0c1324] hover:text-[#7bd0ff] transition-colors font-semibold text-lg"
          >
            Schedule Demo
          </button>
        </div>

        {/* Trust Indicators */}
        <div className="grid md:grid-cols-3 gap-6 pt-12 border-t border-[#008abb]">
          <div className="space-y-2">
            <Shield className="text-[#0c1324] mx-auto" size={32} />
            <p className="text-[#0c1324] font-semibold">HIPAA Compliant</p>
            <p className="text-[#0c1324] text-sm">Your data is secure</p>
          </div>
          <div className="space-y-2">
            <Shield className="text-[#0c1324] mx-auto" size={32} />
            <p className="text-[#0c1324] font-semibold">Clinician Reviewed</p>
            <p className="text-[#0c1324] text-sm">Built by medical experts</p>
          </div>
          <div className="space-y-2">
            <Shield className="text-[#0c1324] mx-auto" size={32} />
            <p className="text-[#0c1324] font-semibold">24/7 Support</p>
            <p className="text-[#0c1324] text-sm">Always available</p>
          </div>
        </div>
      </div>
    </section>
  );
}
