import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorState, LoadingState } from "../PageStatus";
import { useNotifications } from "../../contexts/NotificationsContext";
import {
  getNotificationPrefs,
  updateNotificationPrefs,
  type NotificationPrefs,
} from "../../lib/notifications";

interface NotificationsSectionProps {
  userRole: "org-admin" | "radiologist" | "clinician";
}

type Key = keyof NotificationPrefs;

const EVENTS: { key: Key; title: string; hint: string; adminOnly?: boolean }[] = [
  {
    key: "scan_assigned",
    title: "A scan is assigned to me",
    hint: "When an admin assigns a scan to you for review",
  },
  {
    key: "scan_reviewed",
    title: "A scan of mine is reviewed",
    hint: "When someone marks a scan you uploaded, or were assigned, as reviewed",
  },
  {
    key: "report_finalised",
    title: "A report is finalised",
    hint: "When a report is finalised on a scan you uploaded or were assigned",
  },
  {
    key: "staff_joined",
    title: "A new staff member joins",
    hint: "When someone accepts an invite or is approved",
    adminOnly: true,
  },
];

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-brand-bg/85 border border-brand-border/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-brand-text-muted after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary peer-checked:after:bg-brand-bg peer-checked:after:border-brand-primary"></div>
    </label>
  );
}

export default function NotificationsSection({ userRole }: NotificationsSectionProps) {
  const [prefs, setPrefsState] = useState<NotificationPrefs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getNotificationPrefs()
      .then((p) => active && setPrefsState(p))
      .catch((err: unknown) => {
        if (active)
          setError(err instanceof Error ? err.message : "Failed to load preferences");
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  if (error)
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          setError(null);
          setAttempt((n) => n + 1);
        }}
      />
    );
  if (!prefs) return <LoadingState label="Loading preferences…" />;
  return <PrefsForm initial={prefs} isAdmin={userRole === "org-admin"} />;
}

function PrefsForm({
  initial,
  isAdmin,
}: {
  initial: NotificationPrefs;
  isAdmin: boolean;
}) {
  const { setPrefs } = useNotifications();
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSave() {
    setSaving(true);
    setNotice(null);
    try {
      const saved = await updateNotificationPrefs(draft);
      setDraft(saved);
      setPrefs(saved); // the bell uses the sound setting straight away
      setNotice({ ok: true, text: "Preferences saved." });
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : "Could not save preferences",
      });
    } finally {
      setSaving(false);
    }
  }

  const row =
    "flex items-center justify-between gap-4 p-4 bg-brand-card/25 border border-brand-border/40 rounded-xl transition-all duration-300";

  return (
    <div className="space-y-6 sm:pt-10">
      <div>
        <h2 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">
          Notifications
        </h2>
        <p className="text-brand-text-muted text-sm">
          Choose what appears under the bell in the top bar
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-6 relative overflow-hidden group">
        <div>
          <h3 className="text-brand-text font-bold text-sm mb-4 font-display">
            Notify me when…
          </h3>
          <div className="space-y-4">
            {EVENTS.filter((e) => !e.adminOnly || isAdmin).map((e) => (
              <div key={e.key} className={row}>
                <div>
                  <p className="text-brand-text font-semibold text-sm">{e.title}</p>
                  <p className="text-brand-text-muted text-xs font-medium mt-0.5">
                    {e.hint}
                  </p>
                </div>
                <Toggle
                  label={e.title}
                  checked={draft[e.key]}
                  onChange={(v) => setDraft((d) => ({ ...d, [e.key]: v }))}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-brand-border/30">
          <h3 className="text-brand-text font-bold text-sm mb-4 font-display">
            Sound
          </h3>
          <div className={row}>
            <div>
              <p className="text-brand-text font-semibold text-sm">Notification sound</p>
              <p className="text-brand-text-muted text-xs font-medium mt-0.5">
                Play a short chime when a new notification arrives while you are here
              </p>
            </div>
            <Toggle
              label="Notification sound"
              checked={draft.in_app_sound}
              onChange={(v) => setDraft((d) => ({ ...d, in_app_sound: v }))}
            />
          </div>
        </div>

        {notice && (
          <p
            className={`text-sm rounded-xl px-4 py-3 border break-words ${
              notice.ok
                ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/20"
                : "text-rose-400 bg-rose-500/5 border-rose-500/20"
            }`}
          >
            {notice.text}
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg py-3.5 rounded-xl font-extrabold text-sm hover:shadow-[0_0_20px_rgba(0,210,255,0.25)] hover:opacity-95 active:scale-95 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          {saving ? "Saving…" : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
