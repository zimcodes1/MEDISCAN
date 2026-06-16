import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import ImageViewer from "../components/neural-analysis/ImageViewer";
import AIOutputPanel from "../components/neural-analysis/AIOutputPanel";

export default function NeuralAnalysisPage() {
	// Mock data - would come from API/route params
	const scanData = {
		originalImageUrl: "/images/chest-scan.jpeg",
		heatmapImageUrl: "/images/chest-scan-heatmap.jpg",
		prediction: "pneumonia" as const,
		confidence: 94,
		gradCamSummary: "Model attention concentrated in right lower lobe, consistent with consolidation pattern. Secondary focus detected in left mid-zone.",
		patientName: "Elias Vance",
		scanId: "RAD-9921-X",
		dateUploaded: "2024-01-15",
		projection: "PA (Posteroanterior)",
		uploadedBy: "Dr. Nwosu",
		assignedRadiologist: "Dr. S. Chen",
		reportStatus: "pending" as const,
		priority: "urgent" as const,
		preAnalysisNotes: "Patient presenting with persistent cough and fever for 5 days. Suspected lower respiratory tract infection.",
	};

	const handleWriteReport = () => {
		// Navigate to report writing page
		window.location.href = "/patient-reports/write";
	};

	// Check if current user can write report (would be based on auth)
	const canWriteReport = true; // Mock - would check if user is assigned radiologist or admin

	return (
		<div className="flex bg-brand-bg min-h-screen">
			<Sidebar />

			<div className="ml-64 flex-1 flex flex-col">
				<TopBar />

				<main className="pt-16 p-8 relative z-0 flex-1 flex flex-col">
					{/* Header */}
					<div className="mb-8 mt-5">
						<h1 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">Neural Analysis</h1>
						<p className="text-brand-text-muted text-sm">AI-assisted diagnostic output for radiologist review.</p>
					</div>

					{/* Responsive Layout Grid */}
					<div className="grid grid-cols-3 gap-6 items-start">
						{/* Left Column - Image Viewer (2/3 width) */}
						<div className="col-span-3 xl:col-span-2">
							<ImageViewer
								originalImageUrl={scanData.originalImageUrl}
								heatmapImageUrl={scanData.heatmapImageUrl}
							/>
						</div>

						{/* Right Column - AI Output Panel (1/3 width) */}
						<div className="col-span-3 xl:col-span-1 glass-panel rounded-2xl p-6 overflow-y-auto max-h-[600px] xl:max-h-[520px] hide-scrollbar">
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
				</main>
			</div>
		</div>
	);
}
