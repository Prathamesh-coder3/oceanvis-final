import React, { useEffect, useRef, useState } from "react";
import { Crosshair } from "lucide-react";
import { useOceanStore } from "../../store/oceanStore";
import { api } from "../../services/api";

interface TransData { data: number[][]; distances: number[]; depths: number[]; min: number; max: number; unit: string }

function colorForValue(v: number, min: number, max: number) {
  const n = Math.max(0, Math.min(1, (v - min) / (max - min)));
  const r = Math.round(255 * Math.min(1, n * 2));
  const g = Math.round(100 - n * 80);
  const b = Math.round(255 * Math.max(0, 1 - n * 2));
  return `rgb(${r},${g},${b})`;
}

export default function TransectPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { selectedVariable } = useOceanStore();
  const [tData, setTData] = useState<TransData | null>(null);

  useEffect(() => {
    api.transect(selectedVariable).then(d => setTData(d as TransData)).catch(() => {});
  }, [selectedVariable]);

  useEffect(() => {
    if (!tData || !canvasRef.current) return;
    const c = canvasRef.current;
    const ctx = c.getContext("2d"); if (!ctx) return;
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    const W = c.width, H = c.height;
    ctx.fillStyle = "#030d1a"; ctx.fillRect(0, 0, W, H);
    const nz = tData.data.length, nx = tData.data[0]?.length ?? 0;
    if (!nx || !nz) return;
    const cellW = W / nx, cellH = H / nz;
    for (let z = 0; z < nz; z++) {
      for (let x = 0; x < nx; x++) {
        const v = tData.data[z][x];
        ctx.fillStyle = colorForValue(v, tData.min, tData.max);
        ctx.fillRect(x * cellW, z * cellH, cellW + 1, cellH + 1);
      }
    }
    // Colorbar
    const barGrad = ctx.createLinearGradient(4, H - 8, W - 4, H - 8);
    barGrad.addColorStop(0, "blue"); barGrad.addColorStop(0.5, "cyan"); barGrad.addColorStop(1, "red");
    ctx.fillStyle = barGrad; ctx.fillRect(4, H - 8, W - 8, 6);
    ctx.font = "8px Inter,sans-serif"; ctx.fillStyle = "#7aa3cc"; ctx.textAlign = "left";
    ctx.fillText(`${tData.min} ${tData.unit}`, 4, H - 10);
    ctx.textAlign = "right"; ctx.fillText(`${tData.max} ${tData.unit}`, W - 4, H - 10);
  }, [tData]);

  return (
    <div style={{ flex: 1, minWidth: 0, background: "var(--bg-panel)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="panel-header" style={{ fontSize: 10, padding: "4px 8px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Crosshair size={11} color="#ffd11a" />
          Transect Analysis
        </span>
        <span style={{ fontSize: 9, color: "var(--text-muted)" }}>14N, 75E</span>
      </div>
      <div style={{ display: "flex", gap: 4, padding: "3px 6px", borderBottom: "1px solid var(--border)" }}>
        <input className="input" placeholder="Start: 14N, 75E" style={{ fontSize: 9, padding: "2px 5px" }} />
        <input className="input" placeholder="End: 14N, 75E" style={{ fontSize: 9, padding: "2px 5px" }} />
        <button className="btn btn-primary" style={{ fontSize: 9, padding: "2px 8px", whiteSpace: "nowrap" }}>Analyse Transect</button>
      </div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
        {!tData && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 11 }}>Loading...</div>}
      </div>
    </div>
  );
}
