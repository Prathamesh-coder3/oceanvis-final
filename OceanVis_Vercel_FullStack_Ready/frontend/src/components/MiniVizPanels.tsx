import React, { useRef, useEffect } from "react";
import { useOceanStore } from "../store/oceanStore";

function MiniCanvas({
  colorA,
  colorB,
  seed
}: {
  colorA: string;
  colorB: string;
  seed: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const W = (c.width = c.offsetWidth || 80);
    const H = (c.height = c.offsetHeight || 44);

    const grad = ctx.createLinearGradient(0, H, W, 0);
    grad.addColorStop(0, colorA + "cc");
    grad.addColorStop(1, colorB + "cc");
    ctx.fillStyle = "#020a16";
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < W; i += 3) {
      for (let j = 0; j < H; j += 3) {
        const v = Math.abs(Math.sin(i * 0.25 + seed) * Math.cos(j * 0.25 + seed * 1.3));
        ctx.fillStyle = `hsla(${190 + v * 60}, 85%, ${35 + v * 35}%, ${0.25 + v * 0.45})`;
        ctx.fillRect(i, j, 3, 3);
      }
    }
  }, [colorA, colorB, seed]);

  return (
    <canvas
      ref={ref}
      style={{ width: "100%", height: 42, display: "block", borderRadius: "0 0 4px 4px" }}
    />
  );
}

export default function MiniVizPanels() {
  const { setSelectedVariable, setActiveView } = useOceanStore();

  const previews = [
    {
      label: "Current Vectors ↗",
      varId: "currents",
      colorA: "#00d4ff",
      colorB: "#1e6fff",
      seed: 1.2,
    },
    {
      label: "Chlorophyll-a ↗",
      varId: "chlorophyll",
      colorA: "#00d47a",
      colorB: "#006837",
      seed: 2.5,
    },
    {
      label: "Sea Surface Height ↗",
      varId: "ssh",
      colorA: "#ffd11a",
      colorB: "#ff8c1a",
      seed: 3.7,
    },
    {
      label: "Mixed Layer Depth ↗",
      varId: "mld",
      colorA: "#a855f7",
      colorB: "#4d9fff",
      seed: 5.1,
    },
  ];

  return (
    <div style={{ padding: "6px 8px", flex: 1, overflow: "hidden" }}>
      <div
        style={{
          fontSize: 10,
          color: "var(--text-muted)",
          marginBottom: 5,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        Quick Variable Switch
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
        {previews.map((p) => (
          <div
            key={p.label}
            onClick={() => {
              setSelectedVariable(p.varId);
            }}
            style={{
              background: "var(--bg-card)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              overflow: "hidden",
              cursor: "pointer",
              transition: "transform 0.15s ease, border-color 0.15s ease",
            }}
            title={`Switch to ${p.label}`}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "var(--text-secondary)",
                padding: "3px 6px",
                borderBottom: "1px solid var(--border)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {p.label}
            </div>
            <MiniCanvas colorA={p.colorA} colorB={p.colorB} seed={p.seed} />
          </div>
        ))}
      </div>
    </div>
  );
}
