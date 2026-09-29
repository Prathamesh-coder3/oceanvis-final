import React, { useEffect, useCallback } from "react";
import { useOceanStore } from "./store/oceanStore";
import { api } from "./services/api";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import DataLayersPanel from "./components/DataLayersPanel";
import RightPanel from "./components/RightPanel";
import BottomWorkspace from "./components/BottomWorkspace";
import ObservationPopup from "./components/ObservationPopup";
import WorkspaceRouter from "./components/WorkspaceRouter";
import type { Observation, Alert, DataSource, OverviewStats, Variable } from "./types";

interface AppProps { onReady?: () => void; }

export default function App({ onReady }: AppProps) {
  const { selectedObservation, setObservations, setAlerts, setDataSources, setOverviewStats, setSplashDone, setVariables, setTimeAxis, setDepthAxis } = useOceanStore();

  const loadInitialData = useCallback(async () => {
    const [dataset, obs, alerts, sources, overview] = await Promise.allSettled([
      api.dataset(), api.observations(), api.alerts(), api.sources(), api.overview(),
    ]);
    if (dataset.status === "fulfilled") {
      const d = dataset.value as {
        variables?: Variable[];
        timeAxis?: { index: number; date: string; label: string }[];
        depthAxis?: number[];
      };
      if (Array.isArray(d.variables)) setVariables(d.variables);
      if (Array.isArray(d.timeAxis)) setTimeAxis(d.timeAxis);
      if (Array.isArray(d.depthAxis)) setDepthAxis(d.depthAxis);
    }
    if (obs.status === "fulfilled") setObservations(obs.value as Observation[]);
    if (alerts.status === "fulfilled") setAlerts(alerts.value as Alert[]);
    if (sources.status === "fulfilled") setDataSources(sources.value as DataSource[]);
    if (overview.status === "fulfilled") setOverviewStats(overview.value as unknown as OverviewStats);
  }, [
    setObservations, setAlerts, setDataSources, setOverviewStats,
    setVariables, setTimeAxis, setDepthAxis,
  ]);

  useEffect(() => {
    // Splash timing is intentionally independent of remote/demo data requests.
    const started = performance.now();
    const minVisualTime = 2200;
    const reveal = () => {
      const remaining = Math.max(0, minVisualTime - (performance.now() - started));
      window.setTimeout(() => {
        setSplashDone(true);
        onReady?.();
      }, remaining);
    };
    reveal();
    void loadInitialData();
    return () => undefined;
  }, [loadInitialData, onReady, setSplashDone]);

  return (
    <div className="ocean-app">
      <Header />
      <div className="app-body">
        <Sidebar />
        <DataLayersPanel />
        <main className="main-content">
          <div className="main-row">
            <section className="center-area">
              <WorkspaceRouter />
              {selectedObservation && <ObservationPopup />}
            </section>
            <RightPanel />
          </div>
          <BottomWorkspace />
        </main>
      </div>
    </div>
  );
}
