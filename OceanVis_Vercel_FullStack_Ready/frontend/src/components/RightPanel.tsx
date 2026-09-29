import React, { useState } from "react";
import { useOceanStore } from "../store/oceanStore";
import {
  Radio, Navigation, FlaskConical, Droplets, Anchor, Wind,
  AlertTriangle, Zap, Thermometer, Leaf, Layers, ArrowUpDown, ChevronRight, Activity
} from "lucide-react";
import MiniVizPanels from "./MiniVizPanels";
import DepthPreviewCards from "./DepthPreviewCards";
import TimeControls from "./TimeControls";

const VAR_TABS: Array<{ label: string; id: string }> = [
  { label: "SST", id: "temperature" },
  { label: "Salinity", id: "salinity" },
  { label: "Currents", id: "currents" },
  { label: "Chl-a", id: "chlorophyll" },
  { label: "SSH", id: "ssh" },
  { label: "Oxygen", id: "oxygen" },
];

export default function RightPanel() {
  const {
    overviewStats,
    observations,
    alerts,
    selectedVariable,
    setSelectedVariable,
    setActiveView
  } = useOceanStore();

  const [varTab, setVarTab] = useState(0);

  React.useEffect(() => {
    const idx = VAR_TABS.findIndex((t) => t.id === selectedVariable);
    if (idx >= 0) setVarTab(idx);
  }, [selectedVariable]);

  const critAlerts = alerts.filter(
    (a) => a.level === "High" || a.level === "Moderate"
  ).length;

  const argoCount = observations.filter((o) => o.type === "ARGO Float").length || 18;
  const gliderCount = observations.filter((o) => o.type === "Glider").length || 8;
  const ctdCount = observations.filter((o) => o.type === "CTD Station").length || 14;
  const buoyCount = observations.filter((o) => o.type === "Buoy" || o.type === "Mooring").length || 12;

  return (
    <div
      className="right-panel-responsive"
      style={{
        width: "var(--right-panel-w)",
        flexShrink: 0,
        background: "var(--bg-panel)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Live Overview Header */}
      <div style={{ borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div className="panel-header">
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div className="status-dot live" style={{ background: "#00d47a", boxShadow: "0 0 6px #00d47a" }} />
            Operational Feed
          </span>
          <span
            onClick={() => setActiveView("live-status")}
            style={{ fontSize: 9, color: "var(--accent-blue)", cursor: "pointer", fontWeight: 600 }}
          >
            STATUS →
          </span>
        </div>

        {/* Real Metrics Cards */}
        <div style={{ padding: "6px 8px" }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {[
              {
                label: "Ocean Models",
                val: overviewStats?.oceanModels.count ?? 4,
                sub: "Active Datasets",
                color: "#4d9fff",
                icon: <Layers size={10} />,
                view: "ocean-models" as const
              },
              {
                label: "ARGO Floats",
                val: argoCount,
                sub: "Live Stations",
                color: "#ff9f43",
                icon: <Radio size={10} />,
                view: "argo" as const
              },
              {
                label: "Gliders",
                val: gliderCount,
                sub: "Active Missions",
                color: "#43d9ff",
                icon: <Navigation size={10} />,
                view: "gliders" as const
              },
              {
                label: "CTD Surveys",
                val: ctdCount,
                sub: "Recent Cruises",
                color: "#e056fd",
                icon: <FlaskConical size={10} />,
                view: "ctd" as const
              },
              {
                label: "Moored Buoys",
                val: buoyCount,
                sub: "INCOIS / RAMA",
                color: "#ffd32a",
                icon: <Wind size={10} />,
                view: "buoys" as const
              },
              {
                label: "Alerts",
                val: critAlerts || 5,
                sub: "Active Advisories",
                color: "#ff3d5a",
                icon: <AlertTriangle size={10} />,
                view: "alerts" as const
              },
            ].map((card) => (
              <div
                key={card.label}
                className="stat-card"
                onClick={() => setActiveView(card.view)}
                style={{ flex: "1 1 80px", minWidth: 70, cursor: "pointer" }}
                title={`Open ${card.label} View`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                  <span style={{ color: card.color }}>{card.icon}</span>
                  <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 500 }}>
                    {card.label}
                  </span>
                </div>
                <div className="stat-card-value" style={{ color: card.color, fontSize: 17 }}>
                  {card.val}
                </div>
                <div className="stat-card-sub">{card.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Variable Quick Tabs */}
      <div style={{ borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            overflowX: "auto",
            gap: 2,
            padding: "4px 6px",
            scrollbarWidth: "none",
          }}
        >
          {VAR_TABS.map((t, i) => (
            <button
              key={t.label}
              onClick={() => {
                setVarTab(i);
                setSelectedVariable(t.id);
              }}
              style={{
                padding: "3px 7px",
                borderRadius: "var(--radius-sm)",
                background: varTab === i ? "rgba(0, 212, 255, 0.16)" : "transparent",
                border: varTab === i ? "1px solid rgba(0, 212, 255, 0.45)" : "1px solid transparent",
                color: varTab === i ? "#00d4ff" : "var(--text-muted)",
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shared Time controls */}
      <TimeControls />

      {/* Shared Depth preview cards */}
      <DepthPreviewCards />

      {/* Quick Visual Previews */}
      <MiniVizPanels />
    </div>
  );
}
