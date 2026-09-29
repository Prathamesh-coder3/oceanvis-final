import axios from "axios";

const BASE = (import.meta.env.VITE_API_BASE_URL?.trim() || "/api").replace(/\/+$/, "");
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 30_000; // 30 seconds

function getCacheKey(url: string, params: Record<string, unknown> = {}): string {
  return url + JSON.stringify(params);
}

function fromCache(key: string): unknown | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function toCache(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() });
}

const pendingRequests = new Map<string, AbortController>();

async function get<T>(url: string, params: Record<string, unknown> = {}, dedupKey?: string): Promise<T> {
  const cacheKey = getCacheKey(url, params);
  const cached = fromCache(cacheKey);
  if (cached) return cached as T;

  if (dedupKey) {
    const prev = pendingRequests.get(dedupKey);
    if (prev) prev.abort();
    const ctrl = new AbortController();
    pendingRequests.set(dedupKey, ctrl);
    try {
      const res = await axios.get<T>(BASE + url, { params, signal: ctrl.signal });
      toCache(cacheKey, res.data);
      if (pendingRequests.get(dedupKey) === ctrl) pendingRequests.delete(dedupKey);
      return res.data;
    } catch (e: unknown) {
      if (pendingRequests.get(dedupKey) === ctrl) pendingRequests.delete(dedupKey);
      throw e;
    }
  }

  const res = await axios.get<T>(BASE + url, { params });
  toCache(cacheKey, res.data);
  return res.data;
}

export const api = {
  health: () => get<Record<string, unknown>>("/health"),
  dataStatus: () => get<Record<string, unknown>>("/data-status"),
  dataset: () => get<Record<string, unknown>>("/datasets"),
  observations: () => get<unknown[]>("/observations"),
  alerts: () => get<unknown[]>("/alerts"),
  sources: () => get<unknown[]>("/sources"),
  overview: () => get<Record<string, unknown>>("/overview"),
  modelSlice: (variable: string, depthIndex: number, timeIndex: number) =>
    get<unknown>("/model-slice", { variable, depthIndex, timeIndex }, `model-slice-${variable}-${depthIndex}-${timeIndex}`),
  profile: (id: string) => get<unknown>(`/profile/${encodeURIComponent(id)}`),
  comparison: (variable: string) =>
    get<unknown>("/comparison", { variable }, `comparison-${variable}`),
  timeseries: (variable: string, lat: number, lon: number) =>
    get<unknown>("/timeseries", { variable, lat, lon }, `timeseries-${variable}-${lat}-${lon}`),
  transect: (variable: string) =>
    get<unknown>("/transect", { variable }, `transect-${variable}`),
};

export function clearCache() {
  cache.clear();
}
