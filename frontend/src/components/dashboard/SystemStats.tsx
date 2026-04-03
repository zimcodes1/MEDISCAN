import { TrendingUp, Zap, Activity, ShieldCheck, ImageIcon } from "lucide-react";

export default function SystemStats() {
    return (
        <div className="bg-[#0f1520] rounded-xl p-5 border border-[#1e2740]">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#dce1fb] text-sm font-semibold">System Stats</h3>
                <TrendingUp size={14} className="text-[#7bd0ff]" />
            </div>
            <div className="space-y-4">
                {[
                    { label: "Avg. Analysis Time", value: "38.2s", icon: <Zap size={13} /> },
                    { label: "AI Confidence Mean", value: "91.4%", icon: <Activity size={13} /> },
                    { label: "Human Validation Rate", value: "100%", icon: <ShieldCheck size={13} /> },
                    { label: "Scans Today", value: "17", icon: <ImageIcon size={13} /> },
                ].map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[#dce1fb]/40">
                            {stat.icon}
                            <span className="text-xs">{stat.label}</span>
                        </div>
                        <span className="text-[#dce1fb] text-sm font-semibold tabular-nums">{stat.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}