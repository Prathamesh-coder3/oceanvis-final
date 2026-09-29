import React, { useState } from "react";
import { useOceanStore } from "../store/oceanStore";
import { Radio, Navigation, FlaskConical, Droplets, Anchor, Wind, AlertTriangle, Zap, Thermometer, Leaf, Layers, ArrowUpDown, ChevronRight } from "lucide-react";
import MiniVizPanels from "./MiniVizPanels";
import DepthPreviewCards from "./DepthPreviewCards";
import TimeControls from "./TimeControls";

const DEPTH_LABELS = ["Surface\n(0 m)", "50 m", "100 m", "200 m", "500 m", "1000 m"];
const DEPTH_VALUES = [0, 50, 100, 200, 500, 1000];

const VAR_TABS: Array<{label: string; id?: string}> = [
  { label: "Sea Surface Temperature", id: "temperature" },
  { label: "Chlorophyll-a", id: "chlorophyll" },
  { label: "Salinity", id: "salinity" },
  { label: "Currents", id: "currents" },
  { label: "Sea Surface Height", id: "ssh" },
  { label: "More" },
];

export default function RightPanel() {
  const { overviewStats, observations, alerts, depthIndex, setDepthIndex, depthAxis, selectedVariable, variables, setSelectedVariable } = useOceanStore();
  const [varTab, setVarTab] = useState(0);

  const obs = overviewStats;
  React.useEffect(() => {
    const idx = VAR_TABS.findIndex(t => t.id === selectedVariable);
    if (idx >= 0) setVarTab(idx);
  }, [selectedVariable]);
  const critAlerts = alerts.filter(a => a.level === "High" || a.level === "Moderate").length;

  return (
    <div className="right-panel-responsive" style={{
      width: "var(--right-panel-w)", flexShrink: 0,
      background: "var(--bg-panel)", borderLeft: "1px solid var(--border)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Live Overview */}
      <div style={{ borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div className="panel-header">
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div className="status-dot live" />
            Live Overview
          </span>
          <span style={{ fontSize: 9, color: "var(--text-muted)" }}>PROTOTYPE</span>
        </div>
        <div style={{ padding: "6px 8px" }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {[
              { label: "Ocean Models", val: obs?.oceanModels.count ?? 3, sub: "Active Datasets", color: "#4d9fff", icon: <Layers size={10} /> },
              { label: "ARGO Floats", val: obs?.argoFloats.count ?? observations.filter(o => o.type === "ARGO Float").length, sub: "Live Stations", color: "#ff6b35", icon: <Radio size={10} /> },
              { label: "Gliders", val: obs?.gliders.count ?? observations.filter(o => o.type === "Glider").length, sub: "Active Missions", color: "#4d9fff", icon: <Navigation size={10} /> },
              { label: "CTD Stations", val: obs?.ctdStations.count ?? observations.filter(o => o.type === "CTD Station").length, sub: "Recent Profiles", color: "#ff3d9e", icon: <FlaskConical size={10} /> },
              { label: "Buoys", val: obs?.buoys.count ?? observations.filter(o => o.type === "Buoy").length, sub: "Live Stations", color: "#a855f7", icon: <Wind size={10} /> },
              { label: "Active Alerts", val: obs?.activeAlerts.count ?? critAlerts, sub: "View Alerts →", color: "#ff3d5a", icon: <AlertTriangle size={10} /> },
            ].map(card => (
              <div key={card.label} className="stat-card" style={{ flex: "1 1 80px", minWidth: 70 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                  <span style={{ color: card.color }}>{card.icon}</span>
                  <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 500 }}>{card.label}</span>
                </div>
                <div className="stat-card-value" style={{ color: card.color, fontSize: 18 }}>{card.val}</div>
                <div className="stat-card-sub">{card.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Variable tabs */}
      <div style={{ borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{
          display: "flex", overflowX: "auto", gap: 2,
          padding: "4px 6px", scrollbarWidth: "none",
        }}>
          {VAR_TABS.map((t, i) => (
            <button
              key={t.label}
              onClick={() => {
                setVarTab(i);
                if (t.id) setSelectedVariable(t.id);
              }}
              style={{
                padding: "4px 8px", borderRadius: "var(--radius-sm)",
                background: varTab === i ? "var(--accent-blue)22" : "transparent",
                border: varTab === i ? "1px solid var(--accent-blue)44" : "1px solid transparent",
                color: varTab === i ? "var(--accent-blue)" : "var(--text-muted)",
                fontSize: 10, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* Time controls */}
      <TimeControls />

      {/* Depth preview cards */}
      <DepthPreviewCards />

      {/* Mini viz panels */}
      <MiniVizPanels />
    </div>
  );
}
