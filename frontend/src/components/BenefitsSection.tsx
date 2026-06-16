import { useState } from 'react';
import { Clock, Users, TrendingUp, Headphones, AlertCircle } from 'lucide-react';

interface BenefitProps {
  icon: React.ReactNode;
  metric: string;
  title: string;
  description: string;
}

function BenefitCard({ icon, metric, title, description }: BenefitProps) {
  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-8 space-y-5 group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full blur-xl pointer-events-none group-hover:bg-brand-primary/15 transition-all duration-500" />

      <div className="flex items-start gap-5">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-brand-primary/10 border border-brand-primary/20 text-brand-primary group-hover:bg-brand-primary group-hover:text-brand-bg transition-all duration-500 flex-shrink-0 shadow-[0_0_15px_rgba(0,210,255,0.1)]">
          {icon}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-brand-primary uppercase tracking-widest">{metric}</p>
          <h3 className="text-2xl font-bold text-brand-text group-hover:text-brand-primary transition-colors duration-300">{title}</h3>
        </div>
      </div>
      <p className="text-brand-text-muted leading-relaxed text-sm">{description}</p>
    </div>
  );
}

export default function BenefitsSection() {
  const [imageLoaded, setImageLoaded] = useState(false);

  const benefits = [
    {
      icon: <Clock size={24} />,
      metric: 'Speed',
      title: 'Reduce Diagnosis Time',
      description: 'Get preliminary AI findings in seconds instead of hours. Accelerate patient care and reduce waiting times.',
    },
    {
      icon: <Users size={24} />,
      metric: 'Access',
      title: 'Bridge the Specialist Gap',
      description: 'Bring diagnostic support to remote areas where radiologists are scarce. Improve healthcare equity across Nigeria.',
    },
    {
      icon: <TrendingUp size={24} />,
      metric: 'Confidence',
      title: 'Support Clinical Decisions',
      description: 'Visual heatmaps and explainable AI help clinicians understand and trust the model recommendations.',
    },
    {
      icon: <Headphones size={24} />,
      metric: 'Support',
      title: 'Continuous Learning',
      description: 'Our system improves with every use. Clinician feedback helps strengthen the AI over time.',
    },
  ];

  return (
    <section id="benefits" className="py-24 px-4 sm:px-6 lg:px-8 bg-brand-bg relative overflow-hidden border-t border-brand-border/40">
      {/* Background glow */}
      <div className="absolute bottom-1/2 left-0 w-[400px] h-[400px] rounded-full bg-brand-primary/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-20 relative z-10">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-brand-primary/20 bg-brand-primary/5 text-brand-primary text-xs font-bold uppercase tracking-wider">
            Impact
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-brand-text tracking-tight">
            Real Impact for African Healthcare
          </h2>
          <p className="text-lg text-brand-text-muted">
            MediScan NG is designed specifically for the realities of healthcare in Nigeria and across Africa
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {benefits.map((benefit, index) => (
            <BenefitCard
              key={index}
              icon={benefit.icon}
              metric={benefit.metric}
              title={benefit.title}
              description={benefit.description}
            />
          ))}
        </div>

        {/* Context Section */}
        <div className="bg-gradient-to-br from-brand-card to-brand-bg/40 border border-brand-border/60 rounded-3xl overflow-hidden shadow-2xl relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center p-12 max-sm:p-6 relative z-10">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 text-amber-500 bg-amber-500/10 border border-amber-500/25 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                  <AlertCircle size={14} />
                  The Challenge in Nigeria
                </div>
                <h3 className="text-3xl md:text-4xl font-extrabold text-brand-text tracking-tight">
                  Democratizing Healthcare Access
                </h3>
              </div>

              {/* Highlight metrics */}
              <div className="space-y-6">
                <div className="max-sm:flex-col flex gap-2 md:gap-4 items-start">
                  <div className="text-2xl md:text-4xl font-black bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent text-neon-glow shrink-0 w-fit md:w-32">&lt; 500</div>
                  <div>
                    <h4 className="text-lg font-bold text-brand-text">Qualified Radiologists</h4>
                    <p className="text-brand-text-muted text-sm leading-relaxed">Serving a growing population of over 220+ million people nationwide.</p>
                  </div>
                </div>

                <div className="max-sm:flex-col flex gap-2 md:gap-4 items-start pt-3 md:pt-6 border-t border-brand-border/60">
                  <div className="text-2xl md:text-4xl font-black bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent text-neon-glow shrink-0 md:w-32">Critical</div>
                  <div>
                    <h4 className="text-lg font-bold text-brand-text">Specialist Gap</h4>
                    <p className="text-brand-text-muted text-sm leading-relaxed">Many hospitals have imaging equipment but lack the specialists required to interpret findings quickly.</p>
                  </div>
                </div>

                <div className="max-sm:flex-col flex gap-2 md:gap-4 items-start pt-3 md:pt-6 border-t border-brand-border/60">
                  <div className="text-2xl md:text-4xl font-black bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent text-neon-glow shrink-0 md:w-32">Delayed</div>
                  <div>
                    <h4 className="text-lg font-bold text-brand-text">Diagnostic Care</h4>
                    <p className="text-brand-text-muted text-sm leading-relaxed">This diagnostic gap leads to delayed treatment, especially for time-sensitive respiratory conditions.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* The Image Overlay layout */}
            <div className="relative rounded-2xl p-1.5 border border-brand-border/60 bg-brand-bg/50 overflow-hidden shadow-xl aspect-[4/3] group">
              {!imageLoaded && (
                <div className="absolute inset-0 skeleton-placeholder z-0" />
              )}
              <img
                src="/images/medium-shot-nurse-looking-radiography.jpg"
                alt="Healthcare radiology"
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                className={`w-full h-full object-cover rounded-xl transition-all duration-700 ease-out group-hover:scale-103 brightness-[0.8] contrast-[1.05] saturate-[0.8] ${imageLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-95 blur-md'
                  }`}
              />
              {/* Cohesive blue overlay blend mask */}
              <div className="absolute inset-1.5 bg-brand-primary/10 mix-blend-color pointer-events-none rounded-xl z-10" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

