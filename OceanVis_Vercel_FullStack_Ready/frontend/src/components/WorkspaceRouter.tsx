import React, { useEffect } from "react";
import { useOceanStore } from "../store/oceanStore";
import GlobeView from "./GlobeView";
import MapView2D from "./MapView2D";
import SettingsPanel from "./SettingsPanel";
import HelpPanel from "./HelpPanel";
import AlertsPanel from "./panels/AlertsPanel";
import ComparisonPanel from "./panels/ComparisonPanel";
import ProfilePanel from "./panels/ProfilePanel";
import TimeSeriesPanel from "./panels/TimeSeriesPanel";
import TransectPanel from "./panels/TransectPanel";
import ImportPanel from "./panels/ImportPanel";
import ExportPanel from "./panels/ExportPanel";
import type { ActiveView } from "../types";
import { BarChart3, Database, Gauge, Layers, Radio, Settings, HelpCircle, Waves, Activity, FileText, Satellite, Upload, Network, GitBranch, Box, Zap, Wind, TrendingUp, ArrowLeftRight, Clock, Crosshair, Globe2, Map } from "lucide-react";

interface WorkspaceSpec { title: string; subtitle: string; icon: React.ReactNode; }
const SPECS: Partial<Record<ActiveView, WorkspaceSpec>> = {
  overview: { title: "OceanVis Command Center", subtitle: "Integrated ocean model and in-situ observation monitoring", icon: <Gauge size={18} /> },
  "live-status": { title: "Live Data Status", subtitle: "Provider availability and data-state diagnostics", icon: <Activity size={18} /> },
  conditions: { title: "Ocean Conditions", subtitle: "Current variable, depth and time context", icon: <Waves size={18} /> },
  dashboard: { title: "Monitoring Dashboard", subtitle: "Mission-control overview", icon: <Gauge size={18} /> },
  "ocean-models": { title: "Ocean Models", subtitle: "Available model datasets and fields", icon: <Satellite size={18} /> },
  argo: { title: "ARGO Floats", subtitle: "Profiling float observations", icon: <Radio size={18} /> },
  gliders: { title: "Gliders", subtitle: "Mobile platform observations", icon: <TrendingUp size={18} /> },
  ctd: { title: "CTD Stations", subtitle: "Conductivity, temperature and depth profiles", icon: <Database size={18} /> },
  bgc: { title: "BGC Sensors", subtitle: "Biogeochemical observations", icon: <Layers size={18} /> },
  moorings: { title: "Moorings", subtitle: "Fixed-point observations", icon: <Radio size={18} /> },
  buoys: { title: "Buoys", subtitle: "Station observations", icon: <Wind size={18} /> },
  imported: { title: "Imported Data", subtitle: "CSV / TSV / NetCDF workflow", icon: <Upload size={18} /> },
  variables: { title: "Variables & Layers", subtitle: "Control active variables and observation overlays", icon: <Layers size={18} /> },
  "depth-explorer": { title: "Depth Explorer", subtitle: "Explore vertical ocean structure", icon: <ArrowLeftRight size={18} /> },
  "time-explorer": { title: "Time Explorer", subtitle: "Move through the shared timeline", icon: <Clock size={18} /> },
  "volume-3d": { title: "3D Volume", subtitle: "Explore the 3D field", icon: <Box size={18} /> },
  isosurface: { title: "Isosurface", subtitle: "Explore a threshold surface", icon: <Zap size={18} /> },
  currents: { title: "Current Vectors", subtitle: "Explore directional flow", icon: <Wind size={18} /> },
  "obs-tracks": { title: "Observation Tracks", subtitle: "Explore observation trajectories", icon: <TrendingUp size={18} /> },
  statistics: { title: "Statistics", subtitle: "Runtime comparison statistics", icon: <BarChart3 size={18} /> },
  netcdf: { title: "NetCDF / CF", subtitle: "Scientific data and metadata", icon: <Database size={18} /> },
  wms: { title: "WMS", subtitle: "Map-service interoperability", icon: <Network size={18} /> },
  wcs: { title: "WCS", subtitle: "Coverage-service interoperability", icon: <GitBranch size={18} /> },
  reports: { title: "Reports", subtitle: "Exportable scientific summaries", icon: <FileText size={18} /> },
};

function RoutedGlobe({ mode }: { mode: string }) {
  const setVizMode = useOceanStore(s => s.setVizMode);
  useEffect(() => {
    if (["surface","depth-slice","volume-3d","isosurface","currents","tracks"].includes(mode)) setVizMode(mode);
  }, [mode, setVizMode]);
  return (
    <div className="workspace-routed-visual">
      <div className="workspace-routed-title">{SPECS[mode as ActiveView]?.title ?? "Ocean Visualization"}</div>
      <GlobeView />
    </div>
  );
}

function WorkspaceInfo({ view }: { view: ActiveView }) {
  const spec = SPECS[view] ?? { title: "OceanVis Workspace", subtitle: "Interactive scientific workspace", icon: <Globe2 size={18} /> };
  return (
    <section className="workspace-page">
      <div className="workspace-page-card">
        <div className="workspace-page-icon">{spec.icon}</div>
        <div><div className="workspace-page-title">{spec.title}</div><div className="workspace-page-subtitle">{spec.subtitle}</div></div>
      </div>
      <div className="workspace-page-grid">
        <div className="panel workspace-info-card">
          <div className="panel-header">Active Context</div>
          <div className="panel-body">
            <div className="workspace-context-row"><span>Data state</span><strong>PROTOTYPE DATA</strong></div>
            <div className="workspace-context-row"><span>Active view</span><strong>{view}</strong></div>
            <div className="workspace-context-row"><span>Shared state</span><strong>TIME · DEPTH · VARIABLE</strong></div>
            <div className="workspace-context-note">This workspace is connected to the same OceanVis state used by the 2D map, 3D globe and analysis panels.</div>
          </div>
        </div>
        <div className="panel workspace-info-card">
          <div className="panel-header">Quick Actions</div>
          <div className="panel-body workspace-action-list">
            <button className="btn btn-ghost" onClick={() => useOceanStore.getState().setActiveView("map-2d")}><Map size={13} /> Open 2D map</button>
            <button className="btn btn-ghost" onClick={() => useOceanStore.getState().setActiveView("globe-3d")}><Globe2 size={13} /> Open 3D globe</button>
            <button className="btn btn-ghost" onClick={() => useOceanStore.getState().setActiveView("comparison")}><BarChart3 size={13} /> Open comparison</button>
            <button className="btn btn-ghost" onClick={() => useOceanStore.getState().setActiveView("transect")}><Crosshair size={13} /> Open transect</button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function WorkspaceRouter() {
  const { activeView } = useOceanStore();
  switch (activeView) {
    case "map-2d": return <MapView2D />;
    case "globe-3d": return <GlobeView />;
    case "overview": return <GlobeView />;
    case "alerts": return <AlertsPanel />;
    case "comparison":
    case "statistics": return <ComparisonPanel />;
    case "transect": return <TransectPanel />;
    case "timeseries":
    case "time-explorer": return <TimeSeriesPanel />;
    case "depth-explorer": return <ProfilePanel />;
    case "export":
    case "reports": return <ExportPanel />;
    case "imported": return <ImportPanel />;
    case "settings": return <SettingsPanel />;
    case "help": return <HelpPanel />;
    case "volume-3d":
    case "isosurface":
    case "currents":
    case "obs-tracks": return <RoutedGlobe mode={activeView} />;
    default: return <WorkspaceInfo view={activeView} />;
  }
}
