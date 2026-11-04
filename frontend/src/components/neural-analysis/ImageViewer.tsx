import { ZoomIn, ZoomOut, Download, Maximize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const smoothstep = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

/**
 * The X-ray with its heatmap on top, lined up exactly.
 *
 * The model's heatmap is a small square image with its own transparency (strong
 * regions opaque, weak ones see-through), while the X-ray keeps its own
 * proportions. Drawn as-is the two don't match. Here the heatmap is stretched to
 * the X-ray's exact shape on a canvas, and `threshold` hides weak activations so
 * the hotspots stay readable instead of tinting the whole chest.
 */
function OverlayStack({
  originalUrl,
  heatmapUrl,
  opacity,
  threshold,
}: {
  originalUrl: string;
  heatmapUrl: string;
  opacity: number;
  threshold: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const key = `${originalUrl}|${heatmapUrl}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    base: HTMLImageElement;
    heat: HTMLImageElement;
  } | null>(null);

  useEffect(() => {
    let active = true;
    const base = new Image();
    const heat = new Image();
    let n = 0;
    const done = () => {
      if (++n === 2 && active) setLoaded({ key, base, heat });
    };
    base.onload = done;
    heat.onload = done;
    base.src = originalUrl;
    heat.src = heatmapUrl;
    return () => {
      active = false;
    };
  }, [key, originalUrl, heatmapUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded || loaded.key !== key) return;
    const { base, heat } = loaded;
    const W = base.naturalWidth;
    const H = base.naturalHeight;
    if (!W || !H) return;
    // the map is smooth and low-resolution, so a modest canvas is plenty
    const k = Math.min(1, 1024 / Math.max(W, H));
    canvas.width = Math.round(W * k);
    canvas.height = Math.round(H * k);

    // 1) work on the heatmap at its own size: hide weak activations
    const small = document.createElement("canvas");
    small.width = heat.naturalWidth;
    small.height = heat.naturalHeight;
    const sctx = small.getContext("2d");
    const ctx = canvas.getContext("2d");
    if (!sctx || !ctx) return;
    sctx.drawImage(heat, 0, 0);
    const img = sctx.getImageData(0, 0, small.width, small.height);
    const px = img.data;
    let max = 0;
    for (let i = 3; i < px.length; i += 4) max = Math.max(max, px[i]);
    if (max > 0 && threshold > 0) {
      for (let i = 3; i < px.length; i += 4) {
        px[i] = px[i] * smoothstep((px[i] / max - threshold) / 0.2);
      }
      sctx.putImageData(img, 0, 0);
    }

    // 2) stretch it over the X-ray's exact proportions
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
  }, [loaded, key, threshold]);

  return (
    <div className="absolute inset-0">
      <img
        src={originalUrl}
        alt="Chest X-ray"
        className="absolute inset-0 w-full h-full object-contain"
      />
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Heatmap overlay"
        style={{ opacity: opacity / 100 }}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />
    </div>
  );
}

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
  const [overlayOpacity, setOverlayOpacity] = useState(100);
  // hides weak activations; 30% keeps hotspots clear without tinting the whole chest
  const [threshold, setThreshold] = useState(30);

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
              <div
                style={scale}
                className="absolute inset-0 transition-transform duration-200"
              >
                <OverlayStack
                  originalUrl={originalImageUrl}
                  heatmapUrl={heatmapImageUrl}
                  opacity={overlayOpacity}
                  threshold={threshold / 100}
                />
              </div>
            )}
            {mode === "sidebyside" && heatmapImageUrl && (
              <div className="flex gap-4 w-full h-full p-4 items-center justify-center">
                <div className="flex-1 h-full relative border-r border-brand-border/30 pr-2">
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-brand-bg/80 border border-brand-border/60 text-brand-text-muted text-[10px] font-bold rounded-md uppercase tracking-wider z-10">
                    Original
                  </span>
                  <div
                    style={scale}
                    className="absolute inset-0 transition-transform duration-200"
                  >
                    <img
                      src={originalImageUrl}
                      alt="Original"
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                  </div>
                </div>
                <div className="flex-1 h-full relative pl-2">
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-brand-bg/80 border border-brand-border/60 text-brand-primary text-[10px] font-bold rounded-md uppercase tracking-wider z-10">
                    AI Heatmap
                  </span>
                  <div
                    style={scale}
                    className="absolute inset-0 transition-transform duration-200"
                  >
                    <OverlayStack
                      originalUrl={originalImageUrl}
                      heatmapUrl={heatmapImageUrl}
                      opacity={overlayOpacity}
                      threshold={threshold / 100}
                    />
                  </div>
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

      {mode !== "original" && heatmapImageUrl && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
          <label className="flex items-center gap-3">
            <span className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider w-16 shrink-0">
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
          </label>
          <label
            className="flex items-center gap-3"
            title="Hide weak activations so only the strongest areas show"
          >
            <span className="text-brand-text-muted text-[10px] font-bold uppercase tracking-wider w-16 shrink-0">
              Focus
            </span>
            <input
              type="range"
              min={0}
              max={80}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="flex-1 accent-brand-primary"
              aria-label="Heatmap focus: hide weak activations"
            />
            <span className="text-brand-text text-xs font-bold w-10 text-right">
              {threshold}%
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
