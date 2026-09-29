import React, { useEffect, useState } from "react";
import { useOceanStore } from "../store/oceanStore";
import {
  Globe2, Search, Bell, Download, Monitor, Settings, User,
  Maximize2, ChevronDown, Zap, AlertTriangle, Radio
} from "lucide-react";

export default function Header() {
  const { mode, setMode, setActiveView, alerts, selectedRegion, setSelectedRegion } = useOceanStore();
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(id); }, []);

  const regions = ["Arabian Sea", "Bay of Bengal", "Indian Ocean", "Custom Region"];
  const unreadAlerts = alerts.filter(a => a.level === "High" || a.level === "Moderate").length;

  return (
    <header className="app-header" style={{ gap: 10 }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #1e6fff33, #030d1a)",
          border: "1.5px solid #1e6fff44",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Globe2 size={16} color="#1e6fff" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#e0eeff", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
            OceanVis
          </div>
          <div style={{ fontSize: 9, color: "#3a6080", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            Integrated Ocean Models & In-situ Obs
          </div>
        </div>
      </div>

      <div style={{ width: 1, height: 32, background: "var(--border)", flexShrink: 0 }} />

      {/* Search */}
      <div className="header-search" style={{ flex: 1, maxWidth: 340, position: "relative" }}>
        <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
        <input
          className="input"
          placeholder="Search location (e.g. Arabian Sea, 15N 72E)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 30, fontSize: 12, height: 30 }}
        />
      </div>

      {/* Region quick buttons */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        {regions.map(r => (
          <button key={r} className={`btn btn-ghost ${selectedRegion === r ? "active-region" : ""}`} onClick={() => { setSelectedRegion(r); setActiveView("map-2d"); }} style={{ fontSize: 11, padding: "3px 8px", height: 26 }}>
            {r === "Arabian Sea" && <Radio size={10} />}
            {r === "Bay of Bengal" && <Radio size={10} />}
            {r === "Indian Ocean" && <Globe2 size={10} />}
            {r}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 32, background: "var(--border)", flexShrink: 0 }} />

      {/* Date/Time */}
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>
          {now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
          {now.toISOString().slice(11,19)} UTC
        </div>
      </div>

      {/* Status */}
      <div style={{ flexShrink: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          background: mode === "DEMO" ? "var(--accent-blue)22" : "var(--accent-green)22",
          border: `1px solid ${mode === "DEMO" ? "var(--accent-blue)44" : "var(--accent-green)44"}`,
          borderRadius: "var(--radius-sm)", padding: "3px 8px",
        }}>
          <div className={`status-dot ${mode === "DEMO" ? "demo" : "live"}`} />
          <span style={{ fontSize: 11, fontWeight: 600, color: mode === "DEMO" ? "var(--accent-blue)" : "var(--accent-green)" }}>
            {mode === "DEMO" ? "PROTOTYPE DATA" : "LIVE DATA"}
          </span>
        </div>
      </div>

      {/* Prototype data state: intentionally truthful for the bundled demo dataset. */}
      <div className="prototype-state-pill" title="This bundled prototype uses a simulated dataset; live providers can be enabled separately.">
        PREVIEW DATA
      </div>

      {/* Action icons */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button className="btn-icon" style={{ position: "relative" }} onClick={() => setActiveView("alerts")} title="Alerts">
          <Bell size={14} />
          {unreadAlerts > 0 && (
            <span style={{
              position: "absolute", top: 2, right: 2,
              width: 8, height: 8, borderRadius: "50%",
              background: "var(--alert-high)", border: "1px solid var(--bg-panel)",
              fontSize: 0
            }} />
          )}
        </button>
        <button className="btn-icon" title="Download" onClick={() => setActiveView("export")}><Download size={14} /></button>
        <button className="btn-icon" title="Fullscreen" onClick={() => document.documentElement.requestFullscreen?.()}><Maximize2 size={14} /></button>
        <button className="btn-icon" title="Settings" onClick={() => setActiveView("settings")}><Settings size={14} /></button>
        <button className="btn-icon" title="Profile">
          <div style={{
            width: 20, height: 20, borderRadius: "50%",
            background: "var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700, color: "#fff"
          }}>V</div>
        </button>
      </div>
    </header>
  );
}
