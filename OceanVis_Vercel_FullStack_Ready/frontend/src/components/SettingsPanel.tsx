import React from "react";
import { Settings } from "lucide-react";
export default function SettingsPanel() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
      <Settings size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Settings</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Application configuration and preferences</div>
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12, width: 320 }}>
        {[
          { label: "Theme", val: "Dark Ocean (Default)" },
          { label: "Data Mode", val: "PREVIEW" },
          { label: "Default Region", val: "Indian Ocean" },
          { label: "Time Zone", val: "UTC" },
          { label: "Language", val: "English" },
          { label: "Backend", val: "http://localhost:8080" },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{s.label}</span>
            <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{s.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
