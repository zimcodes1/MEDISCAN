import { ZoomIn, ZoomOut, Download, Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const smoothstep = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("An image failed to load"));
    img.src = url;
  });
}

/**
 * Paints the heatmap layer for `base` onto `canvas`, sized like the X-ray (long side at
 * most `maxSide`). Transparent wherever the model found little. Used for the screen
 * and for downloads, so what you save is what you see.
 */
function drawHeatLayer(
  canvas: HTMLCanvasElement,
  base: HTMLImageElement,
  heat: HTMLImageElement,
  threshold: number,
  showRegion: boolean,
  maxSide: number,
): void {
  const W = base.naturalWidth;
  const H = base.naturalHeight;
  if (!W || !H) return;
  const k = Math.min(1, maxSide / Math.max(W, H));
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

  // 2) place it where the model looked
  const cw = canvas.width;
  const ch = canvas.height;
  const fullFrame =
    Math.abs(heat.naturalWidth / heat.naturalHeight - W / H) < 0.02;
  let rx = 0;
  let ry = 0;
  let rw = cw;
  let rh = ch;
  if (!fullFrame) {
    // centre crop: side = shorter edge, offset = half the difference
    const side = Math.min(cw, ch);
    rw = side;
    rh = side;
    rx = Math.floor(cw / 2) - Math.floor(side / 2);
    ry = Math.floor(ch / 2) - Math.floor(side / 2);
  }
  ctx.clearRect(0, 0, cw, ch);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, rx, ry, rw, rh);

  // 3) outline the analysed area and dim what the model did not see
  if (showRegion && (rw < cw - 1 || rh < ch - 1)) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.rect(0, 0, cw, ch);
    ctx.rect(rx, ry, rw, rh);
    ctx.fill("evenodd");
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = Math.max(2, Math.round(cw / 400));
    ctx.setLineDash([cw / 60, cw / 90]);
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.restore();
  }
}

type ExportMode = "heatmap" | "sidebyside";

/**
 * A PNG of what is on screen: the X-ray with the heatmap on it, or the original beside
 * the overlay with labels. Full resolution up to 2400px per panel, with the current
 * Overlay and Focus settings.
 */
async function renderExport(opts: {
  mode: ExportMode;
  originalUrl: string;
  heatmapUrl: string;
  opacity: number;
  threshold: number;
  showRegion: boolean;
}): Promise<Blob> {
  const MAX = 2400;
  const [base, heat] = await Promise.all([
    loadImage(opts.originalUrl),
    loadImage(opts.heatmapUrl),
  ]);
  const k = Math.min(1, MAX / Math.max(base.naturalWidth, base.naturalHeight));
  const w = Math.round(base.naturalWidth * k);
  const h = Math.round(base.naturalHeight * k);
  const layer = document.createElement("canvas");
  drawHeatLayer(layer, base, heat, opts.threshold, opts.showRegion, MAX);

  const out = document.createElement("canvas");
  const bar = opts.mode === "sidebyside" ? Math.max(40, Math.round(h * 0.07)) : 0;
  const gap = opts.mode === "sidebyside" ? Math.max(12, Math.round(w * 0.02)) : 0;
  out.width = opts.mode === "sidebyside" ? w * 2 + gap : w;
  out.height = h + bar;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("This browser cannot create the image");
  ctx.fillStyle = "#0a0f1e";
  ctx.fillRect(0, 0, out.width, out.height);

  const panel = (x: number, withHeat: boolean) => {
    ctx.drawImage(base, x, bar, w, h);
    if (withHeat) {
      ctx.globalAlpha = opts.opacity / 100;
      ctx.drawImage(layer, x, bar, w, h);
      ctx.globalAlpha = 1;
    }
  };
  if (opts.mode === "heatmap") {
    panel(0, true);
  } else {
    ctx.font = `bold ${Math.round(bar * 0.42)}px sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#c9d1e8";
    ctx.fillText("ORIGINAL", Math.round(bar * 0.4), bar / 2);
    ctx.fillStyle = "#4fd0ff";
    ctx.fillText("AI HEATMAP", w + gap + Math.round(bar * 0.4), bar / 2);
    panel(0, false);
    panel(w + gap, true);
  }
  return new Promise((resolve, reject) =>
    out.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not create the image"))),
      "image/png",
    ),
  );
}

/**
 * The X-ray with its heatmap on top, lined up exactly.
 *
 * The model never sees the whole X-ray: it takes the centre square (side = the
 * shorter edge) and resizes that to 224px, so its heatmap is a 224px square that
 * belongs on that centre square only. On a wide or tall X-ray, the strips outside
 * it were not analysed. The heatmap is drawn onto exactly that square (the same
 * rule as the model's centre crop). A heatmap that already has the X-ray's own
 * proportions is treated as full-frame instead.
 *
 * `threshold` hides weak activations so hotspots stay readable instead of tinting
 * the whole chest. `showRegion` outlines what the model analysed.
 */
function OverlayStack({
  originalUrl,
  heatmapUrl,
  opacity,
  threshold,
  showRegion,
}: {
  originalUrl: string;
  heatmapUrl: string;
  opacity: number;
  threshold: number;
  showRegion: boolean;
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
    // the map is smooth and low-resolution, so a modest canvas is plenty on screen
    drawHeatLayer(canvas, loaded.base, loaded.heat, threshold, showRegion, 1024);
  }, [loaded, key, threshold, showRegion]);

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
  // outline the centre square the model analysed (only drawn when the X-ray isn't square)
  const [showRegion, setShowRegion] = useState(true);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  // Fall back to the original image whenever there is no heatmap to show.
  const mode: ViewMode =
    viewMode !== "original" && !heatmapImageUrl ? "original" : viewMode;

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  /** Saves what you are looking at: the original file, the overlay, or both side by side. */
  const handleDownload = async () => {
    if (!originalImageUrl) return;
    const stem = downloadName.replace(/\.[^.]+$/, "");
    const save = (href: string, name: string) => {
      const link = document.createElement("a");
      link.href = href;
      link.download = name;
      link.click();
    };
    if (mode === "original" || !heatmapImageUrl) {
      save(originalImageUrl, downloadName); // the untouched file
      return;
    }
    setDownloading(true);
    setDownloadError(null);
    try {
      const blob = await renderExport({
        mode,
        originalUrl: originalImageUrl,
        heatmapUrl: heatmapImageUrl,
        opacity: overlayOpacity,
        threshold: threshold / 100,
        showRegion,
      });
      const url = URL.createObjectURL(blob);
      save(url, `${stem}-${mode === "heatmap" ? "heatmap" : "side-by-side"}.png`);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };
  const scale = { transform: `scale(${zoom / 100})` };

  // Maximize: the viewer fills the window, drawn straight onto the page body so it sits
  // above the top bar and sidebar. The browser's full screen is requested too where it is
  // allowed (not on iPhones). Escape or the same button closes it.
  const [maximized, setMaximized] = useState(false);
  const toggleMaximize = () => {
    if (maximized) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setMaximized(false);
      return;
    }
    setMaximized(true);
    document.documentElement.requestFullscreen?.().catch(() => {
      // refused: the full-window view alone is fine
    });
  };
  useEffect(() => {
    if (!maximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMaximized(false);
    };
    // the browser's own Esc/back leaves full screen: follow it
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setMaximized(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // the page behind must not scroll
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [maximized]);

  const viewer = (
    <div
      // Two modes, never mixed: when two utilities set the same property (relative vs
      // fixed, rounded-2xl vs rounded-none), whichever the stylesheet lists last wins.
      className={
        maximized
          ? "fixed inset-0 z-[100] h-screen w-screen bg-brand-bg p-4 sm:p-6 flex flex-col overflow-hidden group"
          : "glass-panel rounded-2xl p-4 sm:p-6 h-[520px] flex flex-col relative overflow-hidden group"
      }
    >
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
              disabled={!originalImageUrl || downloading}
              className="p-2 text-brand-text-muted hover:text-brand-primary hover:bg-brand-card/60 rounded-lg transition-all duration-200 disabled:opacity-30"
              title={
                mode === "heatmap"
                  ? "Download with heatmap (PNG)"
                  : mode === "sidebyside"
                    ? "Download side by side (PNG)"
                    : "Download Original"
              }
              aria-label="Download image"
            >
              <Download size={16} />
            </button>
            <button
              onClick={toggleMaximize}
              className="p-2 text-brand-text-muted hover:text-brand-primary hover:bg-brand-card/60 rounded-lg transition-all duration-200 cursor-pointer"
              title={maximized ? "Exit full screen (Esc)" : "Maximize"}
              aria-label={maximized ? "Exit full screen" : "Maximize"}
              aria-pressed={maximized}
            >
              {maximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
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
                  showRegion={showRegion}
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
                      showRegion={showRegion}
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
          <label
            className="flex items-center gap-2 sm:col-span-2 text-brand-text-muted text-[11px]"
            title="The model analyses only the centre square of the X-ray"
          >
            <input
              type="checkbox"
              checked={showRegion}
              onChange={(e) => setShowRegion(e.target.checked)}
              className="accent-brand-primary"
            />
            Outline the area the model analysed (the centre square; edges outside it were not examined)
          </label>
        </div>
      )}
      {downloadError && (
        <p className="text-rose-400 text-xs mt-2 break-words">{downloadError}</p>
      )}
    </div>
  );

  if (!maximized) return viewer;
  return (
    <>
      {/* keeps the page layout from jumping while the viewer is lifted out */}
      <div className="h-[520px]" aria-hidden />
      {createPortal(viewer, document.body)}
    </>
  );
}
