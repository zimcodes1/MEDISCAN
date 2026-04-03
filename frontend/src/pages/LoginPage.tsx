import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, StopCircle } from 'lucide-react';
import { login } from '../utils/auth';
import { getApiErrorMessage } from '../utils/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to sign in. Please check your details.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c1324] flex items-center justify-center px-4">
      <div className="w-full max-w-md pb-10 pt-5">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[#7bd0ff] hover:text-[#5db8ff] mb-8"
        >
          <ArrowLeft size={20} />
          Back to Home
        </button>

        {/* Login Card */}
        <div className="bg-[#191f31] rounded-2xl border border-[#2e3447] p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-[#dce1fb]">Welcome Back</h1>
            <p className="text-[#dce1fb]">Sign in to Mediscan</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500 flex gap-2 bg-opacity-20 rounded-xl p-4">
                <StopCircle className="text-white" size={20} />
                <p className="text-white text-sm">{error}</p>
              </div>
            )}
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-[#dce1fb]">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-[#151b2d] border border-[#2e3447] text-[#dce1fb] placeholder-[#8c91a8] rounded-lg focus:outline-none focus:border-[#7bd0ff] focus:ring-2 focus:ring-[#7bd0ff] focus:ring-opacity-20 transition-all"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-sm font-medium text-[#dce1fb]">
                  Password
                </label>
                <a href="#" className="text-sm text-[#7bd0ff] hover:text-[#5db8ff]">
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-[#151b2d] border border-[#2e3447] text-[#dce1fb] placeholder-[#8c91a8] rounded-lg focus:outline-none focus:border-[#7bd0ff] focus:ring-2 focus:ring-[#7bd0ff] focus:ring-opacity-20 transition-all"
                required
              />
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                className="w-4 h-4 bg-[#151b2d] border border-[#2e3447] text-[#7bd0ff] rounded"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-[#dce1fb]">
                Remember me
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-[#0c1324] py-3 rounded-lg font-semibold text-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              style={{
                background: loading ? '#7bd0ff' : 'linear-gradient(135deg, #7bd0ff 0%, #008abb 100%)',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2e3447]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#191f31] text-[#8c91a8]">Or</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-[#dce1fb]">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#7bd0ff] hover:text-[#5db8ff] font-semibold">
                Sign Up
              </Link>
            </p>
          </div>

          {/* Disclaimer */}
          <div className="pt-6 border-t border-[#2e3447]">
            <p className="text-xs text-[#8c91a8] text-center leading-relaxed">
              By signing in, you agree to our{' '}
              <a href="#" className="text-[#7bd0ff] hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-[#7bd0ff] hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
