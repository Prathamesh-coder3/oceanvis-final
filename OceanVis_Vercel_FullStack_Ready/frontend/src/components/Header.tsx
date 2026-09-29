import React, { useEffect, useState } from "react";
import { useOceanStore } from "../store/oceanStore";
import {
  Globe2, Search, Bell, Download, Monitor, Settings, User,
  Maximize2, ChevronDown, Zap, AlertTriangle, Radio, Activity
} from "lucide-react";

export default function Header() {
  const {
    mode,
    alerts,
    selectedRegion,
    setSelectedRegion,
    setActiveView,
    searchQuery,
    setSearchQuery,
    dataStatus
  } = useOceanStore();

  const [search, setSearch] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const regions = ["Arabian Sea", "Bay of Bengal", "Indian Ocean", "Custom Region"];
  const unreadAlerts = alerts.filter(a => a.level === "High" || a.level === "Moderate").length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    const q = search.trim().toLowerCase();
    setSearchQuery(search.trim());

    if (q.includes("arabian")) {
      setSelectedRegion("Arabian Sea");
      setActiveView("map-2d");
    } else if (q.includes("bengal")) {
      setSelectedRegion("Bay of Bengal");
      setActiveView("map-2d");
    } else if (q.includes("indian")) {
      setSelectedRegion("Indian Ocean");
      setActiveView("map-2d");
    } else {
      setActiveView("map-2d");
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <header className="app-header" style={{ gap: 10, position: "relative" }}>
      {/* Brand Logo */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, cursor: "pointer" }}
        onClick={() => setActiveView("overview")}
        title="OceanVis Command Center"
      >
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #00d4ff44, #030d1a)",
          border: "1.5px solid #00d4ff66",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 12px rgba(0, 212, 255, 0.3)"
        }}>
          <Globe2 size={17} color="#00d4ff" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#e6f4ff", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
            OceanVis
          </div>
          <div style={{ fontSize: 9, color: "#4f82a8", letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 600 }}>
            Operational Oceanography & In-situ Obs
          </div>
        </div>
      </div>

      <div style={{ width: 1, height: 28, background: "var(--border)", flexShrink: 0 }} />

      {/* Global Coordinates & Location Search */}
      <form onSubmit={handleSearchSubmit} className="header-search" style={{ flex: 1, maxWidth: 320, position: "relative" }}>
        <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
        <input
          className="input"
          placeholder="Search location (e.g. Arabian Sea, 15N 72E)..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 30, fontSize: 11, height: 30 }}
        />
      </form>

      {/* Region Presets */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        {regions.map(r => (
          <button
            key={r}
            className={`btn btn-ghost ${selectedRegion === r ? "active-region" : ""}`}
            onClick={() => { setSelectedRegion(r); setActiveView("map-2d"); }}
            style={{ fontSize: 11, padding: "3px 8px", height: 26 }}
          >
            {r === "Arabian Sea" && <Radio size={10} />}
            {r === "Bay of Bengal" && <Radio size={10} />}
            {r === "Indian Ocean" && <Globe2 size={10} />}
            {r}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 28, background: "var(--border)", flexShrink: 0 }} />

      {/* Live System Time */}
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 600 }}>
          {now.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>
          {now.toISOString().slice(11, 19)} UTC
        </div>
      </div>

      {/* Live Scientific Data Feed Badge */}
      <div style={{ flexShrink: 0 }}>
        <div
          onClick={() => setActiveView("live-status")}
          title="Live Ocean Feed from Copernicus Marine & Argo GDAC"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(0, 212, 122, 0.12)",
            border: "1px solid rgba(0, 212, 122, 0.35)",
            borderRadius: "var(--radius-sm)", padding: "4px 9px",
            cursor: "pointer"
          }}
        >
          <div className="status-dot live" style={{ background: "#00d47a", boxShadow: "0 0 6px #00d47a" }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#00d47a", letterSpacing: "0.3px" }}>
            LIVE OCEAN DATA
          </span>
        </div>
      </div>

      {/* Quick Action Icons */}
      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
        <button
          className="btn-icon"
          style={{ position: "relative" }}
          onClick={() => setActiveView("alerts")}
          title="Active Marine Alerts"
        >
          <Bell size={14} />
          {unreadAlerts > 0 && (
            <span style={{
              position: "absolute", top: 2, right: 2,
              width: 7, height: 7, borderRadius: "50%",
              background: "#ff3d5a", border: "1px solid var(--bg-panel)",
              boxShadow: "0 0 5px #ff3d5a"
            }} />
          )}
        </button>

        <button
          className="btn-icon"
          title="Export Data & Reports"
          onClick={() => setActiveView("export")}
        >
          <Download size={14} />
        </button>

        <button
          className="btn-icon"
          title="Toggle Fullscreen"
          onClick={toggleFullscreen}
        >
          <Maximize2 size={14} />
        </button>

        <button
          className="btn-icon"
          title="Settings & Diagnostics"
          onClick={() => setActiveView("settings")}
        >
          <Settings size={14} />
        </button>

        <button
          className="btn-icon"
          title="User Profile & System Info"
          onClick={() => setShowProfile(v => !v)}
          style={{ background: showProfile ? "rgba(0, 212, 255, 0.2)" : undefined }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: "50%",
            background: "linear-gradient(135deg, #00d4ff, #1e6fff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 800, color: "#fff"
          }}>
            OV
          </div>
        </button>
      </div>

      {/* Profile / System Info Modal */}
      {showProfile && (
        <div style={{
          position: "absolute", top: 48, right: 10, zIndex: 100,
          background: "rgba(4, 18, 36, 0.95)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(0, 212, 255, 0.4)", borderRadius: 8,
          padding: 14, minWidth: 260, boxShadow: "0 12px 32px rgba(0,0,0,0.6)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
            <strong style={{ color: "#e2f2ff", fontSize: 12 }}>OceanVis Platform</strong>
            <button className="btn-icon" onClick={() => setShowProfile(false)} style={{ width: 18, height: 18 }}>×</button>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>
            Operational Physical Oceanography
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 8 }}>
            Data: Copernicus Marine · Argo GDAC · INCOIS RAMA
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <button className="btn btn-ghost" style={{ flex: 1, fontSize: 10 }} onClick={() => { setActiveView("live-status"); setShowProfile(false); }}>
              Status
            </button>
            <button className="btn btn-primary" style={{ flex: 1, fontSize: 10 }} onClick={() => { setActiveView("settings"); setShowProfile(false); }}>
              Settings
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
