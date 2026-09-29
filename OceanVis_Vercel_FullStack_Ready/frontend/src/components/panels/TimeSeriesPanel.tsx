import React, { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { useOceanStore } from "../../store/oceanStore";
import { api } from "../../services/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Brush } from "recharts";

interface TsData { series: { time: string; observation: number; model: number }[]; unit: string }

export default function TimeSeriesPanel() {
  const { selectedVariable, variables } = useOceanStore();
  const [data, setData] = useState<TsData | null>(null);
  const curVar = variables.find(v => v.id === selectedVariable);

  useEffect(() => {
    api.timeseries(selectedVariable, 12.5, 72.1).then(d => setData(d as TsData)).catch(() => {});
  }, [selectedVariable]);

  return (
    <div style={{ flex: 1.2, minWidth: 0, background: "var(--bg-panel)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="panel-header" style={{ fontSize: 10, padding: "4px 8px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <TrendingUp size={11} color="#4d9fff" />
          Time Series Analysis
        </span>
        <span style={{ fontSize: 9, color: "var(--text-muted)" }}>12.5°N, 72.1°E</span>
      </div>
      {/* Controls */}
      <div style={{ display: "flex", gap: 4, padding: "3px 6px", borderBottom: "1px solid var(--border)" }}>
        <select className="select" style={{ fontSize: 9, padding: "2px 4px" }}>
          <option>Sea Surface Temperature</option>
          <option>Salinity</option>
          <option>Currents</option>
        </select>
        <select className="select" style={{ fontSize: 9, padding: "2px 4px" }}>
          <option>12.5°N, 72.1°E</option>
        </select>
        {["1M", "3M", "1Y", "Custom"].map(p => (
          <button key={p} className="btn btn-ghost" style={{ fontSize: 9, padding: "2px 5px" }}>{p}</button>
        ))}
      </div>
      <div style={{ flex: 1, padding: "4px 0" }}>
        {data && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.series} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1a3a5c44" />
              <XAxis dataKey="time" tick={{ fill: "#7aa3cc", fontSize: 8 }} />
              <YAxis tick={{ fill: "#7aa3cc", fontSize: 8 }} />
              <Tooltip contentStyle={{ background: "#0a1e34", border: "1px solid #1a3a5c", fontSize: 10 }} />
              <Line type="monotone" dataKey="observation" stroke="#ff6b35" dot={{ r: 2 }} strokeWidth={1.5} name="Observation (ARGO)" />
              <Line type="monotone" dataKey="model" stroke="#4d9fff" dot={false} strokeWidth={1.5} strokeDasharray="4 2" name="Model (HYCOM)" />
            </LineChart>
          </ResponsiveContainer>
        )}
        {!data && <div style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "center", paddingTop: 20 }}>Loading...</div>}
      </div>
    </div>
  );
}
