import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from './svgs/Logo';

export default function Navigation() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 bg-[#0c1324] border-b border-[#151b2d] z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center justify-between gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Logo size={32}/>
            <span className="text-xl font-bold text-[#7bd0ff]">Mediscan NG</span>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[#dce1fb] hover:text-[#7bd0ff] transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-[#dce1fb] hover:text-[#7bd0ff] transition-colors">
              How It Works
            </a>
            <a href="#benefits" className="text-[#dce1fb] hover:text-[#7bd0ff] transition-colors">
              Benefits
            </a>
            <a href="#about" className="text-[#dce1fb] hover:text-[#7bd0ff] transition-colors">
              About
            </a>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-[#7bd0ff] hover:text-[#5db8ff] px-4 py-2 rounded-lg transition-colors font-medium"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="bg-[#7bd0ff] text-[#0c1324] px-6 py-2 rounded-lg hover:bg-[#5db8ff] transition-colors font-medium"
            >
              Sign Up
            </button>
          </div>

          {/* Mobile Hamburger Menu */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-[#191f31] transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} className="text-[#dce1fb]" /> : <Menu size={24} className="text-[#dce1fb]" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-[#151b2d] py-4 space-y-3">
            <a
              href="#features"
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-2 text-[#dce1fb] hover:text-[#7bd0ff] hover:bg-[#191f31] rounded-lg transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-2 text-[#dce1fb] hover:text-[#7bd0ff] hover:bg-[#191f31] rounded-lg transition-colors"
            >
              How It Works
            </a>
            <a
              href="#benefits"
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-2 text-[#dce1fb] hover:text-[#7bd0ff] hover:bg-[#191f31] rounded-lg transition-colors"
            >
              Benefits
            </a>
            <a
              href="#about"
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-2 text-[#dce1fb] hover:text-[#7bd0ff] hover:bg-[#191f31] rounded-lg transition-colors"
            >
              About
            </a>
            <div className="pt-3 border-t border-[#151b2d] space-y-2">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('/login');
                }}
                className="w-full text-left px-4 py-2 text-[#7bd0ff] hover:bg-[#191f31] rounded-lg transition-colors font-medium"
              >
                Login
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('/signup');
                }}
                className="w-full bg-[#7bd0ff] text-[#0c1324] px-4 py-2 rounded-lg hover:bg-[#5db8ff] transition-colors font-medium"
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
