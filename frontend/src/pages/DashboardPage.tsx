import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { AlertTriangle, CheckCircle, RefreshCw, TrendingUp } from "lucide-react";
import { pendingCases, sessionHistory } from "../utils/DummyData";

export default function DashboardPage() {
	return (
		<div className="flex bg-[#0c1324] min-h-screen">
			<Sidebar />
			
			<div className="ml-64 flex-1">
				<TopBar />
				
				<main className="pt-20 p-8">
					{/* Header Section */}
					<div className="mb-8">
						<h1 className="text-4xl font-bold text-[#dce1fb] mb-2">Diagnostic Pipeline</h1>
						<p className="text-[#dce1fb]/70">Real-time AI surveillance across active radiology streams.</p>
					</div>

					{/* Status Cards */}
					<div className="grid grid-cols-2 gap-6 mb-8">
						<div className="bg-[#191f31] p-6 rounded-xl">
							<div className="flex items-center justify-between mb-2">
								<span className="text-[#dce1fb]/70 text-sm uppercase tracking-wide">Queue Status</span>
							</div>
							<div className="flex items-baseline gap-2">
								<span className="text-4xl font-bold text-[#7bd0ff]">24</span>
								<span className="text-[#dce1fb] text-lg">Active</span>
							</div>
						</div>

						<div className="bg-[#191f31] p-6 rounded-xl">
							<div className="flex items-center justify-between mb-2">
								<span className="text-[#dce1fb]/70 text-sm uppercase tracking-wide">Priority Flags</span>
							</div>
							<div className="flex items-baseline gap-2">
								<span className="text-4xl font-bold text-[#ffb95f]">03</span>
								<span className="text-[#dce1fb] text-lg">Critical</span>
							</div>
						</div>
					</div>

					{/* Main Content Grid */}
					<div className="grid grid-cols-3 gap-6">
						{/* Pending Analysis - Takes 2 columns */}
						<div className="col-span-2 bg-[#151b2d] rounded-xl p-6">
							<div className="flex items-center justify-between mb-6">
								<h2 className="text-xl font-bold text-[#dce1fb]">Pending Analysis</h2>
								<div className="flex gap-4">
									<button className="text-[#dce1fb] text-sm hover:text-[#7bd0ff] transition-colors">
										All Scans
									</button>
									<button className="text-[#7bd0ff] text-sm font-semibold">
										High Priority
									</button>
								</div>
							</div>

							{/* Table Header */}
							<div className="grid grid-cols-12 gap-4 text-[#dce1fb]/50 text-xs uppercase tracking-wide mb-4 px-4">
								<div className="col-span-3">Patient Entity</div>
								<div className="col-span-2">Modality</div>
								<div className="col-span-2">AI Pulse</div>
								<div className="col-span-3">Confidence</div>
								<div className="col-span-2">Action</div>
							</div>

							{/* Cases List */}
							<div className="space-y-2">
								{pendingCases.map((case_) => (
									<div
										key={case_.id}
										className="bg-[#191f31] rounded-lg p-4 grid grid-cols-12 gap-4 items-center border-l-2"
										style={{ borderLeftColor: case_.statusColor }}
									>
										<div className="col-span-3">
											<p className="text-[#dce1fb] font-semibold">{case_.name}</p>
											<p className="text-[#dce1fb]/50 text-xs">{case_.uid}</p>
										</div>
										<div className="col-span-2">
											<span className="bg-[#2e3447] text-[#dce1fb] px-3 py-1 rounded text-xs">
												{case_.modality}
											</span>
										</div>
										<div className="col-span-2">
											<div className="flex items-center gap-2">
												{case_.status === "Flagged" && <AlertTriangle size={16} style={{ color: case_.statusColor }} />}
												{case_.status === "Ready" && <CheckCircle size={16} style={{ color: case_.statusColor }} />}
												{case_.status === "AI analyzing" && <RefreshCw size={16} style={{ color: case_.statusColor }} className="animate-spin" />}
												<span style={{ color: case_.statusColor }} className="text-sm font-medium">
													{case_.status}
												</span>
											</div>
										</div>
										<div className="col-span-3">
											<div className="flex items-center gap-2">
												<span className="text-[#dce1fb] text-sm">{case_.confidenceLabel}</span>
												<div className="flex-1 bg-[#2e3447] h-1 rounded-full overflow-hidden">
													<div
														className="h-full rounded-full"
														style={{
															width: case_.confidence,
															backgroundColor: case_.statusColor,
														}}
													/>
												</div>
												<span className="text-[#dce1fb]/70 text-xs">{case_.confidence}</span>
											</div>
										</div>
										<div className="col-span-2">
											<button className="text-[#7bd0ff] text-sm hover:underline">
												{case_.action}
											</button>
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Right Sidebar */}
						<div className="space-y-6">
							{/* Live Neural Mapping Card */}
							<div className="bg-[#151b2d] rounded-xl p-6">
								<div className="bg-[#191f31] rounded-lg p-4 mb-4">
									<img
										src="/images/neural-map.png"
										alt="Neural mapping"
										className="w-full h-48 object-cover rounded"
									/>
								</div>
								<div className="flex items-center gap-2 mb-3">
									<div className="w-2 h-2 bg-[#ffb95f] rounded-full animate-pulse" />
									<span className="text-[#ffb95f] text-xs uppercase tracking-wide">Live Neural Mapping</span>
								</div>
								<h3 className="text-[#dce1fb] font-bold text-lg mb-4">Patient RAD-9921-X</h3>
								<div className="space-y-2 mb-4">
									<div className="flex justify-between text-sm">
										<span className="text-[#dce1fb]/70">Anomaly detected:</span>
										<span className="text-[#dce1fb]">Left Hilar Region</span>
									</div>
									<div className="flex justify-between text-sm">
										<span className="text-[#dce1fb]/70">Pattern Match:</span>
										<span className="text-[#dce1fb]">Consolidation A-type</span>
									</div>
								</div>
								<button className="w-full bg-[#2e3447] text-[#7bd0ff] py-2 rounded-lg hover:bg-[#191f31] transition-colors">
									Load Full 3D Map
								</button>
							</div>

							{/* System Efficiency */}
							<div className="bg-[#151b2d] rounded-xl p-6">
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-[#dce1fb] font-bold">System Efficiency</h3>
									<TrendingUp size={18} className="text-[#7bd0ff]" />
								</div>
								<div className="space-y-3">
									<div className="flex justify-between items-center">
										<span className="text-[#dce1fb]/70 text-sm">Avg Analysis Time</span>
										<span className="text-[#dce1fb] font-semibold">42.4s</span>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-[#dce1fb]/70 text-sm">AI Confidence Mean</span>
										<span className="text-[#dce1fb] font-semibold">96.8%</span>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-[#dce1fb]/70 text-sm">Human Validation Rate</span>
										<span className="text-[#dce1fb] font-semibold">100%</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Session History */}
					<div className="mt-6 bg-[#151b2d] rounded-xl p-6">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-bold text-[#dce1fb]">Session History</h2>
							<button className="text-[#7bd0ff] text-sm hover:underline">Export Logs</button>
						</div>
						<div className="grid grid-cols-4 gap-4">
							{sessionHistory.map((log, index) => (
								<div key={index} className="bg-[#191f31] rounded-lg p-4">
									<p className="text-[#dce1fb]/50 text-xs mb-2">{log.time}</p>
									<p className="text-[#dce1fb] text-sm">{log.message}</p>
								</div>
							))}
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
