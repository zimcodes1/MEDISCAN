import { Brain, Zap, Lock, BarChart3 } from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-8 space-y-4 border border-gray-100">
      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
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
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            Powerful Features for Modern Healthcare
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
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
