import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  activateUser,
  approveUser,
  createPasswordReset,
  deactivateUser,
  listUsers,
  type PasswordResetLink,
} from "../../lib/admin";
import { formatDate, formatDateTime } from "../../lib/format";
import CopyButton from "../CopyButton";
import type { UserPublic } from "../../types/api";
import { EmptyState, ErrorState, LoadingState } from "../PageStatus";
import Avatar from "../Avatar";
import InvitationsPanel from "./InvitationsPanel";

type StaffStatus = "pending" | "active" | "deactivated";

function staffStatus(u: UserPublic): StaffStatus {
  if (!u.is_approved) return "pending";
  if (!u.is_active) return "deactivated";
  return "active";
}

const STATUS_STYLE: Record<StaffStatus, string> = {
  pending: "bg-amber-500/5 border-amber-500/20 text-amber-400",
  active: "bg-emerald-500/5 border-emerald-500/20 text-emerald-400",
  deactivated: "bg-rose-500/5 border-rose-500/20 text-rose-400",
};

const STATUS_LABEL: Record<StaffStatus, string> = {
  pending: "Pending",
  active: "Active",
  deactivated: "Deactivated",
};

const TH =
  "text-brand-text-muted text-[10px] font-bold uppercase tracking-wider px-6 py-4 font-display";

interface StaffTableProps {
  users: UserPublic[];
  currentUserId?: string;
  busyId: string | null;
  onApprove: (u: UserPublic) => void;
  onDeactivate: (u: UserPublic) => void;
  onActivate: (u: UserPublic) => void;
  onResetPassword: (u: UserPublic) => void;
}

export function StaffTable({
  users,
  currentUserId,
  busyId,
  onApprove,
  onDeactivate,
  onActivate,
  onResetPassword,
}: StaffTableProps) {
  return (
    <div className="w-full max-sm:hide-scrollbar overflow-x-auto glass-panel rounded-2xl border border-brand-border/40 relative">
      <table className="w-full min-w-[800px]">
        <thead className="bg-brand-card/65 border-b border-brand-border/40">
          <tr>
            <th className={`text-left ${TH}`}>Name</th>
            <th className={`text-left ${TH}`}>Role</th>
            <th className={`text-left ${TH}`}>Email</th>
            <th className={`text-left ${TH}`}>Registered</th>
            <th className={`text-left ${TH}`}>Status</th>
            <th className={`text-right ${TH}`}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-border/30">
          {users.map((u) => {
            const status = staffStatus(u);
            const isSelf = u.id === currentUserId;
            const busy = busyId === u.id;
            const btn =
              "px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
            return (
              <tr
                key={u.id}
                className="hover:bg-brand-card/20 transition-all duration-200"
              >
                <td className="px-6 py-4 text-brand-text font-semibold text-sm">
                  <div className="flex items-center gap-3">
                    <Avatar
                      url={u.avatar_url}
                      name={u.full_name}
                      className="w-8 h-8"
                      textClassName="text-[10px]"
                    />
                    <span>
                      {u.full_name}
                      {isSelf && (
                        <span className="ml-2 text-[9px] uppercase font-bold tracking-wider text-brand-text-muted">
                          You
                        </span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-brand-text-muted text-xs font-medium capitalize">
                  {u.role}
                </td>
                <td className="px-6 py-4 text-brand-text-muted text-xs font-medium">
                  {u.email}
                </td>
                <td className="px-6 py-4 text-brand-text-muted text-xs font-medium">
                  {formatDate(u.created_at)}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border ${STATUS_STYLE[status]}`}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1.5">
                    {status === "pending" && (
                      <button
                        onClick={() => onApprove(u)}
                        disabled={busy}
                        className={`${btn} border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10`}
                      >
                        {busy ? "Approving…" : "Approve"}
                      </button>
                    )}
                    {status === "active" && !isSelf && (
                      <button
                        onClick={() => onResetPassword(u)}
                        disabled={busy}
                        title="Create a one-time link so this person can set a new password"
                        className={`${btn} border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10`}
                      >
                        Reset password
                      </button>
                    )}
                    {status === "active" && !isSelf && (
                      <button
                        onClick={() => onDeactivate(u)}
                        disabled={busy}
                        className={`${btn} border-amber-500/30 text-amber-500 hover:bg-amber-500/10`}
                      >
                        {busy ? "Working…" : "Deactivate"}
                      </button>
                    )}
                    {status === "deactivated" && (
                      <button
                        onClick={() => onActivate(u)}
                        disabled={busy}
                        className={`${btn} border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10`}
                      >
                        {busy ? "Working…" : "Reactivate"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function StaffManagementSection() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<UserPublic[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "all">("all");
  const [resetLink, setResetLink] = useState<PasswordResetLink | null>(null);
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    const rows = await listUsers("all");
    setUsers(rows);
    // land on the approvals queue when there is something to approve
    if (firstLoad.current) {
      firstLoad.current = false;
      if (rows.some((u) => !u.is_approved)) setTab("pending");
    }
  }, []);

  useEffect(() => {
    let active = true;
    load().catch((err: unknown) => {
      if (active)
        setError(err instanceof Error ? err.message : "Failed to load staff");
    });
    return () => {
      active = false;
    };
  }, [load]);

  function retry() {
    setUsers(null);
    setError(null);
    load().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : "Failed to load staff"),
    );
  }

  async function act(u: UserPublic, fn: (id: string) => Promise<void>) {
    setBusyId(u.id);
    setActionError(null);
    try {
      await fn(u.id);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleResetPassword(u: UserPublic) {
    if (
      !window.confirm(
        `Create a password reset link for ${u.full_name}? Any earlier unused link for them stops working.`,
      )
    )
      return;
    setBusyId(u.id);
    setActionError(null);
    try {
      setResetLink(await createPasswordReset(u.id));
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not create the reset link",
      );
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = users?.filter((u) => !u.is_approved).length ?? 0;
  const visible =
    users?.filter((u) => (tab === "pending" ? !u.is_approved : true)) ?? [];

  const tabClass = (active: boolean) =>
    `px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${
      active
        ? "bg-gradient-to-r from-brand-primary/15 to-brand-secondary/15 text-brand-primary border border-brand-primary/25"
        : "text-brand-text-muted hover:text-brand-text hover:bg-brand-card/50 border border-transparent"
    }`;

  return (
    <div className="space-y-6 sm:pt-10">
      <div>
        <h2 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">
          Staff Management
        </h2>
        <p className="text-brand-text-muted text-sm">
          Invite colleagues, approve registrations and control who can sign in
        </p>
      </div>

      <InvitationsPanel />

      {actionError && (
        <p className="text-rose-400 text-sm bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3 break-words">
          {actionError}
        </p>
      )}

      {resetLink && (
        <div className="bg-brand-primary/5 border border-brand-primary/25 rounded-2xl p-4 sm:p-5 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="text-brand-text text-sm font-semibold">
              Password reset link for {resetLink.user.full_name} (
              {resetLink.user.email})
            </p>
            <button
              onClick={() => setResetLink(null)}
              aria-label="Dismiss"
              className="text-brand-text-muted hover:text-brand-text text-lg leading-none cursor-pointer"
            >
              ×
            </button>
          </div>
          <div className="flex gap-2 items-center">
            <input
              readOnly
              value={resetLink.reset_url}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 bg-brand-card/60 text-brand-text text-xs px-3 py-2 rounded-lg border border-brand-border font-mono"
            />
            <CopyButton text={resetLink.reset_url} />
          </div>
          <p className="text-brand-text-muted text-[11px] leading-snug">
            Send it to them yourself: no email is sent. It works once, expires
            at {formatDateTime(resetLink.expires_at)}, and can't be shown again.
            When they use it, they are signed out of every device.
          </p>
        </div>
      )}

      {error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : users === null ? (
        <LoadingState label="Loading staff…" />
      ) : (
        <>
          <div className="inline-flex bg-brand-card/45 border border-brand-border/40 p-1 rounded-xl gap-1">
            <button
              onClick={() => setTab("pending")}
              className={tabClass(tab === "pending")}
            >
              Pending approval ({pendingCount})
            </button>
            <button
              onClick={() => setTab("all")}
              className={tabClass(tab === "all")}
            >
              All staff ({users.length})
            </button>
          </div>

          {visible.length === 0 ? (
            <div className="glass-panel rounded-2xl">
              <EmptyState
                title={
                  tab === "pending"
                    ? "No pending requests"
                    : "No staff accounts yet"
                }
              />
            </div>
          ) : (
            <StaffTable
              users={visible}
              currentUserId={me?.id}
              busyId={busyId}
              onApprove={(u) => act(u, approveUser)}
              onDeactivate={(u) => {
                if (
                  window.confirm(
                    `Deactivate ${u.full_name}? They will no longer be able to sign in.`,
                  )
                )
                  act(u, deactivateUser);
              }}
              onActivate={(u) => act(u, activateUser)}
              onResetPassword={handleResetPassword}
            />
          )}
        </>
      )}
    </div>
  );
}
