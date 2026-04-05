import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ImageIcon,
} from "lucide-react";
import { ActivityLog } from "../components/dashboard/ActivityLogs";
import SystemStats from "../components/dashboard/SystemStats";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import StatCard from "../components/dashboard/StatCard";
import ScanRow, { type ScanQueueItem } from "../components/dashboard/ScanRow";

//Dummy Data

const SCAN_QUEUE: ScanQueueItem[] = [
  {
    id: "SCN-00841",
    patientName: "Emeka Okafor",
    patientCode: "PAT-3312",
    modality: "Chest X-Ray",
    projection: "PA",
    uploadedBy: "Dr. Nwosu",
    uploadedAt: "09:14 AM",
    priority: "urgent",
    status: "flagged",
    confidence: 94,
    prediction: "Pneumonia",
  },
  {
    id: "SCN-00842",
    patientName: "Aisha Bello",
    patientCode: "PAT-1190",
    modality: "Chest X-Ray",
    projection: "AP",
    uploadedBy: "Dr. Adeyemi",
    uploadedAt: "09:31 AM",
    priority: "urgent",
    status: "processing",
    confidence: null,
    prediction: null,
  },
  {
    id: "SCN-00843",
    patientName: "Chidi Eze",
    patientCode: "PAT-4457",
    modality: "Chest X-Ray",
    projection: "PA",
    uploadedBy: "Dr. Nwosu",
    uploadedAt: "09:45 AM",
    priority: "routine",
    status: "ready",
    confidence: 71,
    prediction: "Pneumonia",
  },
  {
    id: "SCN-00844",
    patientName: "Fatima Garba",
    patientCode: "PAT-2280",
    modality: "Chest X-Ray",
    projection: "Lateral",
    uploadedBy: "Dr. Ibrahim",
    uploadedAt: "10:02 AM",
    priority: "routine",
    status: "ready",
    confidence: 12,
    prediction: "Normal",
  },
  {
    id: "SCN-00845",
    patientName: "Oluwaseun Adeyemi",
    patientCode: "PAT-5591",
    modality: "Chest X-Ray",
    projection: "PA",
    uploadedBy: "Dr. Adeyemi",
    uploadedAt: "10:18 AM",
    priority: "routine",
    status: "reviewed",
    confidence: 88,
    prediction: "Pneumonia",
  },
];

//Main Dashboard Page

export default function DashboardPage() {
  const pending = SCAN_QUEUE.filter((s) => s.status !== "reviewed");
  const urgent = SCAN_QUEUE.filter(
    (s) => s.priority === "urgent" && s.status !== "reviewed",
  );
  const flagged = SCAN_QUEUE.filter((s) => s.status === "flagged");
  const reviewed = SCAN_QUEUE.filter((s) => s.status === "reviewed");

  return (
    <div className="flex bg-[#0c1324] min-h-screen font-sans">
      <Sidebar />

      <div className="w-full lg:ml-[20%] flex-1 flex flex-col">
        <TopBar />

        <main className="pt-16 flex-1">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Page Header */}
            <div className="mb-5 sm:mb-7">
              <h1 className="text-xl sm:text-2xl font-bold text-[#dce1fb] tracking-tight">
                Good morning, Dr. Nwosu
              </h1>
              <p className="text-[#dce1fb]/45 text-xs sm:text-sm mt-1">
                {new Date().toLocaleDateString("en-NG", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {" · "}Lagos University Teaching Hospital
              </p>
            </div>

            {/* Disclaimer Banner */}
            <div className="mb-5 sm:mb-7 flex items-start gap-2 sm:gap-3 bg-[#ffb95f]/8 border border-[#ffb95f]/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3">
              <AlertTriangle
                size={14}
                className="text-[#ffb95f] flex-shrink-0 mt-0.5 sm:w-[15px] sm:h-[15px]"
              />
              <p className="text-[#ffb95f]/80 text-[11px] sm:text-xs leading-relaxed">
                <span className="font-semibold text-[#ffb95f]">
                  AI Decision Support Only.
                </span>{" "}
                All outputs are preliminary findings and must be reviewed and
                verified by a qualified clinician before any clinical action is
                taken. MediScan NG does not constitute a medical diagnosis.
              </p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-7">
              <StatCard
                label="Pending Review"
                value={pending.length}
                sub="In your queue"
                icon={<ImageIcon size={18} />}
                accent="blue"
              />
              <StatCard
                label="Urgent"
                value={urgent.length}
                sub="High priority"
                icon={<AlertTriangle size={18} />}
                accent="amber"
              />
              <StatCard
                label="AI Flagged"
                value={flagged.length}
                sub="Possible findings"
                icon={<Activity size={18} />}
                accent="red"
              />
              <StatCard
                label="Reviewed Today"
                value={reviewed.length}
                sub="Signed off"
                icon={<CheckCircle2 size={18} />}
                accent="green"
              />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
              {/* Scan Queue — 2 cols */}
              <div className="xl:col-span-2 bg-[#0f1520] rounded-lg sm:rounded-xl border border-[#1e2740] overflow-hidden">
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#1e2740]">
                  <div>
                    <h2 className="text-[#dce1fb] text-sm sm:text-base font-semibold">
                      Scan Queue
                    </h2>
                    <p className="text-[#dce1fb]/35 text-[10px] sm:text-xs mt-0.5">
                      {pending.length} pending · {urgent.length} urgent
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button className="hidden sm:block text-[#dce1fb]/40 text-xs hover:text-[#dce1fb] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#1e2740]">
                      All
                    </button>
                    <button className="text-[#f08080] text-[10px] sm:text-xs font-medium bg-[#f08080]/10 border border-[#f08080]/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg">
                      Urgent first
                    </button>
                  </div>
                </div>

                {/* Table Head */}
                <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 text-[#dce1fb]/25 text-[10px] uppercase tracking-widest border-b border-[#1e2740]">
                  <div className="col-span-3">Patient</div>
                  <div className="col-span-2">Projection</div>
                  <div className="col-span-2">Uploaded by</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-3">AI Finding</div>
                </div>

                {/* Rows */}
                <div className="p-2 sm:p-3 space-y-2 sm:space-y-1.5">
                  {SCAN_QUEUE.map((scan) => (
                    <ScanRow key={scan.id} scan={scan} />
                  ))}
                </div>

                <div className="px-4 sm:px-6 py-3 border-t border-[#1e2740] flex justify-between items-center">
                  <p className="text-[#dce1fb]/25 text-[10px] sm:text-xs">
                    Showing {SCAN_QUEUE.length} scans
                  </p>
                  <button className="text-[#7bd0ff] text-[10px] sm:text-xs hover:underline flex items-center gap-1">
                    View full queue <ChevronRight size={12} />
                  </button>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-4 sm:space-y-5">
                <SystemStats />
                <ActivityLog />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
