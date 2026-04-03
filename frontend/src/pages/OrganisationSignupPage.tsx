import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, User, Phone, Lock, ArrowRight, Loader } from 'lucide-react';
import {
  mapOrganisationSignupToPayload,
  mapRegistrationErrors,
  registerOrganisation,
} from '../utils/auth';

export default function OrganisationSignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    organisationName: '',
    organisationType: 'hospital',
    state: '',
    workEmail: '',
    adminFullName: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
  });

  const states = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Borno', 'Cross River',
    'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna',
    'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun',
    'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
  ];

  const orgTypes = [
    { value: 'hospital', label: 'Hospital' },
    { value: 'diagnostic_centre', label: 'Diagnostic Centre' },
    { value: 'clinic', label: 'Clinic' },
    { value: 'telemedicine', label: 'Telemedicine Platform' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.organisationName.trim()) {
      newErrors.organisationName = 'Organisation name is required';
    }
    if (!formData.state) {
      newErrors.state = 'Please select a state';
    }
    if (!formData.workEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.workEmail = 'Please enter a valid email';
    }
    if (!formData.adminFullName.trim()) {
      newErrors.adminFullName = 'Full name is required';
    }
    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.phoneNumber.match(/^(\+234|0)[0-9]{10}$/)) {
      newErrors.phoneNumber = 'Please enter a valid Nigerian phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const payload = mapOrganisationSignupToPayload(formData);
      const response = await registerOrganisation(payload);

      navigate('/verify-email', { 
        state: { email: formData.workEmail, organisationId: response.organisation_id } 
      });
    } catch (error) {
      setErrors(mapRegistrationErrors(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c1324] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-linear-to-br from-[#7bd0ff] to-[#008abb] rounded-2xl flex items-center justify-center shadow-lg">
              <Building2 className="text-[#0c1324]" size={32} />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-[#dce1fb] mb-2">Register Your Organisation</h1>
          <p className="text-lg text-[#dce1fb]">Join MediScan NG and transform healthcare in your facility</p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="bg-[#191f31] rounded-3xl border border-[#2e3447] p-8 space-y-6">
          {errors.submit && (
            <div className="bg-[#ffb4ab] bg-opacity-20 border border-[#ffb4ab] rounded-xl p-4 flex items-start gap-3">
              <div className="w-5 h-5 bg-[#ffb4ab] rounded-full shrink-0 mt-0.5"></div>
              <p className="text-[#ffb4ab] text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Organisation Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#dce1fb] flex items-center gap-2">
              <Building2 size={20} className="text-[#7bd0ff]" />
              Organisation Details
            </h3>

            {/* Organisation Name */}
            <div>
              <label className="block text-sm font-medium text-[#dce1fb] mb-2">
                Organisation Name
              </label>
              <input
                type="text"
                name="organisationName"
                value={formData.organisationName}
                onChange={handleChange}
                placeholder="e.g., Maiduguri Specialist Hospital"
                className={`w-full px-4 py-3 rounded-xl bg-[#151b2d] border-2 text-[#dce1fb] placeholder-[#8c91a8] transition-all ${
                  errors.organisationName
                    ? 'border-[#ffb4ab] focus:border-[#ffb4ab] focus:ring-2 focus:ring-[#ffb4ab] focus:ring-opacity-20'
                    : 'border-[#2e3447] focus:border-[#7bd0ff] focus:ring-2 focus:ring-[#7bd0ff] focus:ring-opacity-20'
                }`}
              />
              {errors.organisationName && (
                <p className="text-[#ffb4ab] text-sm mt-1">{errors.organisationName}</p>
              )}
            </div>

            {/* Organisation Type & State */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#dce1fb] mb-2">
                  Organisation Type
                </label>
                <select
                  name="organisationType"
                  value={formData.organisationType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-[#151b2d] border-2 border-[#2e3447] text-[#dce1fb] focus:border-[#7bd0ff] focus:ring-2 focus:ring-[#7bd0ff] focus:ring-opacity-20 transition-all"
                >
                  {orgTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#dce1fb] mb-2">
                  State
                </label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl bg-[#151b2d] border-2 text-[#dce1fb] transition-all ${
                    errors.state
                      ? 'border-[#ffb4ab] focus:border-[#ffb4ab] focus:ring-2 focus:ring-[#ffb4ab] focus:ring-opacity-20'
                      : 'border-[#2e3447] focus:border-[#7bd0ff] focus:ring-2 focus:ring-[#7bd0ff] focus:ring-opacity-20'
                  }`}
                >
                  <option value="">Select a state</option>
                  {states.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                {errors.state && (
                  <p className="text-[#ffb4ab] text-sm mt-1">{errors.state}</p>
                )}
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="flex text-sm font-medium text-[#dce1fb] mb-2 items-center gap-2">
                <Phone size={16} className="text-[#7bd0ff]" />
                Phone Number
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="+234 8000 000 000"
                className={`w-full px-4 py-3 rounded-xl bg-[#151b2d] border-2 text-[#dce1fb] placeholder-[#8c91a8] transition-all ${
                  errors.phoneNumber
                    ? 'border-[#ffb4ab] focus:border-[#ffb4ab] focus:ring-2 focus:ring-[#ffb4ab] focus:ring-opacity-20'
                    : 'border-[#2e3447] focus:border-[#7bd0ff] focus:ring-2 focus:ring-[#7bd0ff] focus:ring-opacity-20'
                }`}
              />
              {errors.phoneNumber && (
                <p className="text-[#ffb4ab] text-sm mt-1">{errors.phoneNumber}</p>
              )}
            </div>
          </div>

          {/* Admin Details */}
          <div className="space-y-4 pt-6 border-t-2 border-[#2e3447]">
            <h3 className="text-lg font-semibold text-[#dce1fb] flex items-center gap-2">
              <User size={20} className="text-[#7bd0ff]" />
              Admin Account
            </h3>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-[#dce1fb] mb-2">
                Admin Full Name
              </label>
              <input
                type="text"
                name="adminFullName"
                value={formData.adminFullName}
                onChange={handleChange}
                placeholder="First & Last Name"
                className={`w-full px-4 py-3 rounded-xl bg-[#151b2d] border-2 text-[#dce1fb] placeholder-[#8c91a8] transition-all ${
                  errors.adminFullName
                    ? 'border-[#ffb4ab] focus:border-[#ffb4ab] focus:ring-2 focus:ring-[#ffb4ab] focus:ring-opacity-20'
                    : 'border-[#2e3447] focus:border-[#7bd0ff] focus:ring-2 focus:ring-[#7bd0ff] focus:ring-opacity-20'
                }`}
              />
              {errors.adminFullName && (
                <p className="text-[#ffb4ab] text-sm mt-1">{errors.adminFullName}</p>
              )}
            </div>

            {/* Work Email */}
            <div>
              <label className="flex text-sm font-medium text-[#dce1fb] mb-2 items-center gap-2">
                <Mail size={16} className="text-[#7bd0ff]" />
                Work Email
              </label>
              <input
                type="email"
                name="workEmail"
                value={formData.workEmail}
                onChange={handleChange}
                placeholder="admin@hospital.com"
                className={`w-full px-4 py-3 rounded-xl bg-[#151b2d] border-2 text-[#dce1fb] placeholder-[#8c91a8] transition-all ${
                  errors.workEmail
                    ? 'border-[#ffb4ab] focus:border-[#ffb4ab] focus:ring-2 focus:ring-[#ffb4ab] focus:ring-opacity-20'
                    : 'border-[#2e3447] focus:border-[#7bd0ff] focus:ring-2 focus:ring-[#7bd0ff] focus:ring-opacity-20'
                }`}
              />
              {errors.workEmail && (
                <p className="text-[#ffb4ab] text-sm mt-1">{errors.workEmail}</p>
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
          </div>

          {/* Terms & Conditions */}
          <div className="bg-[#151b2d] rounded-xl border border-[#2e3447] p-4 space-y-3">
            <p className="text-sm text-[#dce1fb] leading-relaxed">
              By registering, you agree to our{' '}
              <a href="#" className="text-[#7bd0ff] hover:underline font-semibold">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-[#7bd0ff] hover:underline font-semibold">Privacy Policy</a>
            </p>
            <p className="text-xs text-[#8c91a8]">
              You will start with a free 30-day trial. No payment information required at signup.
            </p>
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
                Creating Account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight size={20} />
              </>
            )}
          </button>

          {/* Sign In Link */}
          <p className="text-center text-[#dce1fb]">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-[#7bd0ff] hover:text-[#5db8ff] font-semibold"
            >
              Sign In
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
