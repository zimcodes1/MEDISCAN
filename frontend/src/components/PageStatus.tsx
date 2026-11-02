import type { ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-16 text-brand-text-muted text-sm">
      <Loader2 size={16} className="animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-14 px-6">
      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
        <AlertTriangle size={18} />
      </div>
      <div>
        <p className="text-brand-text font-bold text-sm">Something went wrong</p>
        <p className="text-brand-text-muted text-xs mt-1 max-w-sm break-words">
          {message}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-brand-primary text-xs font-bold hover:text-brand-primary-hover px-3 py-1.5 rounded-xl border border-brand-primary/20 hover:bg-brand-primary/10 transition-all"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-14 px-6">
      <p className="text-brand-text font-bold text-sm">{title}</p>
      {hint && <p className="text-brand-text-muted text-xs max-w-sm">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
