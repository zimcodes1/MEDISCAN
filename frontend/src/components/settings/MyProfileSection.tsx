import { Upload, Save, Trash2, KeyRound } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "../Avatar";
import { useAuth } from "../../contexts/AuthContext";
import {
  changePassword,
  deleteAvatar,
  updateMe,
  uploadAvatar,
} from "../../lib/auth";
import { invalidateImages } from "../../lib/images";

const LABEL =
  "block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display";
const INPUT =
  "w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300 placeholder-brand-text-muted/40";
const PRIMARY_BTN =
  "w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg py-3.5 rounded-xl font-extrabold text-sm hover:shadow-[0_0_20px_rgba(0,210,255,0.25)] hover:opacity-95 active:scale-95 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

type Notice = { kind: "ok" | "error"; text: string } | null;

function NoticeBox({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <p
      className={`text-sm rounded-xl px-4 py-3 border break-words ${
        notice.kind === "ok"
          ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/20"
          : "text-rose-400 bg-rose-500/5 border-rose-500/20"
      }`}
    >
      {notice.text}
    </p>
  );
}

const msg = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;

export default function MyProfileSection() {
  const { user, refetch, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [jobTitle, setJobTitle] = useState(user?.job_title ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<Notice>(null);

  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoNotice, setPhotoNotice] = useState<Notice>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);

  if (!user) return null;
  // Job titles are set by the organisation: only admins can change their own.
  const canEditTitle = user.role === "admin";

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    setPhotoBusy(true);
    setPhotoNotice(null);
    try {
      await uploadAvatar(file);
      invalidateImages();
      await refetch();
      setPhotoNotice({ kind: "ok", text: "Photo updated." });
    } catch (err) {
      setPhotoNotice({ kind: "error", text: msg(err, "Photo upload failed") });
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleRemovePhoto() {
    setPhotoBusy(true);
    setPhotoNotice(null);
    try {
      await deleteAvatar();
      invalidateImages();
      await refetch();
      setPhotoNotice({ kind: "ok", text: "Photo removed." });
    } catch (err) {
      setPhotoNotice({ kind: "error", text: msg(err, "Could not remove photo") });
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleSaveProfile() {
    if (!user) return;
    setProfileNotice(null);
    const name = fullName.trim();
    if (!name) {
      setProfileNotice({ kind: "error", text: "Full name is required." });
      return;
    }
    // only send what changed
    const patch: { full_name?: string; job_title?: string; phone_number?: string } =
      {};
    if (name !== user.full_name) patch.full_name = name;
    if (canEditTitle && jobTitle.trim() !== (user.job_title ?? ""))
      patch.job_title = jobTitle.trim();
    if (phoneNumber.trim() !== (user.phone_number ?? ""))
      patch.phone_number = phoneNumber.trim();
    if (Object.keys(patch).length === 0) {
      setProfileNotice({ kind: "ok", text: "Nothing to save." });
      return;
    }
    setSavingProfile(true);
    try {
      await updateMe(patch);
      await refetch();
      setProfileNotice({ kind: "ok", text: "Profile saved." });
    } catch (err) {
      setProfileNotice({ kind: "error", text: msg(err, "Could not save profile") });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    setPasswordNotice(null);
    const bytes = new TextEncoder().encode(newPassword).length;
    if (!currentPassword) {
      setPasswordNotice({ kind: "error", text: "Enter your current password." });
      return;
    }
    if (bytes < 10 || bytes > 72) {
      setPasswordNotice({
        kind: "error",
        text: "New password must be 10–72 characters.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ kind: "error", text: "New passwords do not match." });
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      // the backend ends every session, this one included
      await logout();
      navigate("/login", {
        replace: true,
        state: { message: "Password changed. Sign in with your new password." },
      });
    } catch (err) {
      setPasswordNotice({
        kind: "error",
        text: msg(err, "Could not change password"),
      });
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-6 sm:pt-10">
      <div>
        <h2 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">
          My Profile
        </h2>
        <p className="text-brand-text-muted text-sm">
          Manage your personal information and account settings
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-6 relative overflow-hidden group">
        {/* Profile Photo */}
        <div>
          <label className={LABEL}>Profile Photo</label>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar
              url={user.avatar_url}
              name={user.full_name}
              className="w-20 h-20"
              textClassName="text-2xl"
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePhoto}
              className="hidden"
            />
            <button
              type="button"
              disabled={photoBusy}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 bg-brand-card text-brand-primary border border-brand-border/60 hover:bg-brand-card/85 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer disabled:opacity-50"
            >
              <Upload size={14} />
              {photoBusy ? "Working…" : "Upload Photo"}
            </button>
            {user.avatar_url && (
              <button
                type="button"
                disabled={photoBusy}
                onClick={handleRemovePhoto}
                className="flex items-center gap-2 text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={14} />
                Remove
              </button>
            )}
          </div>
          <div className="mt-3">
            <NoticeBox notice={photoNotice} />
          </div>
        </div>

        <div>
          <label className={LABEL}>Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={200}
            className={INPUT}
          />
        </div>

        <div>
          <label className={LABEL}>Job Title</label>
          <input
            type="text"
            value={canEditTitle ? jobTitle : (user.job_title ?? "")}
            onChange={(e) => setJobTitle(e.target.value)}
            maxLength={100}
            readOnly={!canEditTitle}
            placeholder={canEditTitle ? "" : "Not set"}
            className={
              canEditTitle
                ? INPUT
                : "w-full bg-brand-card/30 text-brand-text-muted/65 px-4 py-3 rounded-xl border border-brand-border/40 cursor-not-allowed"
            }
          />
          {!canEditTitle && (
            <p className="text-brand-text-muted/60 text-[10px] font-semibold mt-1">
              Your job title is set by your organisation admin
            </p>
          )}
        </div>

        <div>
          <label className={LABEL}>Email Address</label>
          <input
            type="email"
            value={user.email}
            readOnly
            className="w-full bg-brand-card/30 text-brand-text-muted/65 px-4 py-3 rounded-xl border border-brand-border/40 cursor-not-allowed"
          />
          <p className="text-brand-text-muted/60 text-[10px] font-semibold mt-1">
            Your email is your sign-in name and can't be changed here
          </p>
        </div>

        <div>
          <label className={LABEL}>Phone Number</label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            maxLength={20}
            className={INPUT}
          />
        </div>

        <NoticeBox notice={profileNotice} />
        <button
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className={PRIMARY_BTN}
        >
          <Save size={16} />
          {savingProfile ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* Password */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-4">
        <div>
          <h3 className="text-brand-text font-bold text-sm font-display">
            Change Password
          </h3>
          <p className="text-brand-text-muted/70 text-xs mt-1">
            You will be signed out on every device and need to sign in again
            with the new password.
          </p>
        </div>
        <div>
          <label className={LABEL}>Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="10–72 characters"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className={INPUT}
          />
        </div>
        <NoticeBox notice={passwordNotice} />
        <button
          onClick={handleChangePassword}
          disabled={savingPassword}
          className={PRIMARY_BTN}
        >
          <KeyRound size={16} />
          {savingPassword ? "Changing…" : "Change Password"}
        </button>
      </div>
    </div>
  );
}
