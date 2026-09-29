import React, { useState } from "react";
import { Settings, RefreshCw, CheckCircle, Database, Eye, Compass, Sliders, Globe } from "lucide-react";
import { useOceanStore } from "../store/oceanStore";
import { api } from "../services/api";

const PRESET_REGIONS = [
  "Arabian Sea",
  "Bay of Bengal",
  "Indian Ocean",
  "Custom Region",
];

export default function SettingsPanel() {
  const {
    streamlinesEnabled,
    setStreamlinesEnabled,
    layerOpacity,
    setLayerOpacity,
    selectedRegion,
    setSelectedRegion,
    tempUnit,
    setTempUnit,
    setObservations,
    setDataStatus,
  } = useOceanStore();

  const [refreshing, setRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const handleRefreshCache = async () => {
    setRefreshing(true);
    try {
      const [obs, status] = await Promise.all([
        api.observations(),
        api.dataStatus(),
      ]);
      if (Array.isArray(obs)) setObservations(obs as any);
      if (status) setDataStatus(status);
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 2500);
    } catch (e) {
      console.error("Cache refresh error:", e);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "30px 20px", color: "var(--text-secondary)", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Settings size={28} color="var(--accent-blue)" />
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>System Settings & Preferences</h2>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24, textAlign: "center" }}>
        Configure operational ocean data ingestion, rendering physics, and display preferences.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 520 }}>
        {/* Streamlines setting */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <Compass size={14} color="var(--accent-cyan)" /> Ocean Current Streamlines
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Animate geostrophic surface velocity streamlines & gyres</div>
          </div>
          <button
            onClick={() => setStreamlinesEnabled(!streamlinesEnabled)}
            className="btn btn-ghost"
            style={{
              padding: "4px 12px",
              fontSize: 11,
              background: streamlinesEnabled ? "var(--accent-blue)33" : "transparent",
              color: streamlinesEnabled ? "var(--accent-blue)" : "var(--text-muted)",
              border: `1px solid ${streamlinesEnabled ? "var(--accent-blue)" : "var(--border)"}`
            }}
          >
            {streamlinesEnabled ? "ENABLED" : "DISABLED"}
          </button>
        </div>

        {/* Temperature unit */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <Sliders size={14} color="#ffd11a" /> Temperature Display Unit
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Celsius (°C) or Thermodynamic Kelvin (K)</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {(["C", "K"] as const).map(u => (
              <button
                key={u}
                onClick={() => setTempUnit(u)}
                className="btn btn-ghost"
                style={{
                  padding: "4px 10px",
                  fontSize: 11,
                  background: tempUnit === u ? "var(--accent-blue)33" : "transparent",
                  color: tempUnit === u ? "var(--accent-blue)" : "var(--text-muted)",
                  border: `1px solid ${tempUnit === u ? "var(--accent-blue)" : "var(--border)"}`
                }}
              >
                {u === "C" ? "°C" : "K"}
              </button>
            ))}
          </div>
        </div>

        {/* Layer opacity */}
        <div style={{ padding: "12px 16px", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <Eye size={14} color="var(--accent-emerald)" /> Ocean Field Layer Opacity
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-cyan)" }}>{layerOpacity}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={layerOpacity}
            onChange={(e) => setLayerOpacity(parseInt(e.target.value, 10))}
            style={{ width: "100%", accentColor: "var(--accent-cyan)" }}
          />
        </div>

        {/* Default Region */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <Globe size={14} color="var(--accent-blue)" /> Active Oceanic Region
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Current bounding domain for analysis</div>
          </div>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            style={{
              padding: "4px 8px",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: 11
            }}
          >
            {PRESET_REGIONS.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* Ingestion & Backend Gateway */}
        <div style={{ padding: "14px 16px", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <Database size={14} color="var(--accent-emerald)" /> Backend Data Gateway
            </span>
            <span className="badge badge-live" style={{ fontSize: 9 }}>CONNECTED</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>
            Relative route: <code style={{ color: "var(--accent-cyan)" }}>/api</code> (Vercel Serverless / Spring Boot)
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 12 }}>
            Data Feeds: Copernicus Marine Service Reanalysis · Open-Meteo API · Global Argo GDAC · INCOIS RAMA Array
          </div>
          <button
            onClick={handleRefreshCache}
            disabled={refreshing}
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: "5px 12px", width: "100%", justifyContent: "center", gap: 6 }}
          >
            {refreshSuccess ? (
              <>
                <CheckCircle size={13} color="var(--accent-emerald)" />
                <span style={{ color: "var(--accent-emerald)" }}>Telemetry Cache Synchronized!</span>
              </>
            ) : (
              <>
                <RefreshCw size={13} className={refreshing ? "spin" : ""} />
                {refreshing ? "Fetching Fresh Telemetry..." : "Flush Cache & Fetch Fresh Ocean Data"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
