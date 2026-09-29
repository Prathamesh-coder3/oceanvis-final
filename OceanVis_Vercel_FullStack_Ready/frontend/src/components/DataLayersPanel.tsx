import React, { useState } from "react";
import { useOceanStore } from "../store/oceanStore";
import { ChevronRight, Thermometer, Droplets, Wind, Leaf, Layers, ArrowDown, Zap, Radio, Navigation, FlaskConical, Anchor } from "lucide-react";

const VAR_ICONS: Record<string, React.ReactNode> = {
  temperature: <Thermometer size={12} color="#ff6b35" />,
  salinity: <Droplets size={12} color="#4d9fff" />,
  currents: <Wind size={12} color="#00d4ff" />,
  chlorophyll: <Leaf size={12} color="#00d47a" />,
  mld: <ArrowDown size={12} color="#a855f7" />,
  ssh: <Layers size={12} color="#ffd11a" />,
  oxygen: <Zap size={12} color="#ff3d9e" />,
  nutrients: <Droplets size={12} color="#00bfb3" />,
};

const OBS_ICONS: Record<string, React.ReactNode> = {
  "ARGO Float": <Radio size={12} color="#ff6b35" />,
  Glider: <Navigation size={12} color="#4d9fff" />,
  "CTD Station": <FlaskConical size={12} color="#ff3d9e" />,
  "BGC Sensor": <Leaf size={12} color="#00d47a" />,
  Mooring: <Anchor size={12} color="#ffd11a" />,
  Buoy: <Wind size={12} color="#a855f7" />,
};

export default function DataLayersPanel() {
  const { variables, selectedVariable, toggleVariable, obsLayersEnabled, toggleObsLayer, observations, layerOpacity, setLayerOpacity } = useOceanStore();
  const [tab, setTab] = useState<"models" | "observations">("models");

  const curVar = variables.find(v => v.id === selectedVariable);

  return (
    <div
      data-oceanvis-layer-panel="true"
      style={{
        width: "var(--layer-panel-w)", flexShrink: 0,
        background: "var(--bg-panel)", borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}
    >
      {/* Data Layers header */}
      <div className="panel-header" style={{ justifyContent: "flex-start", gap: 6 }}>
        <Layers size={13} color="var(--accent-blue)" />
        Data Layers
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ padding: "4px 6px 0" }}>
        <button className={`tab ${tab === "models" ? "active" : ""}`} onClick={() => setTab("models")}>Models</button>
        <button className={`tab ${tab === "observations" ? "active" : ""}`} onClick={() => setTab("observations")}>Observations</button>
      </div>

      <div className="overflow-y-auto" style={{ flex: 1 }}>
        {tab === "models" && (
          <div style={{ padding: "6px 4px" }}>
            {variables.map(v => (
              <div key={v.id}>
                <div
                  className="checkbox-row"
                  onClick={() => toggleVariable(v.id)}
                  style={{ padding: "5px 6px" }}
                >
                  <div className={`checkbox ${v.enabled || selectedVariable === v.id ? "checked" : ""}`}>
                    {(v.enabled || selectedVariable === v.id) && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                  <span style={{ flex: 0 }}>{VAR_ICONS[v.id]}</span>
                  <span className="checkbox-label truncate" style={{
                    color: selectedVariable === v.id ? "var(--text-primary)" : "var(--text-secondary)",
                    fontWeight: selectedVariable === v.id ? 600 : 400,
                  }}>{v.name}</span>
                  <ChevronRight size={11} color="var(--text-muted)" />
                </div>
                {selectedVariable === v.id && (
                  <div style={{
                    margin: "2px 8px 6px", padding: "6px 8px",
                    background: "var(--bg-card)", borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-accent)",
                  }}>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>
                      Range: {v.min} – {v.max} {v.unit}
                    </div>
                    <div className={`colormap-bar colormap-${v.colormap}`} style={{ marginBottom: 4 }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-muted)" }}>
                      <span>{v.min}</span><span>{v.unit}</span><span>{v.max}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "observations" && (
          <div style={{ padding: "6px 4px" }}>
            <div style={{ padding: "4px 6px 2px", fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.5px" }}>
              OBSERVATION TYPES
            </div>
            {Object.entries(OBS_ICONS).map(([type, icon]) => (
              <div
                key={type}
                className="checkbox-row"
                onClick={() => toggleObsLayer(type)}
                style={{ padding: "5px 6px" }}
              >
                <div className={`checkbox ${obsLayersEnabled[type] ? "checked" : ""}`}>
                  {obsLayersEnabled[type] && (
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
                <span>{icon}</span>
                <span className="checkbox-label truncate">{type}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{observations.filter(o => o.type === type).length}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Opacity control */}
      <div style={{ padding: "8px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Layer Opacity</span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>{layerOpacity}%</span>
        </div>
        <input
          type="range" min={0} max={100} value={layerOpacity}
          onChange={e => setLayerOpacity(Number(e.target.value))}
          className="slider"
        />

        {/* Colormap legend */}
        {curVar && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{curVar.name}</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{curVar.unit}</span>
            </div>
            <div className={`colormap-bar colormap-${curVar.colormap}`} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
              <span>{curVar.min}</span>
              <span>{((curVar.min + curVar.max) / 2).toFixed(1)}</span>
              <span>{curVar.max}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
