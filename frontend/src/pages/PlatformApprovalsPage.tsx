import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { formatDate } from "../lib/format";
import {
  approveOrg,
  listPlatformOrgs,
  suspendOrg,
  type PlatformOrg,
  type PlatformOrgStatus,
} from "../lib/platform";
import { EmptyState, ErrorState, LoadingState } from "../components/PageStatus";

const TABS: { id: PlatformOrgStatus; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "active", label: "Active" },
  { id: "suspended", label: "Suspended" },
];

const STATUS_STYLE: Record<PlatformOrgStatus, string> = {
  pending: "bg-amber-500/5 border-amber-500/20 text-amber-400",
  active: "bg-emerald-500/5 border-emerald-500/20 text-emerald-400",
  suspended: "bg-rose-500/5 border-rose-500/20 text-rose-400",
};

const TH =
  "text-brand-text-muted text-[10px] font-bold uppercase tracking-wider px-6 py-4 font-display";

const TYPE_LABEL: Record<string, string> = {
  hospital: "Hospital",
  diagnostic_centre: "Diagnostic Centre",
  clinic: "Clinic",
  telemedicine: "Telemedicine",
};

/** /platform/approvals: approve or suspend organisations. Platform admins only. */
export default function PlatformApprovalsPage() {
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Platform approvals - Mediscan AI";
  }, []);

  if (!user?.is_platform_admin) return <Navigate to="/dashboard" replace />;
  return <Approvals />;
}

function Approvals() {
  const [orgs, setOrgs] = useState<PlatformOrg[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<PlatformOrgStatus>("pending");

  const load = useCallback(async () => {
    setOrgs(await listPlatformOrgs());
  }, []);

  useEffect(() => {
    let active = true;
    load().catch((err: unknown) => {
      if (active)
        setError(
          err instanceof Error ? err.message : "Failed to load organisations",
        );
    });
    return () => {
      active = false;
    };
  }, [load]);

  function retry() {
    setOrgs(null);
    setError(null);
    load().catch((err: unknown) =>
      setError(
        err instanceof Error ? err.message : "Failed to load organisations",
      ),
    );
  }

  async function act(org: PlatformOrg, fn: (id: string) => Promise<unknown>) {
    setBusyId(org.id);
    setActionError(null);
    try {
      await fn(org.id);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  const count = (s: PlatformOrgStatus) =>
    orgs?.filter((o) => o.status === s).length ?? 0;
  const visible = orgs?.filter((o) => o.status === tab) ?? [];

  const tabClass = (active: boolean) =>
    `px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${
      active
        ? "bg-gradient-to-r from-brand-primary/15 to-brand-secondary/15 text-brand-primary border border-brand-primary/25"
        : "text-brand-text-muted hover:text-brand-text hover:bg-brand-card/50 border border-transparent"
    }`;
  const btn =
    "px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:pt-10">
      <div>
        <h1 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">
          Platform approvals
        </h1>
        <p className="text-brand-text-muted text-sm">
          Approve new organisations and suspend ones that should lose access.
          Suspending locks every member out, including people already signed
          in.
        </p>
      </div>

      {actionError && (
        <p className="text-rose-400 text-sm bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3 break-words">
          {actionError}
        </p>
      )}

      {error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : orgs === null ? (
        <LoadingState label="Loading organisations…" />
      ) : (
        <>
          <div className="inline-flex bg-brand-card/45 border border-brand-border/40 p-1 rounded-xl gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={tabClass(tab === t.id)}
              >
                {t.label} ({count(t.id)})
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="glass-panel rounded-2xl">
              <EmptyState title={`No ${tab} organisations`} />
            </div>
          ) : (
            <div className="w-full max-sm:hide-scrollbar overflow-x-auto glass-panel rounded-2xl border border-brand-border/40 relative">
              <table className="w-full min-w-[900px]">
                <thead className="bg-brand-card/65 border-b border-brand-border/40">
                  <tr>
                    <th className={`text-left ${TH}`}>Organisation</th>
                    <th className={`text-left ${TH}`}>Admin contact</th>
                    <th className={`text-left ${TH}`}>Radiologists</th>
                    <th className={`text-left ${TH}`}>Registered</th>
                    <th className={`text-left ${TH}`}>Status</th>
                    <th className={`text-right ${TH}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/30">
                  {visible.map((o) => {
                    const busy = busyId === o.id;
                    return (
                      <tr
                        key={o.id}
                        className="hover:bg-brand-card/20 transition-all duration-200"
                      >
                        <td className="px-6 py-4">
                          <p className="text-brand-text font-semibold text-sm">
                            {o.name}
                          </p>
                          <p className="text-brand-text-muted text-xs">
                            {TYPE_LABEL[o.type] ?? o.type}
                            {o.state ? ` · ${o.state}` : ""}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {o.admin ? (
                            <>
                              <p className="text-brand-text font-medium">
                                {o.admin.full_name}
                              </p>
                              <p className="text-brand-text-muted break-all">
                                {o.admin.email}
                              </p>
                            </>
                          ) : (
                            <span className="text-brand-text-muted">—</span>
                          )}
                          {o.phone_number && (
                            <p className="text-brand-text-muted">
                              {o.phone_number}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-brand-text-muted text-xs font-medium">
                          {o.radiologist_count ?? "—"}
                        </td>
                        <td className="px-6 py-4 text-brand-text-muted text-xs font-medium">
                          {formatDate(o.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border ${STATUS_STYLE[o.status]}`}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {o.status !== "active" && (
                              <button
                                onClick={() => act(o, approveOrg)}
                                disabled={busy}
                                className={`${btn} border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10`}
                              >
                                {busy
                                  ? "Working…"
                                  : o.status === "suspended"
                                    ? "Reinstate"
                                    : "Approve"}
                              </button>
                            )}
                            {o.status !== "suspended" && (
                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Suspend ${o.name}? Everyone in it, including people already signed in, loses access.`,
                                    )
                                  )
                                    act(o, suspendOrg);
                                }}
                                disabled={busy}
                                className={`${btn} border-rose-500/30 text-rose-400 hover:bg-rose-500/10`}
                              >
                                {busy ? "Working…" : "Suspend"}
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
          )}
        </>
      )}
    </div>
  );
}
