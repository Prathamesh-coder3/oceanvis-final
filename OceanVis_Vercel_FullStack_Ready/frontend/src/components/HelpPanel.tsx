import React from "react";
import { HelpCircle, Globe2, Map, BarChart2, Download } from "lucide-react";
export default function HelpPanel() {
  return (
    <div style={{ flex: 1, padding: 24, overflow: "auto", color: "var(--text-secondary)" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <HelpCircle size={28} color="var(--accent-blue)" />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-bright)" }}>OceanVis Help & Documentation</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Integrated Ocean Models & In-situ Observations — SIH26067</div>
          </div>
        </div>
        {[
          { icon: <Globe2 size={16} color="var(--accent-blue)" />, title: "3D Globe", desc: "Drag to rotate. Scroll to zoom. Click observations for details." },
          { icon: <Map size={16} color="#00d47a" />, title: "2D Map", desc: "Flat projection of the Indian Ocean with color-coded data." },
          { icon: <BarChart2 size={16} color="#a855f7" />, title: "Analysis", desc: "Use bottom panels for time series, transect and comparison analysis." },
          { icon: <Download size={16} color="#ffd11a" />, title: "Export", desc: "Export data as CSV, NetCDF or generate PDF reports." },
        ].map(h => (
          <div key={h.title} style={{ display: "flex", gap: 12, padding: "12px", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", marginBottom: 8 }}>
            {h.icon}<div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{h.title}</div><div style={{ fontSize: 12 }}>{h.desc}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}
