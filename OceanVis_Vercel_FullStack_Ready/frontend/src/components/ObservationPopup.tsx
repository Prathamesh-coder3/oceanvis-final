import React from "react";
import { useOceanStore } from "../store/oceanStore";
import { X, BarChart2, MapPin, Clock, ArrowDown, Database } from "lucide-react";
import { api } from "../services/api";

const TYPE_ICONS: Record<string, string> = {
  "ARGO Float": "🟠", "Glider": "🔵", "CTD Station": "🔴", "BGC Sensor": "🟢", "Mooring": "🟡", "Buoy": "🟣"
};

export default function ObservationPopup() {
  const { selectedObservation, setSelectedObservation, setProfileData } = useOceanStore();
  if (!selectedObservation) return null;
  const obs = selectedObservation;

  const handleViewProfile = async () => {
    const profile = await api.profile(obs.id) as { profile: import("../types").ProfilePoint[] };
    setProfileData(profile.profile);
  };

  return (
    <div style={{
      position: "absolute", top: "50%", left: "50%",
      transform: "translate(-50%, -50%)", zIndex: 100,
    }}>
      <div className="tooltip-popup animate-fade-in" style={{ minWidth: 240 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 18 }}>{TYPE_ICONS[obs.type]}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-bright)" }}>{obs.id}</div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{obs.type}</div>
          </div>
          <button className="btn-icon" onClick={() => setSelectedObservation(null)}><X size={12} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
          {[
            { icon: <MapPin size={10} />, label: "Latitude", val: `${Math.abs(obs.lat).toFixed(2)}°${obs.lat >= 0 ? "N" : "S"}` },
            { icon: <MapPin size={10} />, label: "Longitude", val: `${Math.abs(obs.lon).toFixed(2)}°${obs.lon >= 0 ? "E" : "W"}` },
            { icon: <Clock size={10} />, label: "Date", val: obs.date },
            { icon: <ArrowDown size={10} />, label: "Max Depth", val: `${obs.maxDepth} m` },
          ].map(f => (
            <div key={f.label} style={{ background: "var(--bg-card)", borderRadius: "var(--radius-sm)", padding: "5px 8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2, color: "var(--text-muted)" }}>
                {f.icon}<span style={{ fontSize: 9 }}>{f.label}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{f.val}</div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 4 }}>AVAILABLE VARIABLES</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {obs.variables.map(v => (
              <span key={v} style={{
                fontSize: 9, padding: "2px 6px", background: "var(--accent-blue)22",
                border: "1px solid var(--accent-blue)44", borderRadius: 3, color: "var(--accent-blue)"
              }}>{v}</span>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleViewProfile}>
          <BarChart2 size={12} /> View Profile →
        </button>
      </div>
    </div>
  );
}
