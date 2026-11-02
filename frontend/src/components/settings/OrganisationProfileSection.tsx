import { Upload, Save, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import OrgLogo from "../OrgLogo";
import { LoadingState } from "../PageStatus";
import { useAuth } from "../../contexts/AuthContext";
import { useOrg } from "../../contexts/OrgContext";
import { invalidateImages } from "../../lib/images";
import {
  deleteLogo,
  ORG_TYPES,
  updateOrg,
  uploadLogo,
  type Organisation,
  type OrgType,
} from "../../lib/org";
import { NigerianStates } from "../../utils/DummyData";

const LABEL =
  "block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display";
const INPUT =
  "w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed";

type Notice = { kind: "ok" | "error"; text: string } | null;

const msg = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;

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

export default function OrganisationProfileSection() {
  const { org } = useOrg();
  if (!org) return <LoadingState label="Loading organisation…" />;
  return <OrgForm key={org.id} org={org} />;
}

function OrgForm({ org }: { org: Organisation }) {
  const { user } = useAuth();
  const { reload } = useOrg();
  const canEdit = user?.role === "admin";
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState(org.name);
  const [type, setType] = useState(org.type);
  const [state, setState] = useState(org.state ?? "");
  const [phone, setPhone] = useState(org.phone_number ?? "");
  const [radiologists, setRadiologists] = useState(
    org.radiologist_count === null ? "" : String(org.radiologist_count),
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoNotice, setLogoNotice] = useState<Notice>(null);

  // keep an unfamiliar stored value selectable instead of silently changing it
  const typeKnown = ORG_TYPES.some((t) => t.value === org.type);
  const stateKnown = !org.state || NigerianStates.includes(org.state);

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogoBusy(true);
    setLogoNotice(null);
    try {
      await uploadLogo(file);
      invalidateImages();
      await reload();
      setLogoNotice({ kind: "ok", text: "Logo updated." });
    } catch (err) {
      setLogoNotice({ kind: "error", text: msg(err, "Logo upload failed") });
    } finally {
      setLogoBusy(false);
    }
  }

  async function handleRemoveLogo() {
    setLogoBusy(true);
    setLogoNotice(null);
    try {
      await deleteLogo();
      invalidateImages();
      await reload();
      setLogoNotice({ kind: "ok", text: "Logo removed." });
    } catch (err) {
      setLogoNotice({ kind: "error", text: msg(err, "Could not remove logo") });
    } finally {
      setLogoBusy(false);
    }
  }

  async function handleSave() {
    setNotice(null);
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 200) {
      setNotice({ kind: "error", text: "Name must be 2–200 characters." });
      return;
    }
    let count: number | null = null;
    if (radiologists.trim() !== "") {
      count = Number(radiologists);
      if (!Number.isInteger(count) || count < 0 || count > 10000) {
        setNotice({
          kind: "error",
          text: "Radiologist count must be a whole number from 0 to 10000.",
        });
        return;
      }
    }
    // only send what changed
    const patch: Parameters<typeof updateOrg>[0] = {};
    if (trimmed !== org.name) patch.name = trimmed;
    if (type !== org.type) patch.type = type as OrgType;
    if (state !== (org.state ?? "")) patch.state = state;
    if (phone.trim() !== (org.phone_number ?? "")) patch.phone_number = phone.trim();
    if (count !== org.radiologist_count) patch.radiologist_count = count;
    if (Object.keys(patch).length === 0) {
      setNotice({ kind: "ok", text: "Nothing to save." });
      return;
    }
    setSaving(true);
    try {
      await updateOrg(patch);
      await reload();
      setNotice({ kind: "ok", text: "Organisation saved." });
    } catch (err) {
      setNotice({ kind: "error", text: msg(err, "Could not save organisation") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 sm:pt-10">
      <div>
        <h2 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">
          Organisation Profile
        </h2>
        <p className="text-brand-text-muted text-sm">
          Manage your organisation's information and branding
          {!canEdit && " (only admins can edit)"}
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-6 relative overflow-hidden group">
        {/* Logo */}
        <div>
          <label className={LABEL}>Organisation Logo</label>
          <div className="flex flex-wrap items-center gap-4">
            <OrgLogo
              url={org.logo_url}
              name={org.name}
              className="w-20 h-20 rounded-xl text-2xl"
            />
            {canEdit && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogo}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={logoBusy}
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 bg-brand-card text-brand-primary border border-brand-border/60 hover:bg-brand-card/85 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer disabled:opacity-50"
                >
                  <Upload size={14} />
                  {logoBusy ? "Working…" : "Upload Logo"}
                </button>
                {org.logo_url && (
                  <button
                    type="button"
                    disabled={logoBusy}
                    onClick={handleRemoveLogo}
                    className="flex items-center gap-2 text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                )}
              </>
            )}
          </div>
          <p className="text-brand-text-muted/65 text-[10px] font-semibold mt-2">
            Shown in the top bar and on printed reports
          </p>
          <div className="mt-3">
            <NoticeBox notice={logoNotice} />
          </div>
        </div>

        <div>
          <label className={LABEL}>Organisation Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            maxLength={200}
            className={INPUT}
          />
        </div>

        <div>
          <label className={LABEL}>Organisation Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={!canEdit}
            className={INPUT}
          >
            {!typeKnown && <option value={org.type}>{org.type}</option>}
            {ORG_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL}>State</label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            disabled={!canEdit}
            className={INPUT}
          >
            <option value="">Select state...</option>
            {!stateKnown && org.state && (
              <option value={org.state}>{org.state}</option>
            )}
            {NigerianStates.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL}>Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={!canEdit}
            className={INPUT}
          />
        </div>

        <div>
          <label className={LABEL}>Number of Radiologists</label>
          <input
            type="number"
            min={0}
            max={10000}
            value={radiologists}
            onChange={(e) => setRadiologists(e.target.value)}
            disabled={!canEdit}
            className={INPUT}
          />
        </div>

        <div>
          <label className={LABEL}>Organisation ID</label>
          <input
            type="text"
            value={org.id}
            readOnly
            className="w-full bg-brand-card/30 text-brand-text-muted/65 px-4 py-3 rounded-xl border border-brand-border/40 cursor-not-allowed"
          />
          <p className="text-brand-text-muted/60 text-[10px] font-semibold mt-1">
            System-generated ID used for support
          </p>
        </div>

        {canEdit && (
          <>
            <NoticeBox notice={notice} />
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg py-3.5 rounded-xl font-extrabold text-sm hover:shadow-[0_0_20px_rgba(0,210,255,0.25)] hover:opacity-95 active:scale-95 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
