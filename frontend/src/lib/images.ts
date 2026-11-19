import { useEffect, useState } from "react";
import { API_BASE_URL, api } from "./api";

/**
 * Avatars and logos are behind the sign-in token, so a plain <img src> can't
 * load them. Fetch them as blobs (like scan images) and hand out object URLs.
 */
const cache = new Map<string, Promise<string>>();
const listeners = new Set<() => void>();

/** Only same-API paths are fetched, so the Bearer token never goes to another host. */
function toApiPath(url: string): string | null {
  if (url.startsWith(API_BASE_URL)) return url.slice(API_BASE_URL.length) || null;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return null;
}

function load(url: string): Promise<string> {
  let hit = cache.get(url);
  if (!hit) {
    const path = toApiPath(url);
    hit = path
      ? api
          .get(path, { responseType: "blob" })
          .then((r) => URL.createObjectURL(r.data as Blob))
      : Promise.reject(new Error("Unsupported image URL"));
    // failures are not cached, so the next mount retries
    hit.catch(() => cache.delete(url));
    cache.set(url, hit);
  }
  return hit;
}

/** Call after uploading or removing an image so every <Avatar>/<OrgLogo> reloads. */
export function invalidateImages() {
  cache.clear();
  listeners.forEach((l) => l());
}

/** Object URL for a protected image, or null while loading, when absent or on error. */
export function useProtectedImage(url?: string | null): string | null {
  const [state, setState] = useState<{ url: string; src: string } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    listeners.add(bump);
    return () => {
      listeners.delete(bump);
    };
  }, []);

  useEffect(() => {
    if (!url) return;
    let active = true;
    load(url)
      .then((src) => {
        if (active) setState({ url, src });
      })
      .catch(() => {
        if (active) setState(null);
      });
    return () => {
      active = false;
    };
  }, [url, tick]);

  return url && state?.url === url ? state.src : null;
}
