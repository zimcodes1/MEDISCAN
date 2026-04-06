import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import ImageViewer from "../components/neural-analysis/ImageViewer";
import AIOutputPanel from "../components/neural-analysis/AIOutputPanel";

export default function NeuralAnalysisPage() {
  // Mock data - would come from API/route params
  const scanData = {
    originalImageUrl: "/images/chest-xray-sample.jpg",
    heatmapImageUrl: "/images/chest-xray-heatmap.jpg",
    prediction: "pneumonia" as const,
    confidence: 94,
    gradCamSummary:
      "Model attention concentrated in right lower lobe, consistent with consolidation pattern. Secondary focus detected in left mid-zone.",
    patientName: "Elias Vance",
    scanId: "RAD-9921-X",
    dateUploaded: "2024-01-15",
    projection: "PA (Posteroanterior)",
    uploadedBy: "Dr. M. Johnson",
    assignedRadiologist: "Dr. S. Chen",
    reportStatus: "pending" as const,
    priority: "urgent" as const,
    preAnalysisNotes:
      "Patient presenting with persistent cough and fever for 5 days. Suspected lower respiratory tract infection.",
  };

  const handleWriteReport = () => {
    // Navigate to report writing page
    window.location.href = "/patient-reports/write";
  };

  // Check if current user can write report (would be based on auth)
  const canWriteReport = true; // Mock - would check if user is assigned radiologist or admin

  return (
    <div className="flex bg-[#0c1324] min-h-screen">
      <Sidebar />

      <div className="w-full lg:ml-[20%] flex-1">
        <TopBar />

        <main className="pt-16 p-4 sm:p-6 lg:p-8">
          <div className="bg-[#151b2d] rounded-xl p-5 border border-[#1e2740]">
            {/* Header */}
            <div className="mb-6 mt-3 sm:mt-5">
              <h1 className="text-xl sm:text-2xl font-bold text-[#dce1fb] mb-2">
                Neural Analysis
              </h1>
              <p className="text-sm text-[#dce1fb]/70">
                AI-assisted diagnostic output for radiologist review.
              </p>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 h-auto xl:h-[calc(100vh-12rem)]">
              {/* Left Column - Image Viewer (2/3 width) */}
              <div className="xl:col-span-2 min-h-[400px] sm:min-h-[500px]">
                <ImageViewer
                  originalImageUrl={scanData.originalImageUrl}
                  heatmapImageUrl={scanData.heatmapImageUrl}
                />
              </div>

              {/* Right Column - AI Output Panel (1/3 width) */}
              <div className="overflow-y-auto hide-scrollbar p-4 sm:p-5 bg-[#151b2d] rounded-xl sm:rounded-2xl">
                <AIOutputPanel
                  prediction={scanData.prediction}
                  confidence={scanData.confidence}
                  gradCamSummary={scanData.gradCamSummary}
                  patientName={scanData.patientName}
                  scanId={scanData.scanId}
                  dateUploaded={scanData.dateUploaded}
                  projection={scanData.projection}
                  uploadedBy={scanData.uploadedBy}
                  assignedRadiologist={scanData.assignedRadiologist}
                  reportStatus={scanData.reportStatus}
                  priority={scanData.priority}
                  preAnalysisNotes={scanData.preAnalysisNotes}
                  onWriteReport={handleWriteReport}
                  canWriteReport={canWriteReport}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
