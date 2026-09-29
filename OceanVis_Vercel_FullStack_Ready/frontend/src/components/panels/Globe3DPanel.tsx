import React, { useRef, useEffect } from "react";
import { Globe2, Maximize2 } from "lucide-react";
import { useOceanStore } from "../../store/oceanStore";

export default function Globe3DPanel() {
  const { depthIndex, depthAxis, selectedVariable, setSelectedVariable, vizMode, setVizMode, variables, setActiveView } = useOceanStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modes = [
    { id: "surface", label: "Surface" },
    { id: "depth-slice", label: "Depth Slice" },
    { id: "volume-3d", label: "3D Volume" },
    { id: "currents", label: "Currents" },
    { id: "tracks", label: "Argo Tracks" }
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let rotation = 0;
    const img = new Image();
    img.src = "/earth_nasa_2048.jpg";

    const render = () => {
      rotation += 0.005;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.42;

      // Deep space background
      ctx.fillStyle = "#020712";
      ctx.fillRect(0, 0, w, h);

      // Atmospheric outer glow
      const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.95, cx, cy, radius * 1.25);
      glowGrad.addColorStop(0, "rgba(56, 189, 248, 0.45)");
      glowGrad.addColorStop(0.5, "rgba(14, 165, 233, 0.15)");
      glowGrad.addColorStop(1, "rgba(2, 6, 23, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.25, 0, Math.PI * 2);
      ctx.fill();

      // Earth Globe clip
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      if (img.complete && img.naturalWidth > 0) {
        // Draw rotating earth slice
        const offset = ((rotation * 50) % img.naturalWidth);
        ctx.drawImage(img, offset, 0, img.naturalWidth - offset, img.naturalHeight, cx - radius, cy - radius, radius * 2, radius * 2);
        if (offset > 0) {
          ctx.drawImage(img, 0, 0, offset, img.naturalHeight, cx - radius + (img.naturalWidth - offset) * (radius * 2 / img.naturalWidth), cy - radius, radius * 2, radius * 2);
        }
      } else {
        ctx.fillStyle = "#0b2545";
        ctx.fill();
      }

      // Dynamic ocean thermal flow overlay
      const heatGrad = ctx.createRadialGradient(cx - radius * 0.2, cy - radius * 0.1, radius * 0.1, cx, cy, radius);
      heatGrad.addColorStop(0, "rgba(239, 68, 68, 0.55)");
      heatGrad.addColorStop(0.4, "rgba(234, 179, 8, 0.45)");
      heatGrad.addColorStop(0.7, "rgba(16, 185, 129, 0.35)");
      heatGrad.addColorStop(1, "rgba(14, 116, 144, 0.2)");
      ctx.fillStyle = heatGrad;
      ctx.fill();

      // Day / night sphere shading
      const sphereShade = ctx.createRadialGradient(cx - radius * 0.4, cy - radius * 0.4, radius * 0.1, cx + radius * 0.3, cy + radius * 0.3, radius * 1.1);
      sphereShade.addColorStop(0, "rgba(255, 255, 255, 0.2)");
      sphereShade.addColorStop(0.5, "rgba(0, 0, 0, 0.05)");
      sphereShade.addColorStop(1, "rgba(0, 4, 16, 0.85)");
      ctx.fillStyle = sphereShade;
      ctx.fill();

      ctx.restore();

      // Atmosphere edge ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(125, 211, 252, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="mini-globe-panel">
      <div className="panel-header mini-header">
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Globe2 size={11} color="var(--accent-cyan)" />
          3D Ocean Globe Preview
        </span>
        <span className="mini-header-context">Depth: {depthAxis[depthIndex] ?? 0} m</span>
      </div>

      <div className="mini-globe-body" style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          width={280}
          height={200}
          style={{ width: "100%", height: "100%", display: "block" }}
        />

        <div className="mini-globe-controls">
          {modes.map(m => (
            <button
              key={m.id}
              className={`btn-icon ${vizMode === m.id ? "active" : ""}`}
              title={m.label}
              onClick={() => setVizMode(m.id)}
            >
              {m.label.charAt(0)}
            </button>
          ))}
        </div>

        <div style={{ position: "absolute", bottom: 6, right: 6 }}>
          <button
            className="btn btn-primary"
            style={{ fontSize: 9, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4 }}
            onClick={() => setActiveView("globe-3d")}
          >
            <Maximize2 size={10} /> Full 3D Globe
          </button>
        </div>
      </div>

      <div className="mini-variable-row" style={{ padding: "4px 6px", display: "flex", gap: 4, overflowX: "auto" }}>
        {variables.slice(0, 4).map(v => (
          <button
            key={v.id}
            className={`btn btn-ghost ${selectedVariable === v.id ? "active" : ""}`}
            style={{ fontSize: 9, padding: "2px 6px" }}
            onClick={() => setSelectedVariable(v.id)}
          >
            {v.name.replace("Sea Surface ", "")}
          </button>
        ))}
      </div>
    </div>
  );
}
