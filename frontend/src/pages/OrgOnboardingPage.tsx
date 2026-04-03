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
    <div className="min-h-screen bg-[#0c1324] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-linear-to-br from-[#7bd0ff] to-[#008abb] rounded-2xl flex items-center justify-center shadow-lg">
              <Users className="text-[#0c1324]" size={28} />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-[#dce1fb] text-center mb-2">
            Finish Your Setup
          </h1>
          <p className="text-lg text-[#dce1fb] text-center">
            {step === 1 ? 'Complete your organization profile' : 'Add your team members'}
          </p>

          {/* Progress Bar */}
          <div className="mt-6 flex gap-2">
            {[1, 2].map(i => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${
                  i <= step ? 'bg-[#7bd0ff]' : 'bg-[#2e3447]'
                }`}
              ></div>
            ))}
          </div>
        </div>

        {/* Forms */}
        <div className="bg-[#191f31] rounded-3xl border border-[#2e3447] p-8">
          {/* Step 1: Finish Profile */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#dce1fb] flex items-center gap-2">
                <User size={24} className="text-[#7bd0ff]" />
                Step 1: Finish Your Profile
              </h2>

              {/* Job Title */}
              <div>
                <label className="block text-sm font-medium text-[#dce1fb] mb-2">
                  Your Job Title
                </label>
                <input
                  type="text"
                  name="adminJobTitle"
                  value={profileData.adminJobTitle}
                  onChange={handleProfileChange}
                  placeholder="e.g., Medical Director, IT Administrator"
                  className={`w-full px-4 py-3 rounded-xl bg-[#151b2d] border-2 text-[#dce1fb] placeholder-[#8c91a8] transition-all ${
                    errors.adminJobTitle
                      ? 'border-[#ffb4ab] focus:border-[#ffb4ab] focus:ring-2 focus:ring-[#ffb4ab] focus:ring-opacity-20'
                      : 'border-[#2e3447] focus:border-[#7bd0ff] focus:ring-2 focus:ring-[#7bd0ff] focus:ring-opacity-20'
                  }`}
                />
                {errors.adminJobTitle && (
                  <p className="text-[#ffb4ab] text-sm mt-1">{errors.adminJobTitle}</p>
                )}
              </div>

              {/* Organisation Logo */}
              <div>
                <label className="flex text-sm font-medium text-[#dce1fb] mb-2 items-center gap-2">
                  <Image size={16} className="text-[#7bd0ff]" />
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
                    className="block border-2 border-dashed border-[#2e3447] rounded-xl p-8 text-center cursor-pointer hover:border-[#7bd0ff] hover:bg-[#7bd0ff] hover:bg-opacity-5 transition-all"
                  >
                    {profileData.organisationLogo ? (
                      <div className="space-y-2">
                        <Check className="text-[#7bd0ff] mx-auto" size={32} />
                        <p className="font-medium text-[#dce1fb]">{profileData.organisationLogo.name}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Image className="text-[#8c91a8] mx-auto" size={32} />
                        <p className="font-medium text-[#dce1fb]">Upload a logo</p>
                        <p className="text-sm text-[#8c91a8]">PNG, JPG or GIF (max. 2MB)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Number of Radiologists */}
              <div>
                <label className="block text-sm font-medium text-[#dce1fb] mb-2">
                  Number of Radiologists (Optional)
                </label>
                <input
                  type="number"
                  name="numberOfRadiologists"
                  value={profileData.numberOfRadiologists}
                  onChange={handleProfileChange}
                  placeholder="e.g., 5"
                  className="w-full px-4 py-3 rounded-xl bg-[#151b2d] border-2 border-[#2e3447] text-[#dce1fb] placeholder-[#8c91a8] focus:border-[#7bd0ff] focus:ring-2 focus:ring-[#7bd0ff] focus:ring-opacity-20 transition-all"
                />
                <p className="text-xs text-[#8c91a8] mt-2">Helps us size your account better</p>
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-6">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 px-6 py-3 rounded-xl border-2 border-[#2e3447] text-[#dce1fb] hover:bg-[#2e3447] transition-all font-medium flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <button
                  onClick={handleProceedToStep2}
                  className="flex-1 text-[#0c1324] py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #7bd0ff 0%, #008abb 100%)'
                  }}
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
              <h2 className="text-2xl font-bold text-[#dce1fb] flex items-center gap-2">
                <Users size={24} className="text-[#7bd0ff]" />
                Step 2: Add Your Team
              </h2>

              {skipmessageShown && (
                <div className="border border-[#7bd0ff] rounded-xl p-4 flex items-start gap-3 bg-[#7bd0ff] bg-opacity-10">
                  <Check className="text-[#7bd0ff] shrink-0 mt-0.5" size={20} />
                  <p className="text-[#7bd0ff] font-medium">You can add team members from the dashboard later</p>
                </div>
              )}

              {/* Add New Staff Form */}
              <div className="bg-[#151b2d] rounded-2xl border border-[#2e3447] p-6 space-y-4">
                <h3 className="font-semibold text-[#dce1fb]">Invite a Team Member</h3>

                <div className="space-y-3">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-[#dce1fb] mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={newStaff.fullName}
                      onChange={handleStaffChange}
                      placeholder="First & Last Name"
                      className={`w-full px-4 py-2 bg-[#0c1324] rounded-lg border-2 text-[#dce1fb] placeholder-[#8c91a8] text-sm transition-all ${
                        errors.fullName
                          ? 'border-[#ffb4ab] focus:border-[#ffb4ab]'
                          : 'border-[#2e3447] focus:border-[#7bd0ff]'
                      }`}
                    />
                    {errors.fullName && (
                      <p className="text-[#ffb4ab] text-xs mt-1">{errors.fullName}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-[#dce1fb] mb-1">
                      Work Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={newStaff.email}
                      onChange={handleStaffChange}
                      placeholder="colleague@hospital.com"
                      className={`w-full px-4 py-2 bg-[#0c1324] rounded-lg border-2 text-[#dce1fb] placeholder-[#8c91a8] text-sm transition-all ${
                        errors.email
                          ? 'border-[#ffb4ab] focus:border-[#ffb4ab]'
                          : 'border-[#2e3447] focus:border-[#7bd0ff]'
                      }`}
                    />
                    {errors.email && (
                      <p className="text-[#ffb4ab] text-xs mt-1">{errors.email}</p>
                    )}
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-[#dce1fb] mb-1">
                      Role
                    </label>
                    <select
                      name="role"
                      value={newStaff.role}
                      onChange={handleStaffChange}
                      className="w-full px-4 py-2 bg-[#0c1324] rounded-lg border-2 border-[#2e3447] focus:border-[#7bd0ff] text-[#dce1fb] text-sm"
                    >
                      <option value="radiologist">Radiologist</option>
                      <option value="clinician">Clinician</option>
                    </select>
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={handleAddStaff}
                    className="w-full text-[#0c1324] py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #7bd0ff 0%, #008abb 100%)'
                    }}
                  >
                    <Plus size={16} />
                    Add Team Member
                  </button>
                </div>
              </div>

              {/* Staff List */}
              {staffList.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-[#dce1fb]">
                    Team Members ({staffList.length})
                  </h3>
                  {staffList.map((staff, index) => (
                    <div key={index} className="bg-[#151b2d] rounded-xl border border-[#2e3447] p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#dce1fb]">{staff.fullName}</p>
                        <p className="text-sm text-[#8c91a8]">{staff.email}</p>
                        <p className="text-xs text-[#7bd0ff] font-medium mt-1">
                          {staff.role === 'radiologist' ? '🔬 Radiologist' : '👨‍⚕️ Clinician'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveStaff(index)}
                        className="text-[#ffb4ab] hover:text-[#ff9999] font-medium text-sm"
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
                  className="flex-1 px-6 py-3 rounded-xl border-2 border-[#2e3447] text-[#dce1fb] hover:bg-[#2e3447] transition-all font-medium flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <button
                  onClick={handleSkip}
                  disabled={loading}
                  className="px-6 py-3 rounded-xl border-2 border-[#2e3447] text-[#dce1fb] hover:bg-[#2e3447] transition-all font-medium"
                >
                  Skip For Now
                </button>
                <button
                  onClick={handleCompleteOnboarding}
                  disabled={loading}
                  className="flex-1 text-[#0c1324] py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: loading ? '#7bd0ff' : 'linear-gradient(135deg, #7bd0ff 0%, #008abb 100%)',
                    opacity: loading ? 0.5 : 1
                  }}
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
