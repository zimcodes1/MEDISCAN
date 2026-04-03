import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Lock, ArrowRight, Loader } from 'lucide-react';

export default function StaffInviteAcceptancePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token');
  const email = searchParams.get('email') || '';

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!inviteToken) {
      newErrors.submit = 'Invalid invite link. Please check your email.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      // TODO: Call backend API
      // const response = await axios.post('/api/auth/staff/accept-invite/', {
      //   token: inviteToken,
      //   fullName: formData.fullName,
      //   password: formData.password,
      // });

      await new Promise(resolve => setTimeout(resolve, 1000));
      navigate('/login', { 
        state: { message: 'Account created successfully. Please log in.' } 
      });
    } catch (error) {
      setErrors({ submit: 'Failed to create account. The link may have expired.' });
    } finally {
      setLoading(false);
    }
  };

  if (!inviteToken) {
    return (
      <div className="min-h-screen bg-[#0c1324] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-[#191f31] rounded-3xl border border-[#2e3447] p-8 text-center space-y-4">
          <div className="text-[#ffb4ab] text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-[#dce1fb]">Invalid Invite Link</h1>
          <p className="text-[#dce1fb]">
            This invite link is invalid or has expired. Please ask your organization admin to send you a new invitation.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full text-[#0c1324] py-3 rounded-xl font-semibold"
            style={{
              background: 'linear-gradient(135deg, #7bd0ff 0%, #008abb 100%)'
            }}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c1324] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-linear-to-br from-[#7bd0ff] to-[#008abb] rounded-2xl flex items-center justify-center shadow-lg">
              <User className="text-[#0c1324]" size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[#dce1fb] mb-2">Set Up Your Account</h1>
          <p className="text-[#dce1fb]">You've been invited to join MediScan NG</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-[#191f31] rounded-3xl border border-[#2e3447] p-8 space-y-6">
          {errors.submit && (
            <div className="bg-[#ffb4ab] bg-opacity-20 border border-[#ffb4ab] rounded-xl p-4 flex items-start gap-3">
              <div className="w-5 h-5 bg-[#ffb4ab] rounded-full shrink-0 mt-0.5"></div>
              <p className="text-[#ffb4ab] text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Email Display */}
          <div className="bg-[#151b2d] rounded-xl border border-[#2e3447] p-4 space-y-2">
            <p className="text-sm text-[#8c91a8]">Account Email</p>
            <p className="text-lg font-semibold text-[#7bd0ff] break-all">{email}</p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-[#dce1fb] mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="First & Last Name"
              className={`w-full px-4 py-3 rounded-xl bg-[#151b2d] border-2 text-[#dce1fb] placeholder-[#8c91a8] transition-all ${
                errors.fullName
                  ? 'border-[#ffb4ab] focus:border-[#ffb4ab] focus:ring-2 focus:ring-[#ffb4ab] focus:ring-opacity-20'
                  : 'border-[#2e3447] focus:border-[#7bd0ff] focus:ring-2 focus:ring-[#7bd0ff] focus:ring-opacity-20'
              }`}
            />
            {errors.fullName && (
              <p className="text-[#ffb4ab] text-sm mt-1">{errors.fullName}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="flex text-sm font-medium text-[#dce1fb] mb-2 items-center gap-2">
              <Lock size={16} className="text-[#7bd0ff]" />
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className={`w-full px-4 py-3 rounded-xl bg-[#151b2d] border-2 text-[#dce1fb] placeholder-[#8c91a8] transition-all ${
                errors.password
                  ? 'border-[#ffb4ab] focus:border-[#ffb4ab] focus:ring-2 focus:ring-[#ffb4ab] focus:ring-opacity-20'
                  : 'border-[#2e3447] focus:border-[#7bd0ff] focus:ring-2 focus:ring-[#7bd0ff] focus:ring-opacity-20'
              }`}
            />
            {errors.password && (
              <p className="text-[#ffb4ab] text-sm mt-1">{errors.password}</p>
            )}
            <p className="text-xs text-[#8c91a8] mt-2">Minimum 8 characters</p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-[#dce1fb] mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className={`w-full px-4 py-3 rounded-xl bg-[#151b2d] border-2 text-[#dce1fb] placeholder-[#8c91a8] transition-all ${
                errors.confirmPassword
                  ? 'border-[#ffb4ab] focus:border-[#ffb4ab] focus:ring-2 focus:ring-[#ffb4ab] focus:ring-opacity-20'
                  : 'border-[#2e3447] focus:border-[#7bd0ff] focus:ring-2 focus:ring-[#7bd0ff] focus:ring-opacity-20'
              }`}
            />
            {errors.confirmPassword && (
              <p className="text-[#ffb4ab] text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-[#0c1324] py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
            style={{
              background: loading ? '#7bd0ff' : 'linear-gradient(135deg, #7bd0ff 0%, #008abb 100%)',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? (
              <>
                <Loader size={20} className="animate-spin" />
                Setting Up Account...
              </>
            ) : (
              <>
                Complete Setup
                <ArrowRight size={20} />
              </>
            )}
          </button>

          {/* Help Text */}
          <p className="text-center text-xs text-[#8c91a8]">
            By completing this setup, you agree to our{' '}
            <a href="#" className="text-[#7bd0ff] hover:underline">
              Terms of Service
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
