import React, { useState } from "react";
import { useOceanStore } from "../store/oceanStore";
import type { ActiveView } from "../types";
import {
  LayoutDashboard, Map, Globe2, Bell, Radio, Waves, BarChart3,
  Database, Anchor, Navigation, FlaskConical, Layers, Clock,
  TrendingUp, Crosshair, BarChart2, ArrowLeftRight, FileDown,
  FileText, Settings, HelpCircle, ChevronDown, ChevronRight,
  Activity, Satellite, Droplets, Wind, AlertTriangle, Zap,
  Network, Box, GitBranch, Gauge, Upload
} from "lucide-react";

interface NavItem {
  id: ActiveView;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    label: "OVERVIEW",
    items: [
      { id: "overview", label: "Overview", icon: <LayoutDashboard size={13} /> },
      { id: "map-2d", label: "2D Ocean Map", icon: <Map size={13} /> },
      { id: "globe-3d", label: "3D Ocean Globe", icon: <Globe2 size={13} /> },
    ],
  },
  {
    label: "MONITOR",
    items: [
      { id: "alerts", label: "Alerts & Notifications", icon: <Bell size={13} /> },
      { id: "live-status", label: "Live Data Status", icon: <Activity size={13} /> },
      { id: "conditions", label: "Ocean Conditions", icon: <Waves size={13} /> },
      { id: "dashboard", label: "Dashboard", icon: <Gauge size={13} /> },
    ],
  },
  {
    label: "DATA SOURCES",
    items: [
      { id: "ocean-models", label: "Ocean Models", icon: <Satellite size={13} /> },
      { id: "argo", label: "ARGO Floats", icon: <Radio size={13} /> },
      { id: "gliders", label: "Gliders", icon: <Navigation size={13} /> },
      { id: "ctd", label: "CTD Stations", icon: <FlaskConical size={13} /> },
      { id: "bgc", label: "BGC Sensors", icon: <Droplets size={13} /> },
      { id: "moorings", label: "Moorings", icon: <Anchor size={13} /> },
      { id: "buoys", label: "Buoys", icon: <Wind size={13} /> },
      { id: "imported", label: "Imported Data", icon: <Upload size={13} /> },
    ],
  },
  {
    label: "VISUALIZATION",
    items: [
      { id: "variables", label: "Variables & Layers", icon: <Layers size={13} /> },
      { id: "depth-explorer", label: "Depth Explorer", icon: <ArrowLeftRight size={13} /> },
      { id: "time-explorer", label: "Time Explorer", icon: <Clock size={13} /> },
      { id: "volume-3d", label: "3D Volume", icon: <Box size={13} /> },
      { id: "isosurface", label: "Isosurface", icon: <Zap size={13} /> },
      { id: "currents", label: "Current Vectors", icon: <Wind size={13} /> },
      { id: "obs-tracks", label: "Observation Tracks", icon: <TrendingUp size={13} /> },
    ],
  },
  {
    label: "ANALYSIS",
    items: [
      { id: "comparison", label: "Model vs Observation", icon: <BarChart2 size={13} /> },
      { id: "transect", label: "Transect Analysis", icon: <Crosshair size={13} /> },
      { id: "timeseries", label: "Time Series", icon: <TrendingUp size={13} /> },
      { id: "statistics", label: "Statistics", icon: <BarChart3 size={13} /> },
    ],
  },
  {
    label: "INTEROPERABILITY",
    items: [
      { id: "netcdf", label: "NetCDF / CF", icon: <Database size={13} /> },
      { id: "wms", label: "WMS", icon: <Network size={13} /> },
      { id: "wcs", label: "WCS", icon: <GitBranch size={13} /> },
    ],
  },
  {
    label: "OUTPUT",
    items: [
      { id: "export", label: "Export Data", icon: <FileDown size={13} /> },
      { id: "reports", label: "Reports", icon: <FileText size={13} /> },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { id: "settings", label: "Settings", icon: <Settings size={13} /> },
      { id: "help", label: "Help / Docs", icon: <HelpCircle size={13} /> },
    ],
  },
];

export default function Sidebar() {
  const { activeView, setActiveView } = useOceanStore();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (label: string) => setCollapsed(p => ({ ...p, [label]: !p[label] }));

  return (
    <aside className="sidebar">
      {/* User info */}
      <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%",
            background: "var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0
          }}>V</div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }} className="truncate">Vertrix</div>
            <div style={{ fontSize: 9, color: "var(--text-muted)" }} className="truncate">Team 131572</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="overflow-y-auto" style={{ flex: 1, padding: "6px 0" }}>
        {NAV.map(group => {
          const isCollapsed = collapsed[group.label];
          return (
            <div key={group.label} style={{ marginBottom: 2 }}>
              <button
                onClick={() => toggle(group.label)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "5px 10px",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-muted)", fontSize: 9, fontWeight: 700,
                  letterSpacing: "0.8px", textTransform: "uppercase",
                }}
              >
                <span>{group.label}</span>
                {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
              </button>
              {!isCollapsed && group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    width: "100%", padding: "5px 12px 5px 16px",
                    background: activeView === item.id ? "var(--bg-active)" : "none",
                    border: "none", cursor: "pointer", textAlign: "left",
                    borderLeft: activeView === item.id ? "2px solid var(--accent-blue)" : "2px solid transparent",
                    color: activeView === item.id ? "var(--text-accent)" : "var(--text-secondary)",
                    fontSize: 12, fontWeight: activeView === item.id ? 600 : 400,
                    transition: "var(--transition)",
                  }}
                  onMouseEnter={e => {
                    if (activeView !== item.id) {
                      (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (activeView !== item.id) {
                      (e.currentTarget as HTMLElement).style.background = "none";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                    }
                  }}
                >
                  <span style={{ opacity: activeView === item.id ? 1 : 0.7 }}>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Demo badge */}
      <div style={{ padding: "8px 10px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "center", letterSpacing: "0.5px" }}>
          PREVIEW DATA
        </div>
      </div>
    </aside>
  );
}
