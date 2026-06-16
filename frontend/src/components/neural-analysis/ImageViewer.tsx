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
		<div className="glass-panel rounded-2xl p-4 sm:p-6 h-[520px] flex flex-col relative overflow-hidden group">
			{/* Controls Header */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
				{/* View Mode Toggle */}
				<div className="flex bg-brand-card/45 border border-brand-border/40 p-1 rounded-xl gap-1">
					<button
						onClick={() => setViewMode("original")}
						className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
							viewMode === "original"
								? "bg-gradient-to-r from-brand-primary/15 to-brand-secondary/15 text-brand-primary border border-brand-primary/25 shadow-[0_0_15px_rgba(0,210,255,0.08)]"
								: "text-brand-text-muted hover:text-brand-text hover:bg-brand-card/50 border border-transparent"
						}`}
					>
						Original
					</button>
					<button
						onClick={() => setViewMode("heatmap")}
						className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
							viewMode === "heatmap"
								? "bg-gradient-to-r from-brand-primary/15 to-brand-secondary/15 text-brand-primary border border-brand-primary/25 shadow-[0_0_15px_rgba(0,210,255,0.08)]"
								: "text-brand-text-muted hover:text-brand-text hover:bg-brand-card/50 border border-transparent"
						}`}
					>
						Heatmap Overlay
					</button>
					<button
						onClick={() => setViewMode("sidebyside")}
						className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
							viewMode === "sidebyside"
								? "bg-gradient-to-r from-brand-primary/15 to-brand-secondary/15 text-brand-primary border border-brand-primary/25 shadow-[0_0_15px_rgba(0,210,255,0.08)]"
								: "text-brand-text-muted hover:text-brand-text hover:bg-brand-card/50 border border-transparent"
						}`}
					>
						Side-by-side
					</button>
				</div>

				{/* Zoom & Download Controls */}
				<div className="flex items-center gap-1.5 bg-brand-card/45 border border-brand-border/40 p-1 rounded-xl w-full sm:w-auto justify-between sm:justify-start">
					<div className="flex items-center gap-1">
						<button
							onClick={handleZoomOut}
							disabled={zoom <= 50}
							className="p-2 text-brand-text-muted hover:text-brand-primary hover:bg-brand-card/60 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:hover:text-brand-text-muted disabled:hover:bg-transparent"
							title="Zoom Out"
						>
							<ZoomOut size={16} />
						</button>
						<span className="text-brand-text text-xs font-bold min-w-[3rem] text-center">
							{zoom}%
						</span>
						<button
							onClick={handleZoomIn}
							disabled={zoom >= 200}
							className="p-2 text-brand-text-muted hover:text-brand-primary hover:bg-brand-card/60 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:hover:text-brand-text-muted disabled:hover:bg-transparent"
							title="Zoom In"
						>
							<ZoomIn size={16} />
						</button>
					</div>
					
					<div className="w-px h-5 bg-brand-border/50 mx-1 hidden sm:block" />
					
					<div className="flex items-center gap-1">
						<button
							onClick={handleDownload}
							className="p-2 text-brand-text-muted hover:text-brand-primary hover:bg-brand-card/60 rounded-lg transition-all duration-200"
							title="Download Original"
						>
							<Download size={16} />
						</button>
						<button 
							className="p-2 text-brand-text-muted hover:text-brand-primary hover:bg-brand-card/60 rounded-lg transition-all duration-200"
							title="Maximize"
						>
							<Maximize2 size={16} />
						</button>
					</div>
				</div>
			</div>

			{/* Image Display Area */}
			<div className="flex-1 bg-brand-bg/60 border border-brand-border/40 rounded-xl overflow-hidden flex items-center justify-center relative shadow-inner group/viewer min-h-[350px]">
				<div className="absolute inset-0 bg-radial-glow opacity-10 pointer-events-none" />
				
				{viewMode === "original" && (
					<img
						src={originalImageUrl}
						alt="Chest X-ray"
						style={{ transform: `scale(${zoom / 100})` }}
						className="max-w-full max-h-full object-contain transition-transform duration-200"
					/>
				)}
				{viewMode === "heatmap" && (
					<div className="relative max-w-full max-h-full flex items-center justify-center">
						<img
							src={originalImageUrl}
							alt="Chest X-ray"
							style={{ transform: `scale(${zoom / 100})` }}
							className="max-w-full max-h-full object-contain transition-transform duration-200"
						/>
						<img
							src={heatmapImageUrl}
							alt="Heatmap overlay"
							style={{ transform: `scale(${zoom / 100})` }}
							className="absolute max-w-full max-h-full object-contain opacity-65 mix-blend-screen transition-transform duration-200 pointer-events-none"
						/>
					</div>
				)}
				{viewMode === "sidebyside" && (
					<div className="flex gap-4 w-full h-full p-4 items-center justify-center">
						<div className="flex-1 h-full flex flex-col items-center justify-center relative border-r border-brand-border/30 pr-2">
							<span className="absolute top-2 left-2 px-2 py-0.5 bg-brand-bg/80 border border-brand-border/60 text-brand-text-muted text-[10px] font-bold rounded-md uppercase tracking-wider z-10">Original</span>
							<img
								src={originalImageUrl}
								alt="Original"
								style={{ transform: `scale(${zoom / 100})` }}
								className="max-w-full max-h-full object-contain transition-transform duration-200"
							/>
						</div>
						<div className="flex-1 h-full flex flex-col items-center justify-center relative pl-2">
							<span className="absolute top-2 left-2 px-2 py-0.5 bg-brand-bg/80 border border-brand-border/60 text-brand-primary text-[10px] font-bold rounded-md uppercase tracking-wider z-10">AI Heatmap</span>
							<img
								src={heatmapImageUrl}
								alt="Heatmap"
								style={{ transform: `scale(${zoom / 100})` }}
								className="max-w-full max-h-full object-contain transition-transform duration-200"
							/>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
