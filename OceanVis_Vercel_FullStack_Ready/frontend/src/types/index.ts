export type AppMode = "DEMO" | "REAL";

export interface Variable {
  id: string;
  name: string;
  unit: string;
  min: number;
  max: number;
  colormap: string;
  enabled: boolean;
}

export interface Observation {
  id: string;
  type: "ARGO Float" | "Glider" | "CTD Station" | "BGC Sensor" | "Mooring" | "Buoy";
  lat: number;
  lon: number;
  date: string;
  maxDepth: number;
  variables: string[];
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  level: "High" | "Moderate" | "Info" | "Low";
  region: string;
  time: string;
  category: string;
  isDemo: boolean;
}

export interface DataSource {
  id: string;
  type: string;
  status: "LIVE" | "AVAILABLE" | "UNAVAILABLE" | "ERROR" | "DEMO";
  description: string;
}

export interface DepthLevel {
  index: number;
  depth: number;
  label: string;
}

export interface TimeStep {
  index: number;
  date: string;
  label: string;
}

export interface ProfilePoint {
  depth: number;
  temperatureObs: number;
  temperatureModel: number;
  salinityObs: number;
  salinityModel: number;
  oxygenObs: number;
  oxygenModel: number;
}

export interface ComparisonStats {
  bias: number;
  mae: number;
  rmse: number;
  correlation: number;
}

export interface VisualizationMode {
  id: string;
  label: string;
  icon: string;
}

export type ActiveView =
  | "overview" | "map-2d" | "globe-3d" | "alerts" | "live-status"
  | "conditions" | "dashboard" | "ocean-models" | "argo" | "gliders"
  | "ctd" | "bgc" | "moorings" | "buoys" | "imported"
  | "variables" | "depth-explorer" | "time-explorer" | "volume-3d"
  | "isosurface" | "currents" | "obs-tracks" | "comparison"
  | "transect" | "timeseries" | "statistics" | "netcdf" | "wms" | "wcs"
  | "export" | "reports" | "settings" | "help";

export interface OverviewStats {
  oceanModels: { count: number; label: string };
  argoFloats: { count: number; label: string };
  gliders: { count: number; label: string };
  ctdStations: { count: number; label: string };
  buoys: { count: number; label: string };
  activeAlerts: { count: number; label: string };
  bgcSensors: { count: number; label: string };
}
