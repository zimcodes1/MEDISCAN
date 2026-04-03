import { Clock, Users, TrendingUp, Headphones } from 'lucide-react';

interface BenefitProps {
  icon: React.ReactNode;
  metric: string;
  title: string;
  description: string;
}

function BenefitCard({ icon, metric, title, description }: BenefitProps) {
  return (
    <div className="space-y-4 border p-4 rounded-2xl border-[#2e3447] bg-[#191f31] backdrop-blur-2xl">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-lg flex items-center justify-center text-[#7bd0ff] flex-shrink-0">
          {icon}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[#7bd0ff] uppercase tracking-wide">{metric}</p>
          <h3 className="text-2xl font-bold text-[#dce1fb]">{title}</h3>
        </div>
      </div>
      <p className="text-[#dce1fb] leading-relaxed">{description}</p>
    </div>
  );
}

export default function BenefitsSection() {
  const benefits = [
    {
      icon: <Clock size={28} />,
      metric: 'Speed',
      title: 'Reduce Diagnosis Time',
      description: 'Get preliminary AI findings in seconds instead of hours. Accelerate patient care and reduce waiting times.',
    },
    {
      icon: <Users size={28} />,
      metric: 'Access',
      title: 'Bridge the Specialist Gap',
      description: 'Bring diagnostic support to remote areas where radiologists are scarce. Improve healthcare equity across Nigeria.',
    },
    {
      icon: <TrendingUp size={28} />,
      metric: 'Confidence',
      title: 'Support Clinical Decisions',
      description: 'Visual heatmaps and explainable AI help clinicians understand and trust the model recommendations.',
    },
    {
      icon: <Headphones size={28} />,
      metric: 'Support',
      title: 'Continuous Learning',
      description: 'Our system improves with every use. Clinician feedback helps strengthen the AI over time.',
    },
  ];

  return (
    <section id="benefits" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0c1324]">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl md:text-4xl font-bold text-[#dce1fb]">
            Real Impact for African Healthcare
          </h2>
          <p className="text-lg text-[#dce1fb] max-w-2xl mx-auto">
            MediScan NG is designed specifically for the realities of healthcare in Nigeria and across Africa
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 gap-12">
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
        <div className="bg-[#191f31] rounded-2xl border border-[#2e3447] p-10 max-sm:p-5">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-[#dce1fb] mb-6">
                The Challenge in Nigeria
              </h3>
              <div className="space-y-4 text-[#dce1fb]">
                <p className="text-lg">
                  <span className="font-bold text-[#7bd0ff]">&lt; 500</span> qualified radiologists serve Nigeria's <span className="font-bold text-[#7bd0ff]">220+ million</span> people.
                </p>
                <p className="text-lg">
                  Many hospitals have imaging equipment but lack trained specialists to interpret results quickly.
                </p>
                <p className="text-lg">
                  This diagnostic gap delays treatment, especially for time-sensitive conditions like pneumonia.
                </p>
              </div>
            </div>
            <img
              src="/images/medium-shot-nurse-looking-radiography.jpg"
              alt="Healthcare radiology"
              className="rounded-xl shadow-lg"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
