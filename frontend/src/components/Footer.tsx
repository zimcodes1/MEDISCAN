import { Activity, Mail } from 'lucide-react';
import LinkedIn from './svgs/LinkedIn';
import Github from './svgs/GitHub';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Activity className="text-white" size={24} />
              </div>
              <span className="text-xl font-bold text-white">MediScan NG</span>
            </div>
            <p className="text-sm text-gray-400">
              AI-powered diagnostic support for modern African healthcare.
            </p>
            <div className="flex gap-4 pt-4">
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                <Github size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                <LinkedIn size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                <Mail size={20} />
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="text-gray-400 hover:text-blue-400 transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="text-gray-400 hover:text-blue-400 transition-colors">How It Works</a></li>
              <li><a href="#benefits" className="text-gray-400 hover:text-blue-400 transition-colors">Pricing</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Documentation</a></li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">About Us</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Blog</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Careers</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Security</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">Compliance</a></li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800"></div>

        {/* Disclaimer */}
        <div className="mt-12 bg-gray-800 rounded-lg p-6 space-y-3">
          <p className="text-sm font-semibold text-yellow-400">
            ⚠️ Medical Disclaimer
          </p>
          <p className="text-sm text-gray-400 leading-relaxed">
            MediScan NG is a decision-support tool designed to assist qualified healthcare professionals. 
            It is <span className="font-semibold">not</span> a diagnostic instrument and should <span className="font-semibold">never</span> be used as a replacement for professional medical judgment. 
            All findings must be reviewed and confirmed by qualified clinicians. Always follow your institutional protocols.
          </p>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              © {currentYear} MediScan NG. All rights reserved.
            </p>
            <p className="text-sm text-gray-400">
              Built with ❤️ for African healthcare
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
