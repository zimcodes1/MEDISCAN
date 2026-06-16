import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from './svgs/Logo';

export default function Navigation() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Benefits', href: '#benefits' },
    { name: 'About', href: '#about' }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-brand-border/40 bg-brand-bg/70 backdrop-blur-md transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="p-2 rounded-xl bg-brand-primary/10 border border-brand-primary/20 group-hover:border-brand-primary/50 group-hover:bg-brand-primary/20 transition-all duration-300">
              <Logo size={28} />
            </div>
            <span className="text-xl font-bold tracking-tight text-white group-hover:to-brand-primary-hover transition-all duration-300">
              Mediscan
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="relative py-2 text-sm font-medium text-brand-text-muted hover:text-brand-primary transition-colors duration-300 group"
              >
                {link.name}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-brand-primary to-brand-secondary transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="text-brand-text-muted hover:text-brand-primary px-4 py-2 text-sm font-semibold rounded-xl hover:bg-brand-border/30 transition-all duration-300"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-bold text-brand-bg rounded-xl group bg-gradient-to-br from-brand-primary to-brand-secondary hover:text-brand-text focus:ring-4 focus:outline-none focus:ring-brand-primary/30 active:scale-95 transition-all duration-200 shadow-[0_0_20px_rgba(0,210,255,0.2)] hover:shadow-[0_0_30px_rgba(0,210,255,0.45)] mt-2"
            >
              <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-brand-primary rounded-[10px] group-hover:bg-opacity-0">
                Sign Up
              </span>
            </button>
          </div>

          {/* Mobile Hamburger Menu */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2.5 rounded-xl border border-brand-border/40 hover:bg-brand-border/30 text-brand-text-muted hover:text-brand-primary transition-all duration-300"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-brand-border/40 bg-brand-bg/95 backdrop-blur-lg rounded-2xl mx-2 my-2 py-4 px-3 space-y-2 shadow-2xl border animate-fade-in-up">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-3 text-base font-semibold text-brand-text-muted hover:text-brand-primary hover:bg-brand-border/30 rounded-xl transition-all duration-300"
              >
                {link.name}
              </a>
            ))}
            <div className="pt-4 border-t border-brand-border/40 space-y-3">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('/login');
                }}
                className="w-full text-center py-3 text-brand-text-muted hover:text-brand-primary font-semibold rounded-xl hover:bg-brand-border/30 transition-all duration-300"
              >
                Login
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('/signup');
                }}
                className="w-full py-3.5 bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg font-extrabold rounded-xl hover:shadow-[0_0_20px_rgba(0,210,255,0.3)] transition-all duration-300 active:scale-95"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

