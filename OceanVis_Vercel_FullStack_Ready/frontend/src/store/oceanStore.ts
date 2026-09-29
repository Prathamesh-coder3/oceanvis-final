import { create } from "zustand";
import type { ActiveView, AppMode, Observation, Alert, DataSource, OverviewStats, Variable, ComparisonStats, ProfilePoint } from "../types";

interface OceanState {
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

  // Time
  timeIndex: number;
  timeAxis: { index: number; date: string; label: string }[];
  isPlaying: boolean;
  playSpeed: number;

  // Depth
  depthIndex: number;
  depthAxis: number[];

  // 3D
  vizMode: string;
  selectedRegion: string;

  // Data
  observations: Observation[];
  alerts: Alert[];
  dataSources: DataSource[];
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
  setTimeIndex: (idx: number) => void;
  setDepthIndex: (idx: number) => void;
  setVizMode: (mode: string) => void;
  setSelectedRegion: (region: string) => void;
  setObservations: (obs: Observation[]) => void;
  setAlerts: (alerts: Alert[]) => void;
  setDataSources: (sources: DataSource[]) => void;
  setOverviewStats: (stats: OverviewStats) => void;
  setSelectedObservation: (obs: Observation | null) => void;
  setProfileData: (data: ProfilePoint[] | null) => void;
  setComparisonStats: (stats: ComparisonStats | null) => void;
  setVariables: (vars: Variable[]) => void;
  toggleVariable: (id: string) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaySpeed: (speed: number) => void;
  setTimeAxis: (axis: { index: number; date: string; label: string }[]) => void;
}

const DEFAULT_VARIABLES: Variable[] = [
  { id: "temperature", name: "Sea Surface Temperature", unit: "°C", min: 18, max: 31, colormap: "thermal", enabled: true },
  { id: "salinity", name: "Salinity", unit: "PSU", min: 32, max: 38, colormap: "haline", enabled: false },
  { id: "currents", name: "Currents (U/V)", unit: "m/s", min: 0, max: 2, colormap: "speed", enabled: false },
  { id: "chlorophyll", name: "Chlorophyll-a", unit: "mg/m³", min: 0.01, max: 3, colormap: "algae", enabled: false },
  { id: "mld", name: "Mixed Layer Depth", unit: "m", min: 10, max: 120, colormap: "deep", enabled: false },
  { id: "ssh", name: "Sea Surface Height", unit: "m", min: -0.5, max: 0.5, colormap: "balance", enabled: false },
  { id: "oxygen", name: "Dissolved Oxygen", unit: "μmol/kg", min: 150, max: 280, colormap: "matter", enabled: false },
  { id: "nutrients", name: "Nutrients", unit: "μmol/L", min: 0, max: 30, colormap: "turbid", enabled: false },
];

const DEFAULT_DEPTH_AXIS = [0, 10, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000];

export const useOceanStore = create<OceanState>((set) => ({
  mode: "DEMO",
  activeView: "overview",
  isLoading: false,
  splashDone: false,
  variables: DEFAULT_VARIABLES,
  selectedVariable: "temperature",
  layerOpacity: 80,
  obsLayersEnabled: {
    "ARGO Float": true, Glider: true, "CTD Station": true,
    "BGC Sensor": true, Mooring: true, Buoy: true,
  },
  timeIndex: 2,
  timeAxis: [
    { index: 0, date: "2024-01-01", label: "Jan 01" },
    { index: 1, date: "2024-01-08", label: "Jan 08" },
    { index: 2, date: "2024-01-15", label: "Jan 15" },
    { index: 3, date: "2024-01-22", label: "Jan 22" },
    { index: 4, date: "2024-02-01", label: "Feb 01" },
    { index: 5, date: "2024-02-08", label: "Feb 08" },
    { index: 6, date: "2024-02-15", label: "Feb 15" },
  ],
  isPlaying: false,
  playSpeed: 1,
  depthIndex: 0,
  depthAxis: DEFAULT_DEPTH_AXIS,
  vizMode: "surface",
  selectedRegion: "Indian Ocean",
  observations: [],
  alerts: [],
  dataSources: [],
  overviewStats: null,
  selectedObservation: null,
  profileData: null,
  comparisonStats: null,

  setMode: (mode) => set({ mode }),
  setActiveView: (activeView) => set({ activeView }),
  setSplashDone: (splashDone) => set({ splashDone }),
  setSelectedVariable: (id) => set({ selectedVariable: id }),
  setLayerOpacity: (layerOpacity) => set({ layerOpacity }),
  toggleObsLayer: (type) => set((s) => ({
    obsLayersEnabled: { ...s.obsLayersEnabled, [type]: !s.obsLayersEnabled[type] }
  })),
  setTimeIndex: (timeIndex) => set({ timeIndex }),
  setDepthIndex: (depthIndex) => set({ depthIndex }),
  setVizMode: (vizMode) => set({ vizMode }),
  setSelectedRegion: (selectedRegion) => set({ selectedRegion }),
  setObservations: (observations) => set({ observations }),
  setAlerts: (alerts) => set({ alerts }),
  setDataSources: (dataSources) => set({ dataSources }),
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
}));
