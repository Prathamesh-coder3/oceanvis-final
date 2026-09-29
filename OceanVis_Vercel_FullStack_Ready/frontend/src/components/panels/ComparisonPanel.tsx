import React, { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { useOceanStore } from "../../store/oceanStore";
import { api } from "../../services/api";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface CompData { bias: number; mae: number; rmse: number; correlation: number; data: {obs: number; model: number}[] }

export default function ComparisonPanel() {
  const { selectedVariable, variables } = useOceanStore();
  const [tab, setTab] = useState("Statistics");
  const [data, setData] = useState<CompData | null>(null);
  const curVar = variables.find(v => v.id === selectedVariable);

  useEffect(() => {
    api.comparison(selectedVariable).then((d) => setData(d as CompData)).catch(() => {});
  }, [selectedVariable]);

  return (
    <div style={{ flex: 1.2, minWidth: 0, background: "var(--bg-panel)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="panel-header" style={{ fontSize: 10, padding: "4px 8px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <BarChart3 size={11} color="#00bfb3" />
          Model vs Observation Comparison
        </span>
      </div>
      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 2, padding: "3px 6px", borderBottom: "1px solid var(--border)" }}>
        {["Profile", "Statistics", "Time Series", "Map View"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontSize: 9, padding: "2px 6px", borderRadius: 3, cursor: "pointer",
            background: tab === t ? "var(--accent-blue)22" : "transparent",
            border: tab === t ? "1px solid var(--accent-blue)44" : "1px solid transparent",
            color: tab === t ? "var(--accent-blue)" : "var(--text-muted)"
          }}>{t}</button>
        ))}
      </div>
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Metrics */}
        <div style={{ width: 110, padding: "6px", borderRight: "1px solid var(--border)" }}>
          <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 5, fontWeight: 600 }}>
            VARIABLE: {curVar?.name}
          </div>
          {data && [
            { label: "Bias", val: data.bias.toFixed(2), unit: curVar?.unit ?? "°C", color: data.bias > 0 ? "#ff8c1a" : "#4d9fff" },
            { label: "MAE", val: data.mae.toFixed(2), unit: curVar?.unit ?? "°C", color: "#ff6b35" },
            { label: "RMSE", val: data.rmse.toFixed(2), unit: curVar?.unit ?? "°C", color: "#ff3d5a" },
            { label: "Correlation", val: data.correlation.toFixed(2), unit: "", color: "#00d47a" },
          ].map(m => (
            <div key={m.label} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{m.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: m.color, lineHeight: 1.1 }}>
                {m.val} <span style={{ fontSize: 10 }}>{m.unit}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Scatter */}
        <div style={{ flex: 1 }}>
          {data && (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <XAxis dataKey="obs" name="Observation" tick={{ fill: "#7aa3cc", fontSize: 8 }} label={{ value: "Obs", fill: "#7aa3cc", fontSize: 9, position: "insideBottom", offset: -2 }} />
                <YAxis dataKey="model" name="Model" tick={{ fill: "#7aa3cc", fontSize: 8 }} label={{ value: "Model", fill: "#7aa3cc", fontSize: 9, angle: -90, position: "insideLeft" }} />
                <Tooltip contentStyle={{ background: "#0a1e34", border: "1px solid #1a3a5c", fontSize: 10 }} />
                <ReferenceLine x={curVar?.min} y={curVar?.min} stroke="#1e6fff22" />
                <Scatter data={data.data} fill="#ff6b35" opacity={0.7} r={3} />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
