import React, { useRef, useEffect } from "react";

function MiniCanvas({ label, colorA, colorB, seed }: { label: string; colorA: string; colorB: string; seed: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const W = c.width = c.offsetWidth || 70;
    const H = c.height = c.offsetHeight || 50;
    const grad = ctx.createLinearGradient(0, H, W, 0);
    grad.addColorStop(0, colorA + "cc");
    grad.addColorStop(1, colorB + "cc");
    ctx.fillStyle = "#030d1a";
    ctx.fillRect(0, 0, W, H);
    // Texture
    for (let i = 0; i < W; i += 3) {
      for (let j = 0; j < H; j += 3) {
        const v = Math.abs(Math.sin(i * 0.3 + seed) * Math.cos(j * 0.3 + seed * 1.3));
        ctx.fillStyle = `hsla(${200 + v * 60},80%,${30 + v * 40}%,${0.3 + v * 0.5})`;
        ctx.fillRect(i, j, 3, 3);
      }
    }
    // Overlay label
  }, [colorA, colorB, seed]);
  return (
    <div style={{ flex: 1, position: "relative" }}>
      <canvas ref={ref} style={{ width: "100%", height: 50, borderRadius: "var(--radius-sm)" }} />
      <div style={{
        position: "absolute", bottom: 2, left: 4, right: 4,
        fontSize: 9, color: "rgba(200,220,255,0.8)", textAlign: "left",
        fontWeight: 500, textShadow: "0 1px 3px #000",
      }}>{label}</div>
    </div>
  );
}

export default function MiniVizPanels() {
  return (
    <div style={{ padding: "6px 8px", flex: 1, overflow: "hidden" }}>
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 5, letterSpacing: "0.5px", textTransform: "uppercase" }}>
        Quick Preview
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
        <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", overflow: "hidden" }}>
          <div style={{ fontSize: 9, color: "var(--text-muted)", padding: "3px 6px", borderBottom: "1px solid var(--border)" }}>
            Current Vectors ↗
          </div>
          <MiniCanvas label="" colorA="#00d4ff" colorB="#1e6fff" seed={1.2} />
        </div>
        <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", overflow: "hidden" }}>
          <div style={{ fontSize: 9, color: "var(--text-muted)", padding: "3px 6px", borderBottom: "1px solid var(--border)" }}>
            Chlorophyll-a ↗
          </div>
          <MiniCanvas label="" colorA="#00d47a" colorB="#006837" seed={2.5} />
        </div>
        <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", overflow: "hidden" }}>
          <div style={{ fontSize: 9, color: "var(--text-muted)", padding: "3px 6px", borderBottom: "1px solid var(--border)" }}>
            Sea Surface Height ↗
          </div>
          <MiniCanvas label="" colorA="#ffd11a" colorB="#ff8c1a" seed={3.7} />
        </div>
        <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", overflow: "hidden" }}>
          <div style={{ fontSize: 9, color: "var(--text-muted)", padding: "3px 6px", borderBottom: "1px solid var(--border)" }}>
            Mixed Layer Depth ↗
          </div>
          <MiniCanvas label="" colorA="#a855f7" colorB="#4d9fff" seed={5.1} />
        </div>
      </div>
    </div>
  );
}
