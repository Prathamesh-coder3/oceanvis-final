import React, { useEffect, useRef, useState, useCallback } from "react";
import { Crosshair } from "lucide-react";
import { useOceanStore } from "../../store/oceanStore";
import { api } from "../../services/api";

interface TransData {
  data: number[][];
  distances: number[];
  depths: number[];
  min: number;
  max: number;
  unit: string;
}

function turboRgb(t: number): string {
  const c = Math.max(0, Math.min(1, t));
  const r = Math.floor(Math.min(255, Math.max(0, 255 * (1.4 * Math.sin(c * Math.PI * 1.3 - 0.4)))));
  const g = Math.floor(Math.min(255, Math.max(0, 255 * Math.sin(c * Math.PI))));
  const b = Math.floor(Math.min(255, Math.max(0, 255 * (1.3 * Math.cos(c * Math.PI * 1.2)))));
  return `rgb(${r},${g},${b})`;
}

export default function TransectPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { selectedVariable, variables } = useOceanStore();
  const [tData, setTData] = useState<TransData | null>(null);
  const [startPoint, setStartPoint] = useState("14.0°N, 68.0°E");
  const [endPoint, setEndPoint] = useState("14.0°N, 88.0°E");
  const [loading, setLoading] = useState(false);

  const curVar = variables.find((v) => v.id === selectedVariable);

  const loadTransect = useCallback(() => {
    setLoading(true);
    api
      .transect(selectedVariable)
      .then((d) => setTData(d as TransData))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedVariable]);

  useEffect(() => {
    loadTransect();
  }, [loadTransect]);

  useEffect(() => {
    if (!tData || !canvasRef.current) return;
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    c.width = c.offsetWidth || 400;
    c.height = c.offsetHeight || 180;
    const W = c.width, H = c.height;

    ctx.fillStyle = "#010a16";
    ctx.fillRect(0, 0, W, H);

    const nz = tData.data.length;
    const nx = tData.data[0]?.length ?? 0;
    if (!nx || !nz) return;

    const cellW = (W - 35) / nx;
    const cellH = (H - 24) / nz;

    const range = Math.max(1e-6, tData.max - tData.min);

    for (let z = 0; z < nz; z++) {
      for (let x = 0; x < nx; x++) {
        const v = tData.data[z][x];
        const t = (v - tData.min) / range;
        ctx.fillStyle = turboRgb(t);
        ctx.fillRect(35 + x * cellW, z * cellH, cellW + 1, cellH + 1);
      }
    }

    // Depth Axis labels (m)
    ctx.font = "8px Inter, sans-serif";
    ctx.fillStyle = "#7aa3cc";
    ctx.textAlign = "right";
    const depthMarks = [0, 200, 500, 1000, 2000];
    depthMarks.forEach((d, i) => {
      const y = (i / (depthMarks.length - 1)) * (H - 30) + 8;
      ctx.fillText(`${d}m`, 30, y);
    });

    // Horizontal Distance axis
    ctx.textAlign = "left";
    ctx.fillText("West (Arabian Sea)", 38, H - 6);
    ctx.textAlign = "right";
    ctx.fillText("East (Bay of Bengal)", W - 6, H - 6);
  }, [tData]);

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: "var(--bg-panel)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div className="panel-header" style={{ fontSize: 10, padding: "4px 8px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Crosshair size={11} color="#ffd11a" />
          Vertical Transect Section
        </span>
        <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600 }}>
          {curVar?.name || selectedVariable}
        </span>
      </div>

      <div style={{ display: "flex", gap: 4, padding: "3px 6px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
        <input
          className="input"
          value={startPoint}
          onChange={(e) => setStartPoint(e.target.value)}
          placeholder="Start (lat, lon)"
          style={{ fontSize: 9, padding: "2px 5px", flex: 1 }}
        />
        <input
          className="input"
          value={endPoint}
          onChange={(e) => setEndPoint(e.target.value)}
          placeholder="End (lat, lon)"
          style={{ fontSize: 9, padding: "2px 5px", flex: 1 }}
        />
        <button
          className="btn btn-primary"
          onClick={loadTransect}
          style={{ fontSize: 9, padding: "3px 8px", whiteSpace: "nowrap" }}
        >
          {loading ? "Computing..." : "Analyse Transect"}
        </button>
      </div>

      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontSize: 11,
              background: "rgba(1, 10, 22, 0.7)",
            }}
          >
            Extracting ocean depth slice...
          </div>
        )}
      </div>
    </div>
  );
}
