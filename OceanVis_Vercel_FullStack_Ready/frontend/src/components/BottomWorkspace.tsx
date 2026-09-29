import React, { useEffect, useState } from "react";
import Map2DPanel from "./panels/Map2DPanel";
import Globe3DPanel from "./panels/Globe3DPanel";
import ProfilePanel from "./panels/ProfilePanel";
import ComparisonPanel from "./panels/ComparisonPanel";
import TimeSeriesPanel from "./panels/TimeSeriesPanel";
import TransectPanel from "./panels/TransectPanel";
import AlertsPanel from "./panels/AlertsPanel";
import ImportPanel from "./panels/ImportPanel";
import ExportPanel from "./panels/ExportPanel";

const PANELS = [
  { id: "map2d", label: "2D Map", node: <Map2DPanel /> },
  { id: "globe3d", label: "3D Globe", node: <Globe3DPanel /> },
  { id: "profile", label: "Profile", node: <ProfilePanel /> },
  { id: "comparison", label: "Comparison", node: <ComparisonPanel /> },
  { id: "timeseries", label: "Time Series", node: <TimeSeriesPanel /> },
  { id: "transect", label: "Transect", node: <TransectPanel /> },
  { id: "alerts", label: "Alerts", node: <AlertsPanel /> },
  { id: "import", label: "Import", node: <ImportPanel /> },
  { id: "export", label: "Export", node: <ExportPanel /> },
];

function getVisibleCount(width: number) {
  if (width >= 1800) return 4;
  if (width >= 1500) return 3;
  return 1;
}

export default function BottomWorkspace() {
  const [visibleCount, setVisibleCount] = useState(() => getVisibleCount(window.innerWidth));
  const [active, setActive] = useState("map2d");

  useEffect(() => {
    const onResize = () => setVisibleCount(getVisibleCount(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const shown = PANELS.slice(0, visibleCount);
  const activePanel = PANELS.find(p => p.id === active) ?? PANELS[0];

  return (
    <section className="bottom-workspace" aria-label="Analysis workspace">
      <div className="bottom-workspace-tabs">
        {PANELS.map(panel => (
          <button key={panel.id} className={`workspace-tab ${active === panel.id ? "active" : ""}`} onClick={() => setActive(panel.id)}>
            {panel.label}
          </button>
        ))}
      </div>
      <div className={`bottom-workspace-grid mode-${visibleCount}`}>
        {visibleCount === 1
          ? <div className="workspace-panel workspace-panel-active">{activePanel.node}</div>
          : shown.map(panel => <div className="workspace-panel" key={panel.id}>{panel.node}</div>)}
      </div>
    </section>
  );
}
