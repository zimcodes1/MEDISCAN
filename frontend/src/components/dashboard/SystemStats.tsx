import { TrendingUp, Zap, Activity, ShieldCheck, ImageIcon } from "lucide-react";

export default function SystemStats() {
    return (
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-5 border-b border-brand-border/40 pb-3">
                <h3 className="text-brand-text text-sm font-bold font-display">System Status</h3>
                <TrendingUp size={14} className="text-brand-primary" />
            </div>
            <div className="space-y-4">
                {[
                    { label: "Avg. Analysis Time", value: "38.2s", icon: <Zap size={13} /> },
                    { label: "AI Confidence Mean", value: "91.4%", icon: <Activity size={13} /> },
                    { label: "Human Validation Rate", value: "100%", icon: <ShieldCheck size={13} /> },
                    { label: "Scans Today", value: "17", icon: <ImageIcon size={13} /> },
                ].map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between group/row">
                        <div className="flex items-center gap-2.5 text-brand-text-muted">
                            <span className="text-brand-primary group-hover/row:scale-110 transition-transform duration-200">{stat.icon}</span>
                            <span className="text-xs font-medium">{stat.label}</span>
                        </div>
                        <span className="text-brand-text text-sm font-bold tabular-nums">{stat.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}