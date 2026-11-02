import { Mail, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import CopyButton from "../CopyButton";
import {
  createInvite,
  deleteInvite,
  listInvites,
  type CreatedInvite,
  type Invite,
  type InviteRole,
} from "../../lib/org";
import { formatDate } from "../../lib/format";

const msg = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;

const INPUT =
  "w-full bg-brand-card/60 text-brand-text text-sm px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-brand-primary/50 focus:bg-brand-card transition-all duration-300";

/** Create, copy, list and delete invitations. No email is sent: admins share the link. */
export default function InvitationsPanel() {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("radiologist");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedInvite | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setInvites(await listInvites());
      setLoadError(null);
    } catch (err) {
      setLoadError(msg(err, "Failed to load invitations"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const addr = email.trim();
    if (!addr.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("Enter a valid email address.");
      return;
    }
    setCreating(true);
    try {
      const inv = await createInvite({ email: addr, role });
      setCreated(inv);
      setEmail("");
      await load();
    } catch (err) {
      setError(msg(err, "Could not create the invitation"));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(inv: Invite) {
    if (!window.confirm(`Delete the invitation for ${inv.email}?`)) return;
    setBusyId(inv.id);
    setError(null);
    try {
      await deleteInvite(inv.id);
      if (created?.id === inv.id) setCreated(null);
      await load();
    } catch (err) {
      setError(msg(err, "Could not delete the invitation"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
      <div>
        <h3 className="text-brand-text font-bold text-lg font-display flex items-center gap-2">
          <Mail size={18} className="text-brand-primary" />
          Invitations
        </h3>
        <p className="text-brand-text-muted text-xs mt-1">
          No email is sent. Create an invitation, copy the link and send it to
          your colleague yourself. The link is shown only once.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="grid gap-3 sm:grid-cols-[1fr_180px_auto] items-end"
      >
        <div>
          <label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
            Work email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@hospital.com"
            className={INPUT}
          />
        </div>
        <div>
          <label className="block text-brand-text-muted text-[10px] font-bold uppercase tracking-wider mb-2 font-display">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as InviteRole)}
            className={INPUT}
          >
            <option value="radiologist">Radiologist</option>
            <option value="clinician">Clinician</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-bg px-5 py-3 rounded-xl font-extrabold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
          {creating ? "Creating…" : "Create invite"}
        </button>
      </form>

      {error && (
        <p className="text-rose-400 text-sm bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3 break-words">
          {error}
        </p>
      )}

      {created && (
        <div className="bg-brand-primary/5 border border-brand-primary/25 rounded-xl p-4 space-y-2">
          <p className="text-brand-text text-sm font-semibold">
            Invitation for {created.email} ({created.role})
          </p>
          <div className="flex gap-2 items-center">
            <input
              readOnly
              value={created.invite_url}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 bg-brand-card/60 text-brand-text text-xs px-3 py-2 rounded-lg border border-brand-border font-mono"
            />
            <CopyButton text={created.invite_url} />
          </div>
          <p className="text-brand-text-muted text-[11px]">
            Copy it now: it can't be shown again. Expires{" "}
            {formatDate(created.expires_at)}.
          </p>
        </div>
      )}

      {loadError ? (
        <p className="text-rose-400 text-xs">{loadError}</p>
      ) : invites === null ? (
        <p className="text-brand-text-muted text-xs">Loading invitations…</p>
      ) : invites.length === 0 ? (
        <p className="text-brand-text-muted text-xs">No open invitations.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-brand-border/40">
          <table className="w-full min-w-[560px]">
            <thead className="bg-brand-card/65 border-b border-brand-border/40">
              <tr>
                {["Email", "Role", "Expires", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left text-brand-text-muted text-[10px] font-bold uppercase tracking-wider px-4 py-3 font-display"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/30">
              {invites.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-3 text-brand-text text-xs font-medium break-all">
                    {inv.email}
                  </td>
                  <td className="px-4 py-3 text-brand-text-muted text-xs capitalize">
                    {inv.role}
                  </td>
                  <td className="px-4 py-3 text-brand-text-muted text-xs">
                    {formatDate(inv.expires_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border ${
                        inv.status === "pending"
                          ? "bg-amber-500/5 border-amber-500/20 text-amber-400"
                          : "bg-rose-500/5 border-rose-500/20 text-rose-400"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(inv)}
                      disabled={busyId === inv.id}
                      title="Delete invitation"
                      aria-label={`Delete invitation for ${inv.email}`}
                      className="p-1.5 rounded-lg text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
