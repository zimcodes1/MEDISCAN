import { ZoomIn, ZoomOut, Download, Maximize2 } from "lucide-react";
import { useState } from "react";

type ViewMode = "original" | "heatmap" | "sidebyside";

interface ImageViewerProps {
	originalImageUrl: string;
	heatmapImageUrl: string;
}

export default function ImageViewer({ originalImageUrl, heatmapImageUrl }: ImageViewerProps) {
	const [viewMode, setViewMode] = useState<ViewMode>("original");
	const [zoom, setZoom] = useState(100);

	const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
	const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
	const handleDownload = () => {
		const link = document.createElement("a");
		link.href = originalImageUrl;
		link.download = "chest-xray-original.jpg";
		link.click();
	};

	return (
		<div className="bg-[#151b2d] rounded-xl p-4 sm:p-6 h-full flex flex-col">
			{/* Controls Header */}
			<div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-0 mb-4">
				{/* View Mode Toggle */}
				<div className="flex w-full gap-2 overflow-hidden">
					<button
						onClick={() => setViewMode("original")}
						className={`flex-1 text-center px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap ${
							viewMode === "original"
								? "bg-[#7bd0ff] text-[#0c1324]"
								: "bg-[#191f31] text-[#dce1fb] hover:bg-[#2e3447]"
						}`}
					>
						Original
					</button>
					<button
						onClick={() => setViewMode("heatmap")}
						className={`flex-1 text-center px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap ${
							viewMode === "heatmap"
								? "bg-[#7bd0ff] text-[#0c1324]"
								: "bg-[#191f31] text-[#dce1fb] hover:bg-[#2e3447]"
						}`}
					>
						Heatmap
					</button>
					<button
						onClick={() => setViewMode("sidebyside")}
						className={`flex-1 text-center px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap ${
							viewMode === "sidebyside"
								? "bg-[#7bd0ff] text-[#0c1324]"
								: "bg-[#191f31] text-[#dce1fb] hover:bg-[#2e3447]"
						}`}
					>
						Side-by-side
					</button>
				</div>

				{/* Zoom & Download Controls */}
				<div className="w-full flex items-center justify-between px-4">
					<button
						onClick={handleZoomOut}
						disabled={zoom <= 50}
						className="p-2 bg-[#191f31] text-[#dce1fb] rounded-lg hover:bg-[#2e3447] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<ZoomOut size={16} className="sm:w-[18px] sm:h-[18px]" />
					</button>
					<span className="text-[#dce1fb] text-xs sm:text-sm min-w-[2.5rem] sm:min-w-[3rem] text-center">
						{zoom}%
					</span>
					<button
						onClick={handleZoomIn}
						disabled={zoom >= 200}
						className="p-2 bg-[#191f31] text-[#dce1fb] rounded-lg hover:bg-[#2e3447] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<ZoomIn size={16} className="sm:w-[18px] sm:h-[18px]" />
					</button>
					<div className="w-px h-6 bg-[#2e3447] mx-1 sm:mx-2" />
					<button
						onClick={handleDownload}
						className="p-2 bg-[#191f31] text-[#dce1fb] rounded-lg hover:bg-[#2e3447] transition-colors"
					>
						<Download size={16} className="sm:w-[18px] sm:h-[18px]" />
					</button>
					<button className="p-2 bg-[#191f31] text-[#dce1fb] rounded-lg hover:bg-[#2e3447] transition-colors">
						<Maximize2 size={16} className="sm:w-[18px] sm:h-[18px]" />
					</button>
				</div>
			</div>

			{/* Image Display Area */}
			<div className="w-full flex-1 bg-[#0c1324] rounded-lg overflow-hidden flex items-center justify-center p-2 sm:p-4">
				{viewMode === "original" && (
					<img
						src={originalImageUrl}
						alt="Chest X-ray"
						style={{ transform: `scale(${zoom / 100})` }}
						className="max-w-full max-h-full object-contain transition-transform"
					/>
				)}
				{viewMode === "heatmap" && (
					<div className="relative w-full h-full flex items-center justify-center">
						<img
							src={originalImageUrl}
							alt="Chest X-ray"
							style={{ transform: `scale(${zoom / 100})` }}
							className="max-w-full max-h-full object-contain transition-transform"
						/>
						<img
							src={heatmapImageUrl}
							alt="Heatmap overlay"
							style={{ transform: `scale(${zoom / 100})` }}
							className="absolute inset-0 max-w-full max-h-full object-contain opacity-60 mix-blend-screen transition-transform"
						/>
					</div>
				)}
				{viewMode === "sidebyside" && (
					<div className="flex flex-col sm:flex-row gap-2 sm:gap-4 h-full w-full items-center">
						<div className="flex-1 flex items-center justify-center w-full h-1/2 sm:h-full">
							<img
								src={originalImageUrl}
								alt="Original"
								style={{ transform: `scale(${zoom / 100})` }}
								className="max-w-full max-h-full object-contain transition-transform"
							/>
						</div>
						<div className="flex-1 flex items-center justify-center w-full h-1/2 sm:h-full">
							<img
								src={heatmapImageUrl}
								alt="Heatmap"
								style={{ transform: `scale(${zoom / 100})` }}
								className="max-w-full max-h-full object-contain transition-transform"
							/>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
