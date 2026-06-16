import { Mail, AlertTriangle } from 'lucide-react';
import LinkedIn from './svgs/LinkedIn';
import Github from './svgs/GitHub';
import Logo from './svgs/Logo';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-brand-bg text-brand-text border-t border-brand-border/40">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-primary/10 border border-brand-primary/20 rounded-xl flex items-center justify-center text-brand-primary">
                <Logo size={24} />
              </div>
              <span className="text-xl font-bold tracking-tight text-brand-text">
                MediScan<span className="text-brand-primary font-extrabold ml-1">NG</span>
              </span>
            </div>
            <p className="text-sm text-brand-text-muted leading-relaxed">
              AI-powered diagnostic support for modern African healthcare.
            </p>
            <div className="flex gap-4 pt-2">
              <a href="#" className="w-9 h-9 rounded-lg flex items-center justify-center border border-brand-border bg-brand-card/40 hover:bg-brand-primary/15 hover:border-brand-primary/40 text-brand-text-muted hover:text-brand-primary transition-all duration-300">
                <Github size={18} />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg flex items-center justify-center border border-brand-border bg-brand-card/40 hover:bg-brand-primary/15 hover:border-brand-primary/40 text-brand-text-muted hover:text-brand-primary transition-all duration-300">
                <LinkedIn size={18} />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg flex items-center justify-center border border-brand-border bg-brand-card/40 hover:bg-brand-primary/15 hover:border-brand-primary/40 text-brand-text-muted hover:text-brand-primary transition-all duration-300">
                <Mail size={18} />
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h4 className="text-brand-text font-bold text-base tracking-wide uppercase">Product</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#features" className="text-brand-text-muted hover:text-brand-primary transition-colors duration-300">Features</a></li>
              <li><a href="#how-it-works" className="text-brand-text-muted hover:text-brand-primary transition-colors duration-300">How It Works</a></li>
              <li><a href="#benefits" className="text-brand-text-muted hover:text-brand-primary transition-colors duration-300">Pricing</a></li>
              <li><a href="#" className="text-brand-text-muted hover:text-brand-primary transition-colors duration-300">Documentation</a></li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="text-brand-text font-bold text-base tracking-wide uppercase">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="text-brand-text-muted hover:text-brand-primary transition-colors duration-300">About Us</a></li>
              <li><a href="#" className="text-brand-text-muted hover:text-brand-primary transition-colors duration-300">Blog</a></li>
              <li><a href="#" className="text-brand-text-muted hover:text-brand-primary transition-colors duration-300">Careers</a></li>
              <li><a href="#" className="text-brand-text-muted hover:text-brand-primary transition-colors duration-300">Contact</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-brand-text font-bold text-base tracking-wide uppercase">Legal</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="text-brand-text-muted hover:text-brand-primary transition-colors duration-300">Privacy Policy</a></li>
              <li><a href="#" className="text-brand-text-muted hover:text-brand-primary transition-colors duration-300">Terms of Service</a></li>
              <li><a href="#" className="text-brand-text-muted hover:text-brand-primary transition-colors duration-300">Security</a></li>
              <li><a href="#" className="text-brand-text-muted hover:text-brand-primary transition-colors duration-300">Compliance</a></li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-brand-border/40"></div>

        {/* Disclaimer */}
        <div className="mt-12 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle size={18} />
            <p className="text-sm font-bold uppercase tracking-wider">
              Medical Disclaimer
            </p>
          </div>
          <p className="text-sm text-brand-text-muted leading-relaxed">
            MediScan NG is a decision-support tool designed to assist qualified healthcare professionals. 
            It is <span className="font-semibold text-brand-text">not</span> a diagnostic instrument and should <span className="font-semibold text-brand-text">never</span> be used as a replacement for professional medical judgment. 
            All findings must be reviewed and confirmed by qualified clinicians. Always follow your institutional protocols.
          </p>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-brand-border/40 bg-brand-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-brand-text-muted">
              © {currentYear} MediScan NG. All rights reserved.
            </p>
            <p className="text-sm text-brand-text-muted">
              Built with ❤️ for African healthcare
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

