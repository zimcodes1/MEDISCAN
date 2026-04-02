import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-white via-blue-50 to-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-full">
                <Zap className="text-blue-600" size={18} />
                <span className="text-blue-600 font-medium text-sm">AI-Powered Medical Imaging</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                Faster Diagnosis,
                <span className="text-blue-600"> Better Care</span>
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                MediScan NG is an AI-powered decision-support tool that helps clinicians analyze chest X-rays faster. 
                Get preliminary findings in seconds, with visual explanations to guide your clinical judgment.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
              >
                Get Started
                <ArrowRight size={20} />
              </button>
              <button
                onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center justify-center gap-2 border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-lg hover:bg-blue-50 transition-colors font-semibold text-lg"
              >
                Learn More
              </button>
            </div>

            {/* Trust Badge */}
            <div className="pt-4 text-sm text-gray-600">
              <p>🔒 HIPAA-compliant • 🏥 Built for African healthcare • ✅ Clinician-reviewed</p>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl opacity-10 blur-3xl"></div>
            <img
              src="/images/doctor-typing.png"
              alt="Medical X-ray analysis"
              className="relative rounded-2xl shadow-2xl w-full object-cover"
            />
            {/* Badge */}
            <div className="absolute bottom-6 left-6 bg-white rounded-lg shadow-lg px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">AI Analysis</p>
              <p className="text-xs text-green-600">Ready in &lt; 5 seconds</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
