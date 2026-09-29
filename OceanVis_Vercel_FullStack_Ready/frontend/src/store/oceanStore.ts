import { create } from "zustand";
import type { ActiveView, AppMode, Observation, Alert, DataSource, OverviewStats, Variable, ComparisonStats, ProfilePoint } from "../types";

export interface OceanState {
  // App
  mode: AppMode;
  activeView: ActiveView;
  isLoading: boolean;
  splashDone: boolean;

  // Data layers
  variables: Variable[];
  selectedVariable: string;
  obsLayersEnabled: Record<string, boolean>;
  layerOpacity: number;
  streamlinesEnabled: boolean;
  streamlineSpeed: number;
  tempUnit: "C" | "K";

  // Time
  timeIndex: number;
  timeAxis: { index: number; date: string; label: string }[];
  isPlaying: boolean;
  playSpeed: number;

  // Depth
  depthIndex: number;
  depthAxis: number[];

  // 3D & 2D
  vizMode: string;
  selectedRegion: string;
  searchQuery: string;

  // Data
  observations: Observation[];
  importedObservations: Observation[];
  alerts: Alert[];
  dataSources: DataSource[];
  dataStatus: Record<string, unknown> | null;
  overviewStats: OverviewStats | null;
  selectedObservation: Observation | null;
  profileData: ProfilePoint[] | null;
  comparisonStats: ComparisonStats | null;

  // Actions
  setMode: (mode: AppMode) => void;
  setActiveView: (view: ActiveView) => void;
  setSplashDone: (done: boolean) => void;
  setSelectedVariable: (id: string) => void;
  toggleObsLayer: (type: string) => void;
  setLayerOpacity: (opacity: number) => void;
  setStreamlinesEnabled: (enabled: boolean) => void;
  toggleStreamlines: () => void;
  setStreamlineSpeed: (speed: number) => void;
  setTempUnit: (unit: "C" | "K") => void;
  setTimeIndex: (idx: number) => void;
  setDepthIndex: (idx: number) => void;
  setVizMode: (mode: string) => void;
  setSelectedRegion: (region: string) => void;
  setSearchQuery: (query: string) => void;
  setObservations: (obs: Observation[]) => void;
  addImportedObservations: (obs: Observation[]) => void;
  setAlerts: (alerts: Alert[]) => void;
  setDataSources: (sources: DataSource[]) => void;
  setDataStatus: (status: Record<string, unknown> | null) => void;
  setOverviewStats: (stats: OverviewStats) => void;
  setSelectedObservation: (obs: Observation | null) => void;
  setProfileData: (data: ProfilePoint[] | null) => void;
  setComparisonStats: (stats: ComparisonStats | null) => void;
  setVariables: (vars: Variable[]) => void;
  toggleVariable: (id: string) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaySpeed: (speed: number) => void;
  setTimeAxis: (axis: { index: number; date: string; label: string }[]) => void;
  setDepthAxis: (axis: number[]) => void;
}

const DEFAULT_VARIABLES: Variable[] = [
  { id: "temperature", name: "Sea Surface Temperature", unit: "°C", min: 16, max: 32, colormap: "thermal", enabled: true },
  { id: "salinity", name: "Salinity", unit: "PSU", min: 30, max: 38, colormap: "haline", enabled: false },
  { id: "currents", name: "Currents (U/V)", unit: "m/s", min: 0, max: 2.5, colormap: "speed", enabled: false },
  { id: "chlorophyll", name: "Chlorophyll-a", unit: "mg/m³", min: 0.01, max: 3.5, colormap: "algae", enabled: false },
  { id: "mld", name: "Mixed Layer Depth", unit: "m", min: 10, max: 120, colormap: "deep", enabled: false },
  { id: "ssh", name: "Sea Surface Height", unit: "m", min: -0.5, max: 0.5, colormap: "balance", enabled: false },
  { id: "oxygen", name: "Dissolved Oxygen", unit: "µmol/kg", min: 20, max: 260, colormap: "matter", enabled: false },
  { id: "nutrients", name: "Nutrients", unit: "µmol/L", min: 0, max: 35, colormap: "turbid", enabled: false },
];

const DEFAULT_DEPTH_AXIS = [0, 10, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000];

function generateDefaultTimeAxis() {
  const now = new Date();
  const axis = [];
  for (let i = -4; i <= 2; i++) {
    const d = new Date(now.getTime() + i * 3 * 86400000);
    const iso = d.toISOString().slice(0, 10);
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const day = String(d.getDate()).padStart(2, "0");
    axis.push({ index: i + 4, date: iso, label: `${month} ${day}` });
  }
  return axis;
}

export const useOceanStore = create<OceanState>((set) => ({
  mode: "LIVE",
  activeView: "overview",
  isLoading: false,
  splashDone: false,
  variables: DEFAULT_VARIABLES,
  selectedVariable: "temperature",
  layerOpacity: 85,
  streamlinesEnabled: true,
  streamlineSpeed: 1.0,
  tempUnit: "C",
  obsLayersEnabled: {
    "ARGO Float": true,
    Glider: true,
    "CTD Station": true,
    "BGC Sensor": true,
    Mooring: true,
    Buoy: true,
  },
  timeIndex: 4,
  timeAxis: generateDefaultTimeAxis(),
  isPlaying: false,
  playSpeed: 1,
  depthIndex: 0,
  depthAxis: DEFAULT_DEPTH_AXIS,
  vizMode: "surface",
  selectedRegion: "Indian Ocean",
  searchQuery: "",
  observations: [],
  importedObservations: [],
  alerts: [],
  dataSources: [],
  dataStatus: null,
  overviewStats: null,
  selectedObservation: null,
  profileData: null,
  comparisonStats: null,

  setMode: (mode) => set({ mode }),
  setActiveView: (activeView) => set({ activeView }),
  setSplashDone: (splashDone) => set({ splashDone }),
  setSelectedVariable: (id) => set({ selectedVariable: id }),
  setLayerOpacity: (layerOpacity) => set({ layerOpacity }),
  setStreamlinesEnabled: (streamlinesEnabled) => set({ streamlinesEnabled }),
  toggleStreamlines: () => set((s) => ({ streamlinesEnabled: !s.streamlinesEnabled })),
  setStreamlineSpeed: (streamlineSpeed) => set({ streamlineSpeed }),
  setTempUnit: (tempUnit) => set({ tempUnit }),
  toggleObsLayer: (type) => set((s) => ({
    obsLayersEnabled: { ...s.obsLayersEnabled, [type]: !s.obsLayersEnabled[type] }
  })),
  setTimeIndex: (timeIndex) => set({ timeIndex }),
  setDepthIndex: (depthIndex) => set({ depthIndex }),
  setVizMode: (vizMode) => set({ vizMode }),
  setSelectedRegion: (selectedRegion) => set({ selectedRegion }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setObservations: (observations) => set({ observations }),
  addImportedObservations: (obs) => set((s) => ({
    importedObservations: [...s.importedObservations, ...obs],
    observations: [...s.observations, ...obs],
  })),
  setAlerts: (alerts) => set({ alerts }),
  setDataSources: (dataSources) => set({ dataSources }),
  setDataStatus: (dataStatus) => set({ dataStatus }),
  setOverviewStats: (overviewStats) => set({ overviewStats }),
  setSelectedObservation: (selectedObservation) => set({ selectedObservation }),
  setProfileData: (profileData) => set({ profileData }),
  setComparisonStats: (comparisonStats) => set({ comparisonStats }),
  setVariables: (variables) => set({ variables }),
  toggleVariable: (id) => set((s) => ({
    variables: s.variables.map((v) => v.id === id ? { ...v, enabled: !v.enabled } : v),
    selectedVariable: id,
  })),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPlaySpeed: (playSpeed) => set({ playSpeed }),
  setTimeAxis: (timeAxis) => set({ timeAxis }),
  setDepthAxis: (depthAxis) => set({ depthAxis }),
}));
