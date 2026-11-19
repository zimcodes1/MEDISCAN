import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listActivity, type ActivityItem } from "../../lib/dashboard";
import { formatDateTime } from "../../lib/format";

export function ActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <p className="px-6 py-8 text-center text-brand-text-muted text-xs">
        No activity yet.
      </p>
    );
  }
  return (
    <div className="p-3 space-y-1">
      {items.map((a) => {
        const body = (
          <>
            <p className="text-brand-text text-xs font-semibold leading-snug">
              {a.message}
            </p>
            <p className="text-brand-text-muted/60 text-[10px] mt-1">
              {a.actor?.full_name ? `${a.actor.full_name} · ` : ""}
              {formatDateTime(a.created_at)}
            </p>
          </>
        );
        return a.scan_id ? (
          <Link
            key={a.id}
            to={`/scans/${a.scan_id}`}
            className="block px-3 py-2.5 rounded-xl hover:bg-brand-card/60 transition-colors"
          >
            {body}
          </Link>
        ) : (
          <div key={a.id} className="px-3 py-2.5">
            {body}
          </div>
        );
      })}
    </div>
  );
}

export default function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listActivity(10)
      .then((r) => active && setItems(r))
      .catch((err: unknown) => {
        if (active)
          setError(err instanceof Error ? err.message : "Failed to load activity");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-brand-border/40">
        <h2 className="text-brand-text text-base font-bold font-display">
          Recent Activity
        </h2>
      </div>
      {error ? (
        <p className="px-6 py-8 text-center text-rose-400 text-xs break-words">
          {error}
        </p>
      ) : items === null ? (
        <p className="px-6 py-8 text-center text-brand-text-muted text-xs">
          Loading…
        </p>
      ) : (
        <ActivityList items={items} />
      )}
    </div>
  );
}
