import React, { useState } from "react";
import { Bell, AlertTriangle, CheckCircle, Info, MapPin, Check } from "lucide-react";
import { useOceanStore } from "../../store/oceanStore";

const LEVEL_COLORS: Record<string, string> = {
  High: "#ff3d5a",
  Moderate: "#ff8c1a",
  Info: "#4d9fff",
  Low: "#ffd11a"
};

export default function AlertsPanel() {
  const { alerts, setSelectedRegion, setActiveView } = useOceanStore();
  const [tab, setTab] = useState<"Active Alerts" | "System">("Active Alerts");
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});

  const handleAcknowledge = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAcknowledged(prev => ({ ...prev, [id]: true }));
  };

  const handleLocate = (region: string) => {
    setSelectedRegion(region);
    setActiveView("map-2d");
  };

  const activeAlerts = alerts.filter(a => !acknowledged[a.id]);

  return (
    <div style={{ flex: 1, minWidth: 0, background: "var(--bg-panel)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="panel-header" style={{ fontSize: 10, padding: "4px 8px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Bell size={11} color="#ff3d5a" />
          Alerts & Ocean Monitoring
        </span>
        <span className="badge badge-live" style={{ fontSize: 8 }}>OPERATIONAL</span>
      </div>

      <div style={{ display: "flex", gap: 2, padding: "3px 6px", borderBottom: "1px solid var(--border)" }}>
        {(["Active Alerts", "System"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontSize: 9, padding: "2px 6px", borderRadius: 3, cursor: "pointer",
              background: tab === t ? "#ff3d5a22" : "transparent",
              border: tab === t ? "1px solid #ff3d5a44" : "1px solid transparent",
              color: tab === t ? "#ff3d5a" : "var(--text-muted)",
              fontWeight: tab === t ? 600 : 400
            }}
          >
            {t === "Active Alerts" ? `Active (${activeAlerts.length})` : t}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto" style={{ flex: 1, padding: "6px" }}>
        {tab === "Active Alerts" ? (
          <>
            {activeAlerts.map(alert => (
              <div
                key={alert.id}
                style={{
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderLeft: `3px solid ${LEVEL_COLORS[alert.level] || "#4d9fff"}`,
                  borderRadius: "var(--radius-sm)", padding: "6px 8px", marginBottom: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                  <AlertTriangle size={11} color={LEVEL_COLORS[alert.level]} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-primary)", flex: 1 }} className="truncate">
                    {alert.title}
                  </span>
                  <span style={{
                    fontSize: 8, padding: "1px 4px", borderRadius: 3,
                    background: LEVEL_COLORS[alert.level] + "22",
                    color: LEVEL_COLORS[alert.level], fontWeight: 600
                  }}>
                    {alert.level}
                  </span>
                </div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 4, lineHeight: 1.3 }}>
                  {alert.message}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 8, color: "var(--text-muted)" }}>
                  <button
                    onClick={() => handleLocate(alert.region)}
                    className="btn btn-ghost"
                    style={{ fontSize: 8, padding: "1px 4px", height: "auto", display: "inline-flex", alignItems: "center", gap: 2 }}
                  >
                    <MapPin size={9} /> {alert.region}
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{alert.time}</span>
                    <button
                      onClick={(e) => handleAcknowledge(alert.id, e)}
                      title="Acknowledge alert"
                      className="btn btn-ghost"
                      style={{ fontSize: 8, padding: "1px 4px", height: "auto", color: "var(--accent-emerald)" }}
                    >
                      <Check size={9} /> Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {activeAlerts.length === 0 && (
              <div style={{ color: "var(--accent-emerald)", fontSize: 10, textAlign: "center", padding: "20px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <CheckCircle size={20} />
                <span>All ocean anomaly alerts acknowledged. Systems nominal.</span>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: "8px 4px", fontSize: 9, color: "var(--text-secondary)" }}>
            <div style={{ marginBottom: 8, padding: "6px", background: "var(--bg-card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>Copernicus Marine Service Integration</div>
              <div style={{ color: "var(--accent-emerald)" }}>● Real-time SST & Geostrophic Velocity Feeds Online</div>
            </div>
            <div style={{ marginBottom: 8, padding: "6px", background: "var(--bg-card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>Argo GDAC Telemetry Receiver</div>
              <div style={{ color: "var(--accent-emerald)" }}>● 18,700 Active Floats Synchronized</div>
            </div>
            <div style={{ padding: "6px", background: "var(--bg-card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>INCOIS RAMA Moored Array</div>
              <div style={{ color: "var(--accent-emerald)" }}>● Indian Ocean Tropical Moorings Active</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
