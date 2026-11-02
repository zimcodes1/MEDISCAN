import React, { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  User,
  Image,
  Users,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader,
  Plus,
  Trash2,
} from "lucide-react";
import CopyButton from "../components/CopyButton";
import { useAuth } from "../contexts/AuthContext";
import { useOrg } from "../contexts/OrgContext";
import { updateMe } from "../lib/auth";
import { invalidateImages } from "../lib/images";
import {
  createInvite,
  deleteInvite,
  updateOrg,
  uploadLogo,
  type CreatedInvite,
} from "../lib/org";
import { markOnboardingDone } from "../lib/onboarding";
import type { OnboardingStep } from "../utils/types";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const INPUT_BASE =
  "w-full px-4 py-3 rounded-xl bg-[#151b2d] border-2 text-brand-text placeholder-[#8c91a8] focus:ring-2 focus:ring-brand-primary focus:ring-opacity-20 transition-all";
const inputClass = (hasError: boolean) =>
  `${INPUT_BASE} ${
    hasError
      ? "border-[#ffb4ab] focus:border-[#ffb4ab]"
      : "border-brand-border focus:border-brand-primary"
  }`;

const msg = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;

/** /onboarding: first sign-in for a new admin. Saves to the API as it goes. */
export default function OrgOnboardingPage() {
  const { user, refetch } = useAuth();
  const { reload } = useOrg();
  const navigate = useNavigate();

  //Set Previous page for the 404 back button handler to check
  sessionStorage.setItem("lastPage", window.location.href);
  // Set Page Title
  useEffect(() => {
    document.title = "Fill in your info - Mediscan AI";
  }, []);

  const [step, setStep] = useState<OnboardingStep>(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1: Finish Profile
  const [profileData, setProfileData] = useState({
    adminJobTitle: user?.job_title ?? "",
    organisationLogo: null as File | null,
    numberOfRadiologists: "",
  });
  // parts already saved, so a retry after a partial failure doesn't redo them
  const saved = useRef({ job: false, logo: false, count: false });

  // Step 2: invitations (real, one per teammate)
  const [invites, setInvites] = useState<CreatedInvite[]>([]);
  const [newStaff, setNewStaff] = useState({
    email: "",
    role: "radiologist" as "radiologist" | "clinician",
  });
  const [adding, setAdding] = useState(false);

  // Only admins have an organisation to set up
  if (user && user.role !== "admin") return <Navigate to="/dashboard" replace />;

  const handleProfileChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    if (type === "file") {
      const file = (e.target as HTMLInputElement).files?.[0] ?? null;
      setProfileData((prev) => ({ ...prev, [name]: file }));
      saved.current.logo = false;
    } else {
      setProfileData((prev) => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateProfileForm = () => {
    const newErrors: Record<string, string> = {};
    if (!profileData.adminJobTitle.trim()) {
      newErrors.adminJobTitle = "Job title is required";
    }
    if (
      profileData.organisationLogo &&
      profileData.organisationLogo.size > MAX_LOGO_BYTES
    ) {
      newErrors.organisationLogo = "Logo must be 2MB or smaller";
    }
    const count = profileData.numberOfRadiologists.trim();
    if (count !== "") {
      const n = Number(count);
      if (!Number.isInteger(n) || n < 0 || n > 10000) {
        newErrors.numberOfRadiologists = "Enter a whole number from 0 to 10000";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** Step 1: job title, logo, radiologist count. */
  const handleProceedToStep2 = async () => {
    if (!validateProfileForm()) return;
    setLoading(true);
    setErrors({});
    try {
      if (!saved.current.job) {
        await updateMe({ job_title: profileData.adminJobTitle.trim() });
        saved.current.job = true;
      }
      if (profileData.organisationLogo && !saved.current.logo) {
        await uploadLogo(profileData.organisationLogo);
        saved.current.logo = true;
        invalidateImages();
      }
      const count = profileData.numberOfRadiologists.trim();
      if (count !== "" && !saved.current.count) {
        await updateOrg({ radiologist_count: Number(count) });
        saved.current.count = true;
      }
      await Promise.all([refetch(), reload()]);
      setStep(2);
    } catch (err) {
      setErrors({ submit: msg(err, "Could not save your details. Try again.") });
    } finally {
      setLoading(false);
    }
  };

  /** Step 2: one real invite per teammate. */
  const handleAddStaff = async () => {
    const email = newStaff.email.trim();
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setErrors({ email: "Please enter a valid email" });
      return;
    }
    if (invites.some((i) => i.email.toLowerCase() === email.toLowerCase())) {
      setErrors({ email: "This email is already invited" });
      return;
    }
    setAdding(true);
    setErrors({});
    try {
      const inv = await createInvite({ email, role: newStaff.role });
      setInvites((prev) => [...prev, inv]);
      setNewStaff((prev) => ({ ...prev, email: "" }));
    } catch (err) {
      setErrors({ email: msg(err, "Could not create the invitation") });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveInvite = async (inv: CreatedInvite) => {
    try {
      await deleteInvite(inv.id);
      setInvites((prev) => prev.filter((i) => i.id !== inv.id));
    } catch (err) {
      setErrors({ submit: msg(err, "Could not delete the invitation") });
    }
  };

  const finish = () => {
    if (user) markOnboardingDone(user.id);
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-linear-to-br from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center shadow-lg">
              <Users className="text-brand-bg" size={28} />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-brand-text text-center mb-2">
            Finish Your Setup
          </h1>
          <p className="text-lg text-brand-text text-center">
            {step === 1
              ? "Complete your organization profile"
              : "Invite your team members"}
          </p>

          {/* Progress Bar */}
          <div className="mt-6 flex gap-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${
                  i <= step ? "bg-brand-primary" : "bg-brand-border"
                }`}
              ></div>
            ))}
          </div>
        </div>

        {/* Forms */}
        <div className="bg-brand-card rounded-3xl border border-brand-border p-6 sm:p-8">
          {errors.submit && (
            <p className="mb-6 text-[#ffb4ab] text-sm bg-[#ffb4ab]/10 border border-[#ffb4ab]/40 rounded-xl px-4 py-3 break-words">
              {errors.submit}
            </p>
          )}

          {/* Step 1: Finish Profile */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-brand-text flex items-center gap-2">
                <User size={24} className="text-brand-primary" />
                Step 1: Finish Your Profile
              </h2>

              {/* Job Title */}
              <div>
                <label className="block text-sm font-medium text-brand-text mb-2">
                  Your Job Title
                </label>
                <input
                  type="text"
                  name="adminJobTitle"
                  value={profileData.adminJobTitle}
                  onChange={handleProfileChange}
                  maxLength={100}
                  placeholder="e.g., Medical Director, IT Administrator"
                  className={inputClass(!!errors.adminJobTitle)}
                />
                {errors.adminJobTitle && (
                  <p className="text-[#ffb4ab] text-sm mt-1">
                    {errors.adminJobTitle}
                  </p>
                )}
              </div>

              {/* Organisation Logo */}
              <div>
                <label className="flex text-sm font-medium text-brand-text mb-2 items-center gap-2">
                  <Image size={16} className="text-brand-primary" />
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
                    className="block border-2 border-dashed border-brand-border rounded-xl p-8 text-center cursor-pointer hover:border-brand-primary hover:bg-brand-card-hover hover:bg-opacity-5 transition-all"
                  >
                    {profileData.organisationLogo ? (
                      <div className="space-y-2">
                        <Check
                          className="text-brand-primary mx-auto"
                          size={32}
                        />
                        <p className="font-medium text-brand-text">
                          {profileData.organisationLogo.name}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Image className="text-[#8c91a8] mx-auto" size={32} />
                        <p className="font-medium text-brand-text">
                          Upload a logo
                        </p>
                        <p className="text-sm text-[#8c91a8]">
                          PNG, JPG or GIF (max. 2MB)
                        </p>
                      </div>
                    )}
                  </label>
                </div>
                {errors.organisationLogo && (
                  <p className="text-[#ffb4ab] text-sm mt-1">
                    {errors.organisationLogo}
                  </p>
                )}
              </div>

              {/* Number of Radiologists */}
              <div>
                <label className="block text-sm font-medium text-brand-text mb-2">
                  Number of Radiologists (Optional)
                </label>
                <input
                  type="number"
                  name="numberOfRadiologists"
                  value={profileData.numberOfRadiologists}
                  min={0}
                  onChange={handleProfileChange}
                  placeholder="e.g., 5"
                  className={inputClass(!!errors.numberOfRadiologists)}
                />
                {errors.numberOfRadiologists ? (
                  <p className="text-[#ffb4ab] text-sm mt-1">
                    {errors.numberOfRadiologists}
                  </p>
                ) : (
                  <p className="text-xs text-[#8c91a8] mt-2">
                    Helps us size your account better
                  </p>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-6">
                <button
                  onClick={finish}
                  disabled={loading}
                  className="flex-1 px-6 py-3 rounded-xl border-2 border-brand-border text-brand-text hover:bg-brand-border transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Skip setup
                </button>
                <button
                  onClick={handleProceedToStep2}
                  disabled={loading}
                  className="flex-1 text-brand-bg py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background:
                      "linear-gradient(135deg, #7bd0ff 0%, #008abb 100%)",
                  }}
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Invite staff */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-brand-text flex items-center gap-2">
                <Users size={24} className="text-brand-primary" />
                Step 2: Invite Your Team
              </h2>

              <p className="text-sm text-[#8c91a8]">
                No email is sent. Copy each link and send it to your colleague
                yourself. A link is shown only once.
              </p>

              <div className="space-y-4">
                <h3 className="font-semibold text-brand-text">
                  Invite a Team Member
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-brand-text mb-1">
                      Work Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={newStaff.email}
                      onChange={(e) => {
                        setNewStaff((prev) => ({ ...prev, email: e.target.value }));
                        if (errors.email) setErrors({});
                      }}
                      placeholder="colleague@hospital.com"
                      className={inputClass(!!errors.email)}
                    />
                    {errors.email && (
                      <p className="text-[#ffb4ab] text-xs mt-1">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brand-text mb-1">
                      Role
                    </label>
                    <select
                      name="role"
                      value={newStaff.role}
                      onChange={(e) =>
                        setNewStaff((prev) => ({
                          ...prev,
                          role: e.target.value as "radiologist" | "clinician",
                        }))
                      }
                      className={inputClass(false)}
                    >
                      <option value="radiologist">Radiologist</option>
                      <option value="clinician">Clinician</option>
                    </select>
                  </div>

                  <button
                    onClick={handleAddStaff}
                    disabled={adding}
                    className="w-full text-brand-bg bg-linear-to-r from-brand-primary to-brand-secondary py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {adding ? (
                      <Loader size={16} className="animate-spin" />
                    ) : (
                      <Plus size={16} />
                    )}
                    {adding ? "Creating..." : "Create Invite"}
                  </button>
                </div>
              </div>

              {invites.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-brand-text">
                    Invitations ({invites.length})
                  </h3>
                  {invites.map((inv) => (
                    <div
                      key={inv.id}
                      className="bg-[#151b2d] rounded-xl border border-brand-border p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-brand-text break-all">
                            {inv.email}
                          </p>
                          <p className="text-xs text-brand-primary font-medium mt-1 capitalize">
                            {inv.role}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveInvite(inv)}
                          title="Delete invitation"
                          aria-label={`Delete invitation for ${inv.email}`}
                          className="text-[#ffb4ab] hover:text-[#ff9999] p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          readOnly
                          value={inv.invite_url}
                          onFocus={(e) => e.currentTarget.select()}
                          className="flex-1 min-w-0 bg-brand-card text-brand-text text-xs px-3 py-2 rounded-lg border border-brand-border font-mono"
                        />
                        <CopyButton text={inv.invite_url} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex-col-reverse sm:flex-row flex gap-3 pt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-3 rounded-xl border-2 border-brand-border text-brand-text hover:bg-brand-border transition-all font-medium flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <button
                  onClick={finish}
                  className="flex-1 text-brand-bg bg-linear-to-r from-brand-primary to-brand-secondary py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  Complete Setup
                  <Check size={18} />
                </button>
              </div>
              {invites.length === 0 && (
                <p className="text-xs text-[#8c91a8] text-center">
                  You can invite team members later from Settings, Staff
                  Management.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
