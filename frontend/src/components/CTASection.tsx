import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield } from 'lucide-react';

export default function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-blue-800">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Main Content */}
        <div className="space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Ready to Transform Your Diagnostic Workflow?
          </h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Join healthcare providers across Nigeria who are using MediScan NG to deliver faster, more confident diagnoses.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-blue-50 transition-colors font-semibold text-lg"
          >
            Start Free Trial
            <ArrowRight size={20} />
          </button>
          <button
            className="flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
          >
            Schedule Demo
          </button>
        </div>

        {/* Trust Indicators */}
        <div className="grid md:grid-cols-3 gap-6 pt-12 border-t border-blue-400">
          <div className="space-y-2">
            <Shield className="text-blue-200 mx-auto" size={32} />
            <p className="text-blue-100 font-semibold">HIPAA Compliant</p>
            <p className="text-blue-200 text-sm">Your data is secure</p>
          </div>
          <div className="space-y-2">
            <Shield className="text-blue-200 mx-auto" size={32} />
            <p className="text-blue-100 font-semibold">Clinician Reviewed</p>
            <p className="text-blue-200 text-sm">Built by medical experts</p>
          </div>
          <div className="space-y-2">
            <Shield className="text-blue-200 mx-auto" size={32} />
            <p className="text-blue-100 font-semibold">24/7 Support</p>
            <p className="text-blue-200 text-sm">Always available</p>
          </div>
        </div>
      </div>
    </section>
  );
}
