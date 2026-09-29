import React from "react";
import { useOceanStore } from "../store/oceanStore";

// Mini canvas preview
function DepthPreview({ depth, selected, variable }: { depth: number; selected: boolean; variable: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const W = c.width = c.offsetWidth || 60;
    const H = c.height = c.offsetHeight || 36;
    // Simple gradient preview
    const seed = depth * 0.01;
    const grad = ctx.createLinearGradient(0, 0, W, H);
    if (variable === "temperature") {
      const base = Math.max(0, 1 - depth / 2000);
      grad.addColorStop(0, `hsl(${200 + base * 20},80%,${20 + base * 40}%)`);
      grad.addColorStop(0.5, `hsl(${180 + base * 30},70%,${30 + base * 30}%)`);
      grad.addColorStop(1, `hsl(${160 + base * 40},60%,${20 + base * 20}%)`);
    } else {
      grad.addColorStop(0, "#0a2858");
      grad.addColorStop(1, "#071525");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    // Add some texture dots
    for (let i = 0; i < 30; i++) {
      const x = (Math.sin(i * 7 + seed * 100) + 1) / 2 * W;
      const y = (Math.cos(i * 11 + seed * 50) + 1) / 2 * H;
      const v = Math.abs(Math.sin(i + seed * 10));
      const hue = variable === "temperature" ? (160 + v * 60) : 200;
      ctx.fillStyle = `hsla(${hue},80%,${50 + v * 30}%,0.4)`;
      ctx.beginPath();
      ctx.arc(x, y, 2 + v * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [depth, variable]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%", height: "100%", borderRadius: 3,
        border: selected ? "1px solid var(--accent-blue)" : "1px solid var(--border)",
        boxShadow: selected ? "0 0 6px var(--accent-blue)44" : "none",
      }}
    />
  );
}

export default function DepthPreviewCards() {
  const { depthIndex, setDepthIndex, selectedVariable, depthAxis } = useOceanStore();

  return (
    <div style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 5, letterSpacing: "0.5px", textTransform: "uppercase" }}>
        Depth Levels
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
        {depthAxis.slice(0, 6).map((depth, i) => (
          <div
            key={depth}
            onClick={() => setDepthIndex(i)}
            style={{
              cursor: "pointer", borderRadius: "var(--radius-sm)", overflow: "hidden",
              position: "relative",
            }}
          >
            <div style={{ height: 36 }}>
              <DepthPreview depth={depth} selected={depthIndex === i} variable={selectedVariable} />
            </div>
            <div style={{
              position: "absolute", bottom: 2, left: 0, right: 0, textAlign: "center",
              fontSize: 9, fontWeight: 600,
              color: depthIndex === i ? "var(--accent-blue)" : "var(--text-muted)",
              textShadow: "0 1px 3px #000",
            }}>
              {depth === 0 ? "Surface" : `${depth} m`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
