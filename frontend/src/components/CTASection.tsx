import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Award, Clock } from 'lucide-react';

export default function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-brand-bg overflow-hidden border-t border-brand-border/40">
      {/* Ambient center glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-brand-primary/10 blur-[150px] pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center space-y-10 relative z-10">
        {/* Main Content */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-brand-primary/20 bg-brand-primary/5 text-brand-primary text-xs font-bold uppercase tracking-wider">
            Get Started
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-brand-text tracking-tight leading-tight">
            Ready to Transform Your Diagnostic Workflow?
          </h2>
          <p className="text-lg md:text-xl text-brand-text-muted max-w-2xl mx-auto leading-relaxed">
            Join healthcare providers across Nigeria who are using Mediscan NG to deliver faster, more confident diagnoses.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
          <button
            onClick={() => navigate('/signup')}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg px-8 py-4.5 rounded-xl hover:shadow-[0_0_30px_rgba(0,210,255,0.35)] transition-all duration-300 font-extrabold text-lg active:scale-95"
          >
            Start Free Trial
            <ArrowRight size={20} />
          </button>
          <button
            className="flex items-center justify-center gap-2 border border-brand-border bg-brand-card/40 hover:bg-brand-border/50 text-brand-text px-8 py-4.5 rounded-xl transition-all duration-300 font-bold text-lg active:scale-95"
          >
            Schedule Demo
          </button>
        </div>

        {/* Trust Indicators */}
        <div className="grid md:grid-cols-3 gap-8 pt-16 border-t border-brand-border/60">
          <div className="space-y-3 group p-4 rounded-2xl hover:bg-brand-card/30 transition-all duration-300 border border-transparent hover:border-brand-border/40">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-brand-primary/10 text-brand-primary mx-auto border border-brand-primary/20">
              <Shield size={22} />
            </div>
            <p className="text-brand-text font-bold text-lg">HIPAA Compliant</p>
            <p className="text-brand-text-muted text-sm leading-relaxed">Your patient data is protected with enterprise encryption.</p>
          </div>
          <div className="space-y-3 group p-4 rounded-2xl hover:bg-brand-card/30 transition-all duration-300 border border-transparent hover:border-brand-border/40">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-brand-primary/10 text-brand-primary mx-auto border border-brand-primary/20">
              <Award size={22} />
            </div>
            <p className="text-brand-text font-bold text-lg">Clinician Reviewed</p>
            <p className="text-brand-text-muted text-sm leading-relaxed">Engineered in collaboration with medical experts.</p>
          </div>
          <div className="space-y-3 group p-4 rounded-2xl hover:bg-brand-card/30 transition-all duration-300 border border-transparent hover:border-brand-border/40">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-brand-primary/10 text-brand-primary mx-auto border border-brand-primary/20">
              <Clock size={22} />
            </div>
            <p className="text-brand-text font-bold text-lg">24/7 Support</p>
            <p className="text-brand-text-muted text-sm leading-relaxed">Always available when you need diagnostic support.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

