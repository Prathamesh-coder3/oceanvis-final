import React, { useEffect, useState } from "react";
import { BarChart3, ScatterChart as ScatterIcon, Layers } from "lucide-react";
import { useOceanStore } from "../../store/oceanStore";
import { api } from "../../services/api";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, LineChart, Line, CartesianGrid
} from "recharts";

interface CompData {
  bias: number;
  mae: number;
  rmse: number;
  correlation: number;
  data: { obs: number; model: number }[];
  unit: string;
}

export default function ComparisonPanel() {
  const { selectedVariable, variables, setActiveView } = useOceanStore();
  const [tab, setTab] = useState("Statistics");
  const [data, setData] = useState<CompData | null>(null);
  const [loading, setLoading] = useState(false);
  const curVar = variables.find((v) => v.id === selectedVariable);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .comparison(selectedVariable)
      .then((d) => {
        if (alive) setData(d as CompData);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedVariable]);

  return (
    <div
      style={{
        flex: 1.2,
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
          <BarChart3 size={12} color="#00bfb3" />
          Model vs Observation Validation
        </span>
        <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600 }}>
          {curVar?.name || selectedVariable}
        </span>
      </div>

      {/* Sub-tabs */}
      <div
        style={{
          display: "flex",
          gap: 2,
          padding: "3px 6px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {["Statistics", "Profile", "Time Series", "Map View"].map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              if (t === "Time Series") setActiveView("timeseries");
              if (t === "Map View") setActiveView("map-2d");
            }}
            style={{
              fontSize: 9,
              padding: "2px 6px",
              borderRadius: 3,
              cursor: "pointer",
              background: tab === t ? "rgba(0, 212, 255, 0.16)" : "transparent",
              border: tab === t ? "1px solid rgba(0, 212, 255, 0.4)" : "1px solid transparent",
              color: tab === t ? "#00d4ff" : "var(--text-muted)",
              fontWeight: tab === t ? 600 : 400,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Validation Error Metrics Column */}
        <div
          style={{
            width: 115,
            padding: "8px 6px",
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700 }}>
            METRICS
          </div>
          {data &&
            [
              {
                label: "Bias",
                val: (data.bias >= 0 ? "+" : "") + data.bias.toFixed(2),
                unit: curVar?.unit ?? "°C",
                color: Math.abs(data.bias) < 0.2 ? "#00d47a" : "#ff9f43",
              },
              {
                label: "MAE",
                val: data.mae.toFixed(2),
                unit: curVar?.unit ?? "°C",
                color: "#ff9f43",
              },
              {
                label: "RMSE",
                val: data.rmse.toFixed(2),
                unit: curVar?.unit ?? "°C",
                color: "#ff5252",
              },
              {
                label: "Pearson r",
                val: data.correlation.toFixed(2),
                unit: "",
                color: "#00d47a",
              },
            ].map((m) => (
              <div key={m.label} style={{ marginBottom: 2 }}>
                <div style={{ fontSize: 8, color: "var(--text-muted)" }}>{m.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: m.color, lineHeight: 1.1 }}>
                  {m.val}{" "}
                  <span style={{ fontSize: 9, color: "var(--text-secondary)" }}>{m.unit}</span>
                </div>
              </div>
            ))}
        </div>

        {/* Scatter Chart or Curves */}
        <div style={{ flex: 1, padding: "6px" }}>
          {loading && (
            <div style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "center", paddingTop: 30 }}>
              Computing validation metrics...
            </div>
          )}

          {!loading && data && tab === "Statistics" && (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <XAxis
                  dataKey="obs"
                  name="Observation"
                  tick={{ fill: "#7aa3cc", fontSize: 8 }}
                  label={{ value: "Observed", fill: "#7aa3cc", fontSize: 9, position: "insideBottom", offset: -2 }}
                />
                <YAxis
                  dataKey="model"
                  name="Model"
                  tick={{ fill: "#7aa3cc", fontSize: 8 }}
                  label={{ value: "Model", fill: "#7aa3cc", fontSize: 9, angle: -90, position: "insideLeft" }}
                />
                <Tooltip
                  contentStyle={{ background: "#0a1e34", border: "1px solid #1a3a5c", fontSize: 10, borderRadius: 4 }}
                />
                <ReferenceLine stroke="rgba(0, 212, 255, 0.3)" strokeDasharray="3 3" />
                <Scatter data={data.data} fill="#ff9f43" opacity={0.75} r={3} />
              </ScatterChart>
            </ResponsiveContainer>
          )}

          {!loading && data && tab === "Profile" && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.data.slice(0, 15).map((d, i) => ({ depth: -i * 50, obs: d.obs, model: d.model }))}
                layout="vertical"
                margin={{ top: 8, right: 8, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#162c46" />
                <XAxis type="number" tick={{ fill: "#7aa3cc", fontSize: 8 }} />
                <YAxis type="number" dataKey="depth" tick={{ fill: "#7aa3cc", fontSize: 8 }} />
                <Tooltip contentStyle={{ background: "#0a1e34", border: "1px solid #1a3a5c", fontSize: 10 }} />
                <Line type="monotone" dataKey="obs" stroke="#ff9f43" strokeWidth={1.5} dot={{ r: 2 }} name="In-situ Obs" />
                <Line type="monotone" dataKey="model" stroke="#00d4ff" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="Model" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
