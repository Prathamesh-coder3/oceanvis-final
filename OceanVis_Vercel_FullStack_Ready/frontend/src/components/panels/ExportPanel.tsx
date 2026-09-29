import React from "react";
import { FileDown, FileText, Map, BarChart2, TrendingUp, Share2, Zap } from "lucide-react";

export default function ExportPanel() {
  return (
    <div style={{ flex: 1, minWidth: 0, background: "var(--bg-panel)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="panel-header" style={{ fontSize: 10, padding: "4px 8px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <FileDown size={11} color="#ffd11a" />
          Export & Reports
        </span>
      </div>
      <div style={{ display: "flex", gap: 2, padding: "3px 6px", borderBottom: "1px solid var(--border)" }}>
        {["Export", "Reports", "Share"].map(t => (
          <button key={t} style={{
            fontSize: 9, padding: "2px 6px", borderRadius: 3, cursor: "pointer",
            background: t === "Export" ? "var(--accent-blue)22" : "transparent",
            border: t === "Export" ? "1px solid var(--accent-blue)44" : "1px solid transparent",
            color: t === "Export" ? "var(--accent-blue)" : "var(--text-muted)"
          }}>{t}</button>
        ))}
      </div>
      <div className="overflow-y-auto" style={{ flex: 1, padding: "6px" }}>
        {/* Export options */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 4, fontWeight: 600 }}>EXPORT MAP</div>
          <div style={{ fontSize: 9, color: "var(--text-secondary)", marginBottom: 4 }}>
            Current Map View — Export as image (PNG) or as interactive profile
          </div>
          <button className="btn btn-ghost" style={{ fontSize: 9, padding: "3px 8px", marginBottom: 3, width: "100%", justifyContent: "flex-start", gap: 6 }}>
            <Map size={10} /> Export Map View (PNG)
          </button>
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 4, fontWeight: 600 }}>EXPORT DATA</div>
          {[
            { label: "Profile Data (CSV)", icon: <BarChart2 size={10} /> },
            { label: "Time Series (CSV)", icon: <TrendingUp size={10} /> },
            { label: "Transect Data (NetCDF)", icon: <FileDown size={10} /> },
          ].map(e => (
            <button key={e.label} className="btn btn-ghost" style={{ fontSize: 9, padding: "3px 8px", marginBottom: 3, width: "100%", justifyContent: "flex-start", gap: 6 }}>
              {e.icon} {e.label}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 4, fontWeight: 600 }}>ANALYSIS REPORT</div>
          <div style={{ fontSize: 9, color: "var(--text-secondary)", marginBottom: 4 }}>
            Generate PDF report with charts and statistics
          </div>
          <button className="btn btn-primary" style={{ fontSize: 9, padding: "4px 12px", width: "100%" }}>
            <Zap size={10} /> Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}
