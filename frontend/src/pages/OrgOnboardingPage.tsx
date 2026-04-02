import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Image, Users, ArrowRight, ArrowLeft, Check, Loader, Plus } from 'lucide-react';

type OnboardingStep = 1 | 2;

interface StaffMember {
  fullName: string;
  email: string;
  role: 'radiologist' | 'clinician';
}

export default function OrgOnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1: Finish Profile
  const [profileData, setProfileData] = useState({
    adminJobTitle: '',
    organisationLogo: null as File | null,
    numberOfRadiologists: '',
  });

  // Step 2: Add Staff
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [newStaff, setNewStaff] = useState({
    fullName: '',
    email: '',
    role: 'radiologist' as 'radiologist' | 'clinician',
  });
  const [skipmessageShown, setSkipMessageShown] = useState(false);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'file') {
      const file = (e.target as HTMLInputElement).files?.[0];
      setProfileData(prev => ({ ...prev, [name]: file }));
    } else {
      setProfileData(prev => ({ ...prev, [name]: value }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleStaffChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewStaff(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateProfileForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!profileData.adminJobTitle.trim()) {
      newErrors.adminJobTitle = 'Job title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddStaff = () => {
    const newErrors: Record<string, string> = {};

    if (!newStaff.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (!newStaff.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (staffList.some(s => s.email === newStaff.email)) {
      newErrors.email = 'This email is already added';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setStaffList(prev => [...prev, newStaff]);
      setNewStaff({ fullName: '', email: '', role: 'radiologist' });
    }
  };

  const handleRemoveStaff = (index: number) => {
    setStaffList(prev => prev.filter((_, i) => i !== index));
  };

  const handleProceedToStep2 = () => {
    if (validateProfileForm()) {
      setStep(2);
      setErrors({});
    }
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    
    try {
      // TODO: Call backend API
      // const response = await axios.post('/api/auth/organisations/complete-onboarding/', {
      //   ...profileData,
      //   staff: staffList,
      // });

      await new Promise(resolve => setTimeout(resolve, 1000));
      navigate('/dashboard');
    } catch (error) {
      setErrors({ submit: 'Failed to complete onboarding. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setSkipMessageShown(true);
    setTimeout(() => {
      handleCompleteOnboarding();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Users className="text-white" size={28} />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 text-center mb-2">
            Finish Your Setup
          </h1>
          <p className="text-lg text-gray-600 text-center">
            {step === 1 ? 'Complete your organization profile' : 'Add your team members'}
          </p>

          {/* Progress Bar */}
          <div className="mt-6 flex gap-2">
            {[1, 2].map(i => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${
                  i <= step ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              ></div>
            ))}
          </div>
        </div>

        {/* Forms */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          {/* Step 1: Finish Profile */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <User size={24} className="text-blue-600" />
                Step 1: Finish Your Profile
              </h2>

              {/* Job Title */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Your Job Title
                </label>
                <input
                  type="text"
                  name="adminJobTitle"
                  value={profileData.adminJobTitle}
                  onChange={handleProfileChange}
                  placeholder="e.g., Medical Director, IT Administrator"
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all placeholder-gray-400 ${
                    errors.adminJobTitle
                      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                      : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
                {errors.adminJobTitle && (
                  <p className="text-red-600 text-sm mt-1">{errors.adminJobTitle}</p>
                )}
              </div>

              {/* Organisation Logo */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Image size={16} className="text-blue-600" />
                  Organisation Logo (Optional)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    name="organisationLogo"
                    onChange={handleProfileChange}
                    accept="image/*"
                    className="hidden"
                    id="logo-input"
                  />
                  <label
                    htmlFor="logo-input"
                    className="block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                  >
                    {profileData.organisationLogo ? (
                      <div className="space-y-2">
                        <Check className="text-green-600 mx-auto" size={32} />
                        <p className="font-medium text-gray-900">{profileData.organisationLogo.name}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Image className="text-gray-400 mx-auto" size={32} />
                        <p className="font-medium text-gray-900">Upload a logo</p>
                        <p className="text-sm text-gray-600">PNG, JPG or GIF (max. 2MB)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Number of Radiologists */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Number of Radiologists (Optional)
                </label>
                <input
                  type="number"
                  name="numberOfRadiologists"
                  value={profileData.numberOfRadiologists}
                  onChange={handleProfileChange}
                  placeholder="e.g., 5"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-400"
                />
                <p className="text-xs text-gray-500 mt-2">Helps us size your account better</p>
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-6">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-900 hover:bg-gray-50 transition-all font-medium flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <button
                  onClick={handleProceedToStep2}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-semibold flex items-center justify-center gap-2"
                >
                  Next
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Add Staff */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users size={24} className="text-blue-600" />
                Step 2: Add Your Team
              </h2>

              {skipmessageShown && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                  <Check className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-green-700 font-medium">You can add team members from the dashboard later</p>
                </div>
              )}

              {/* Add New Staff Form */}
              <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-gray-900">Invite a Team Member</h3>

                <div className="space-y-3">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={newStaff.fullName}
                      onChange={handleStaffChange}
                      placeholder="First & Last Name"
                      className={`w-full px-4 py-2 rounded-lg border-2 transition-all placeholder-gray-400 text-sm ${
                        errors.fullName
                          ? 'border-red-300 focus:border-red-500'
                          : 'border-gray-200 focus:border-blue-500'
                      }`}
                    />
                    {errors.fullName && (
                      <p className="text-red-600 text-xs mt-1">{errors.fullName}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Work Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={newStaff.email}
                      onChange={handleStaffChange}
                      placeholder="colleague@hospital.com"
                      className={`w-full px-4 py-2 rounded-lg border-2 transition-all placeholder-gray-400 text-sm ${
                        errors.email
                          ? 'border-red-300 focus:border-red-500'
                          : 'border-gray-200 focus:border-blue-500'
                      }`}
                    />
                    {errors.email && (
                      <p className="text-red-600 text-xs mt-1">{errors.email}</p>
                    )}
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Role
                    </label>
                    <select
                      name="role"
                      value={newStaff.role}
                      onChange={handleStaffChange}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 transition-all text-sm"
                    >
                      <option value="radiologist">Radiologist</option>
                      <option value="clinician">Clinician</option>
                    </select>
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={handleAddStaff}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-all font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Add Team Member
                  </button>
                </div>
              </div>

              {/* Staff List */}
              {staffList.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">
                    Team Members ({staffList.length})
                  </h3>
                  {staffList.map((staff, index) => (
                    <div key={index} className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{staff.fullName}</p>
                        <p className="text-sm text-gray-600">{staff.email}</p>
                        <p className="text-xs text-blue-600 font-medium mt-1">
                          {staff.role === 'radiologist' ? '🔬 Radiologist' : '👨‍⚕️ Clinician'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveStaff(index)}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-900 hover:bg-gray-50 transition-all font-medium flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <button
                  onClick={handleSkip}
                  disabled={loading}
                  className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-900 hover:bg-gray-50 transition-all font-medium"
                >
                  Skip For Now
                </button>
                <button
                  onClick={handleCompleteOnboarding}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <Check size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
