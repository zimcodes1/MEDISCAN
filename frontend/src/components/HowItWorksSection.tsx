import { Upload, Cpu, CheckCircle } from 'lucide-react';

interface StepProps {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function Step({ step, icon, title, description }: StepProps) {
  return (
    <div className="relative">
      {/* Connector Line */}
      {step < 3 && (
        <div className="absolute top-20 left-[3.5rem] w-0.5 h-16 bg-gradient-to-b from-blue-400 to-blue-200 hidden md:block" />
      )}

      <div className="relative space-y-4">
        <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
          {step}
        </div>
        <div className="text-blue-600 mt-2">{icon}</div>
        <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
        <p className="text-gray-600 leading-relaxed text-lg">{description}</p>
      </div>
    </div>
  );
}

export default function HowItWorksSection() {
  const steps = [
    {
      step: 1,
      icon: <Upload size={32} />,
      title: 'Upload X-Ray',
      description: 'Upload a chest X-ray image in JPEG or PNG format. Our system accepts both digital scans and device photos.',
    },
    {
      step: 2,
      icon: <Cpu size={32} />,
      title: 'AI Analysis',
      description: 'Our trained deep learning model analyzes the image and generates a prediction with confidence scoring in seconds.',
    },
    {
      step: 3,
      icon: <CheckCircle size={32} />,
      title: 'Review & Confirm',
      description: 'Review the AI findings with a visual heatmap overlay. Add clinical notes and confirm your diagnosis.',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Three simple steps to get AI-powered diagnostic support
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-3 gap-12">
          {steps.map((item) => (
            <Step
              key={item.step}
              step={item.step}
              icon={item.icon}
              title={item.title}
              description={item.description}
            />
          ))}
        </div>

        {/* Demo Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 items-center p-12">
            <div className="space-y-4">
              <h3 className="text-3xl font-bold text-gray-900">See It In Action</h3>
              <p className="text-lg text-gray-700 leading-relaxed">
                Our AI analyzes chest X-rays with 94% accuracy, producing detailed heatmaps that highlight areas of concern. Perfect for radiologist review and clinician reference.
              </p>
              <div className="flex gap-4 pt-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Accuracy</p>
                  <p className="text-2xl font-bold text-blue-600">94%</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Response Time</p>
                  <p className="text-2xl font-bold text-blue-600">&lt; 5s</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Sensitivity</p>
                  <p className="text-2xl font-bold text-blue-600">90%+</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1631217314830-f1f16c4a2f00?w=600&h=400&fit=crop"
                alt="X-ray analysis demo"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
