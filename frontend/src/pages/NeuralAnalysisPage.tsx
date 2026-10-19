import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, ImageIcon } from "lucide-react";
import ImageViewer from "../components/neural-analysis/ImageViewer";
import AIOutputPanel from "../components/neural-analysis/AIOutputPanel";
import ReviewPanel from "../components/neural-analysis/ReviewPanel";
import StatusBadge from "../components/StatusBadge";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../components/PageStatus";
import { getPatient, type PatientRecord } from "../lib/patients";
import {
  getHeatmapUrl,
  getScan,
  getScanImageUrl,
  listScansWithPatients,
  type ScanRecord,
  type ScanWithPatient,
} from "../lib/scans";
import { formatDateTime } from "../lib/format";
import { listStaff, type StaffMember } from "../lib/staff";
import { SCAN_WORKFLOW } from "../lib/features";

/** /neural-analysis shows a scan picker; /scans/:scanId shows the analysis. */
export default function NeuralAnalysisPage() {
  const { scanId } = useParams<{ scanId: string }>();

  useEffect(() => {
    document.title = "Analysis - Mediscan AI";
  }, []);

  // key: start from a clean state whenever the scan changes
  return scanId ? <ScanAnalysis key={scanId} scanId={scanId} /> : <ScanPicker />;
}

function extensionFor(contentType?: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/jpeg") return "jpg";
  return "img";
}

function ScanAnalysis({ scanId }: { scanId: string }) {
  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [heatmaps, setHeatmaps] = useState<Record<string, string>>({});
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const heatmapCache = useRef<Record<string, string>>({});

  // Load the scan, then its patient and image (which must not block the page).
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    (async () => {
      try {
        const s = await getScan(scanId);
        if (!active) return;
        setScan(s);
        setSelectedId(s.findings?.find((f) => f.has_heatmap)?.id ?? null);

        getPatient(s.patient_id)
          .then((p) => active && setPatient(p))
          .catch(() => {});
        getScanImageUrl(scanId)
          .then((u) => {
            if (!active) {
              URL.revokeObjectURL(u);
              return;
            }
            objectUrl = u;
            setImageUrl(u);
          })
          .catch(() => active && setImageFailed(true));
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Failed to load scan");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [scanId, reloadKey]);

  // Assignable staff for the review panel
  useEffect(() => {
    if (!SCAN_WORKFLOW) return;
    let active = true;
    listStaff()
      .then((r) => active && setStaff(r))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const selected = scan?.findings?.find((f) => f.id === selectedId) ?? null;
  const selectedHasHeatmap = !!selected?.has_heatmap;

  // Fetch the selected finding's heatmap the first time it is selected.
  useEffect(() => {
    if (!selectedId || !selectedHasHeatmap) return;
    if (heatmapCache.current[selectedId]) return;
    let cancelled = false;
    getHeatmapUrl(scanId, selectedId)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        heatmapCache.current[selectedId] = url;
        setHeatmaps((prev) => ({ ...prev, [selectedId]: url }));
      })
      .catch(() => {
        if (!cancelled) setFailedIds((prev) => [...prev, selectedId]);
      });
    return () => {
      cancelled = true;
    };
  }, [scanId, selectedId, selectedHasHeatmap]);

  // Free every heatmap object URL when leaving the page.
  useEffect(() => {
    const cache = heatmapCache.current;
    return () => {
      Object.values(cache).forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  function retry() {
    setLoading(true);
    setError(null);
    setImageUrl(null);
    setImageFailed(false);
    setReloadKey((k) => k + 1);
  }

  const heatmapUrl = selectedId ? (heatmaps[selectedId] ?? null) : null;
  const heatmapFailed = !!selectedId && failedIds.includes(selectedId);
  const heatmapLoading = selectedHasHeatmap && !heatmapUrl && !heatmapFailed;

  return (
    <div className="p-4 sm:p-8 flex-1 flex flex-col">
      <div className="mb-8 mt-5">
        <Link
          to={scan ? `/patients/${scan.patient_id}` : "/neural-analysis"}
          className="inline-flex items-center gap-1.5 text-brand-text-muted text-xs font-semibold hover:text-brand-primary transition-colors mb-3"
        >
          <ArrowLeft size={14} /> {scan ? "Back to patient" : "All scans"}
        </Link>
        <h1 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">
          Neural Analysis
        </h1>
        <p className="text-brand-text-muted text-sm">
          AI-assisted diagnostic output for radiologist review.
        </p>
      </div>

      {loading ? (
        <LoadingState label="Loading scan…" />
      ) : error || !scan ? (
        <ErrorState message={error ?? "Scan not found"} onRetry={retry} />
      ) : (
        <div className="grid grid-cols-3 gap-6 items-start">
          <div className="col-span-3 xl:col-span-2">
            <ImageViewer
              originalImageUrl={imageUrl}
              imageFailed={imageFailed}
              downloadName={`scan-${scan.id.slice(0, 8)}.${extensionFor(scan.content_type)}`}
              heatmapImageUrl={heatmapUrl}
              heatmapAvailable={selectedHasHeatmap}
              heatmapLoading={heatmapLoading}
              heatmapFailed={heatmapFailed}
            />
          </div>

          <div className="col-span-3 xl:col-span-1 glass-panel rounded-2xl p-4 sm:p-6 overflow-y-auto max-h-[600px] xl:max-h-[520px] hide-scrollbar space-y-5">
            <AIOutputPanel
              findings={scan.findings ?? []}
              selectedFindingId={selectedId}
              onSelectFinding={setSelectedId}
              patientCode={patient?.patient_code ?? null}
              scanId={scan.id}
              status={scan.status}
              createdAt={scan.created_at}
              contentType={scan.content_type}
              sizeBytes={scan.size_bytes}
              disclaimer={scan.disclaimer}
              heatmapShown={!!heatmapUrl}
            />
            {SCAN_WORKFLOW && (
              <ReviewPanel
                scan={scan}
                staff={staff}
                onUpdated={(updated) =>
                  setScan((prev) => (prev ? { ...prev, ...updated } : updated))
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ScanPicker() {
  const [rows, setRows] = useState<ScanWithPatient[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    listScansWithPatients({ limit: 20 })
      .then((r) => active && setRows(r))
      .catch((err: unknown) => {
        if (active)
          setError(err instanceof Error ? err.message : "Failed to load scans");
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  function retry() {
    setRows(null);
    setError(null);
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="mt-5">
        <h1 className="text-3xl font-extrabold text-brand-text tracking-tight font-display mb-2">
          Neural Analysis
        </h1>
        <p className="text-brand-text-muted text-sm">
          Choose a scan to review its AI output.
        </p>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : rows === null ? (
          <LoadingState label="Loading scans…" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No scans yet"
            hint="Upload a chest X-ray and it will appear here."
            action={
              <Link
                to="/case-upload"
                className="text-brand-primary text-sm font-bold hover:text-brand-primary-hover"
              >
                Go to Case Upload
              </Link>
            }
          />
        ) : (
          <div className="p-4 space-y-2">
            {rows.map(({ scan, patientCode }) => {
              const top = scan.findings?.length
                ? [...scan.findings].sort((a, b) => b.score - a.score)[0]
                : undefined;
              return (
                <Link
                  key={scan.id}
                  to={`/scans/${scan.id}`}
                  className="flex items-center gap-4 px-5 py-4 rounded-xl border border-brand-border/40 bg-brand-card/50 hover:bg-brand-card/80 hover:border-brand-primary/30 transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-brand-primary/10 border-brand-primary/20 text-brand-primary">
                    <ImageIcon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-brand-text text-sm font-bold truncate">
                      {patientCode ?? "Unknown patient"}
                    </p>
                    <p className="text-brand-text-muted/60 text-xs mt-0.5">
                      {formatDateTime(scan.created_at)}
                    </p>
                  </div>
                  {top && (
                    <span className="hidden sm:inline text-brand-text-muted text-xs font-semibold">
                      {top.condition} ({Math.round(top.confidence_pct)}%)
                    </span>
                  )}
                  <StatusBadge status={scan.status} />
                  <ChevronRight
                    size={16}
                    className="text-brand-text-muted/40 group-hover:text-brand-primary transition-colors"
                  />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
