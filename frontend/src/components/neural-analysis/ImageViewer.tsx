import { ZoomIn, ZoomOut, Download, Maximize2 } from "lucide-react";
import { useState } from "react";

type ViewMode = "original" | "heatmap" | "sidebyside";

const MODES: { id: ViewMode; label: string; needsHeatmap: boolean }[] = [
  { id: "original", label: "Original", needsHeatmap: false },
  { id: "heatmap", label: "Heatmap Overlay", needsHeatmap: true },
  { id: "sidebyside", label: "Side-by-side", needsHeatmap: true },
];

interface ImageViewerProps {
  originalImageUrl: string | null;
  imageFailed?: boolean;
  downloadName?: string;
  /** Object URL of the selected finding's heatmap, once loaded. */
  heatmapImageUrl: string | null;
  /** The selected finding has a heatmap on the server. */
  heatmapAvailable: boolean;
  heatmapLoading: boolean;
  heatmapFailed: boolean;
}

export default function ImageViewer({
  originalImageUrl,
  imageFailed = false,
  downloadName = "chest-xray",
  heatmapImageUrl,
  heatmapAvailable,
  heatmapLoading,
  heatmapFailed,
}: ImageViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("original");
  const [zoom, setZoom] = useState(100);
  const [overlayOpacity, setOverlayOpacity] = useState(65);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleDownload = () => {
    if (!originalImageUrl) return;
    const link = document.createElement("a");
    link.href = originalImageUrl;
    link.download = downloadName;
    link.click();
  };

  // Fall back to the original image whenever there is no heatmap to show.
  const mode: ViewMode =
    viewMode !== "original" && !heatmapImageUrl ? "original" : viewMode;
  const scale = { transform: `scale(${zoom / 100})` };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-6 h-[520px] flex flex-col relative overflow-hidden group">
      {/* Controls Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        {/* View Mode Toggle */}
        <div className="flex bg-brand-card/45 border border-brand-border/40 p-1 rounded-xl gap-1">
          {MODES.map((m) => {
            const disabled = m.needsHeatmap && !heatmapAvailable;
            return (
              <button
                key={m.id}
                onClick={() => setViewMode(m.id)}
                disabled={disabled}
                title={disabled ? "No heatmap for this finding" : undefined}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed ${
                  viewMode === m.id
                    ? "bg-gradient-to-r from-brand-primary/15 to-brand-secondary/15 text-brand-primary border border-brand-primary/25 shadow-[0_0_15px_rgba(0,210,255,0.08)]"
                    : "text-brand-text-muted hover:text-brand-text hover:bg-brand-card/50 border border-transparent"
                }`}
              >
                {m.label}
              </button>
            );
          })}
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
              disabled={!originalImageUrl}
              className="p-2 text-brand-text-muted hover:text-brand-primary hover:bg-brand-card/60 rounded-lg transition-all duration-200 disabled:opacity-30"
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

        {!originalImageUrl ? (
          <p className="text-brand-text-muted text-sm">
            {imageFailed ? "Image unavailable" : "Loading image…"}
          </p>
        ) : (
          <>
            {mode === "original" && (
              <img
                src={originalImageUrl}
                alt="Chest X-ray"
                style={scale}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
              />
            )}
            {mode === "heatmap" && heatmapImageUrl && (
              <div className="relative max-w-full max-h-full flex items-center justify-center">
                <img
                  src={originalImageUrl}
                  alt="Chest X-ray"
                  style={scale}
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                />
                <img
                  src={heatmapImageUrl}
                  alt="Heatmap overlay"
                  style={{ ...scale, opacity: overlayOpacity / 100 }}
                  className="absolute max-w-full max-h-full object-contain mix-blend-screen transition-transform duration-200 pointer-events-none"
                />
              </div>
            )}
            {mode === "sidebyside" && heatmapImageUrl && (
              <div className="flex gap-4 w-full h-full p-4 items-center justify-center">
                <div className="flex-1 h-full flex flex-col items-center justify-center relative border-r border-brand-border/30 pr-2">
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-brand-bg/80 border border-brand-border/60 text-brand-text-muted text-[10px] font-bold rounded-md uppercase tracking-wider z-10">
                    Original
                  </span>
                  <img
                    src={originalImageUrl}
                    alt="Original"
                    style={scale}
                    className="max-w-full max-h-full object-contain transition-transform duration-200"
                  />
                </div>
                <div className="flex-1 h-full flex flex-col items-center justify-center relative pl-2">
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-brand-bg/80 border border-brand-border/60 text-brand-primary text-[10px] font-bold rounded-md uppercase tracking-wider z-10">
                    AI Heatmap
                  </span>
                  <img
                    src={heatmapImageUrl}
                    alt="Heatmap"
                    style={scale}
                    className="max-w-full max-h-full object-contain transition-transform duration-200"
                  />
                </div>
              </div>
            )}

            {heatmapLoading && (
              <span className="absolute bottom-3 left-3 px-2.5 py-1 bg-brand-bg/80 border border-brand-border/60 text-brand-text-muted text-[10px] font-bold rounded-md">
                Loading heatmap…
              </span>
            )}
            {heatmapFailed && (
              <span className="absolute bottom-3 left-3 px-2.5 py-1 bg-brand-bg/80 border border-rose-500/30 text-rose-400 text-[10px] font-bold rounded-md">
                Heatmap unavailable
              </span>
            )}
          </>
        )}
      </div>

      {mode === "heatmap" && heatmapImageUrl && (
        <div className="flex items-center gap-3 mt-3">
          <span className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider">
            Overlay
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={overlayOpacity}
            onChange={(e) => setOverlayOpacity(Number(e.target.value))}
            className="flex-1 accent-brand-primary"
            aria-label="Heatmap overlay opacity"
          />
          <span className="text-brand-text text-xs font-bold w-10 text-right">
            {overlayOpacity}%
          </span>
        </div>
      )}
    </div>
  );
}
