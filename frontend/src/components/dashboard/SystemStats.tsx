import { TrendingUp } from "lucide-react";

export interface SystemStatItem {
  label: string;
  value: string;
  icon: React.ReactNode;
}

interface SystemStatsProps {
  stats: SystemStatItem[];
}

export default function SystemStats({ stats }: SystemStatsProps) {
  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
      <div className="flex items-center justify-between mb-5 border-b border-brand-border/40 pb-3">
        <h3 className="text-brand-text text-sm font-bold font-display">
          System Status
        </h3>
        <TrendingUp size={14} className="text-brand-primary" />
      </div>
      <div className="space-y-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center justify-between group/row"
          >
            <div className="flex items-center gap-2.5 text-brand-text-muted">
              <span className="text-brand-primary group-hover/row:scale-110 transition-transform duration-200">
                {stat.icon}
              </span>
              <span className="text-xs font-medium">{stat.label}</span>
            </div>
            <span className="text-brand-text text-sm font-bold tabular-nums">
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
