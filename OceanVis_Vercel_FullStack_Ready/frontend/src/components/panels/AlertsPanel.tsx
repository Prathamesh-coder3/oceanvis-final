import React, { useState } from "react";
import { Bell, AlertTriangle, Info } from "lucide-react";
import { useOceanStore } from "../../store/oceanStore";

const LEVEL_COLORS: Record<string, string> = {
  High: "#ff3d5a", Moderate: "#ff8c1a", Info: "#4d9fff", Low: "#ffd11a"
};

export default function AlertsPanel() {
  const { alerts } = useOceanStore();
  const [tab, setTab] = useState("Active Alerts");

  return (
    <div style={{ flex: 1, minWidth: 0, background: "var(--bg-panel)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="panel-header" style={{ fontSize: 10, padding: "4px 8px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Bell size={11} color="#ff3d5a" />
          Alerts & Notifications
        </span>
        <span className="badge badge-demo" style={{ fontSize: 8 }}>SIMULATED</span>
      </div>
      <div style={{ display: "flex", gap: 2, padding: "3px 6px", borderBottom: "1px solid var(--border)" }}>
        {["Active Alerts", `Notifications (${alerts.length})`, "System"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontSize: 9, padding: "2px 5px", borderRadius: 3, cursor: "pointer",
            background: tab === t ? "#ff3d5a22" : "transparent",
            border: tab === t ? "1px solid #ff3d5a44" : "1px solid transparent",
            color: tab === t ? "#ff3d5a" : "var(--text-muted)"
          }}>{t}</button>
        ))}
      </div>
      <div className="overflow-y-auto" style={{ flex: 1, padding: "4px" }}>
        {alerts.map(alert => (
          <div key={alert.id} style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderLeft: `2px solid ${LEVEL_COLORS[alert.level] || "#4d9fff"}`,
            borderRadius: "var(--radius-sm)", padding: "5px 7px", marginBottom: 4,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
              <AlertTriangle size={10} color={LEVEL_COLORS[alert.level]} />
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-primary)", flex: 1 }} className="truncate">{alert.title}</span>
              <span style={{
                fontSize: 8, padding: "1px 4px", borderRadius: 3,
                background: LEVEL_COLORS[alert.level] + "22",
                color: LEVEL_COLORS[alert.level], fontWeight: 600
              }}>{alert.level}</span>
            </div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 2 }}>{alert.message}</div>
            <div style={{ display: "flex", gap: 8, fontSize: 8, color: "var(--text-muted)" }}>
              <span>{alert.region}</span>
              <span>{alert.time}</span>
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "center", paddingTop: 20 }}>Loading alerts...</div>
        )}
      </div>
    </div>
  );
}
