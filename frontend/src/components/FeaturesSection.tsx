import { Brain, Zap, Lock, BarChart3 } from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-8 space-y-5 group relative overflow-hidden">
      {/* Absolute corner glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full blur-xl pointer-events-none group-hover:bg-brand-primary/15 transition-all duration-500" />
      
      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-brand-primary/10 border border-brand-primary/20 text-brand-primary group-hover:bg-brand-primary group-hover:text-brand-bg transition-all duration-500 shadow-[0_0_15px_rgba(0,210,255,0.1)]">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-brand-text leading-tight group-hover:text-brand-primary transition-colors duration-300">{title}</h3>
      <p className="text-brand-text-muted text-sm leading-relaxed">{description}</p>
    </div>
  );
}

export default function FeaturesSection() {
  const features = [
    {
      icon: <Brain size={24} />,
      title: 'AI-Powered Analysis',
      description: 'Using advanced deep learning models trained on thousands of chest X-rays to detect pneumonia with high accuracy.',
    },
    {
      icon: <Zap size={24} />,
      title: 'Lightning Fast',
      description: 'Get results in seconds, not hours. Accelerate your clinical workflow and improve patient turnaround times.',
    },
    {
      icon: <BarChart3 size={24} />,
      title: 'Visual Explanations',
      description: 'Grad-CAM heatmaps show exactly where the AI is focusing, supporting your clinical decision-making.',
    },
    {
      icon: <Lock size={24} />,
      title: 'Secure & Compliant',
      description: 'HIPAA-compliant infrastructure. Your patient data is encrypted and protected at rest and in transit.',
    },
  ];

  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-brand-bg relative overflow-hidden border-t border-brand-border/40">
      {/* Background grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(26,36,63,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(26,36,63,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-16 relative z-10">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-brand-primary/20 bg-brand-primary/5 text-brand-primary text-xs font-bold uppercase tracking-wider">
            Capabilities
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-brand-text tracking-tight">
            Powerful Features for Modern Healthcare
          </h2>
          <p className="text-lg text-brand-text-muted">
            Everything you need to provide faster, more confident diagnoses
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

