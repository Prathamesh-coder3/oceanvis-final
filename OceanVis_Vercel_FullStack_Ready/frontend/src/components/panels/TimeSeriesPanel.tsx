import React, { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { useOceanStore } from "../../store/oceanStore";
import { api } from "../../services/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

interface TsData {
  series: { time: string; observation: number; model: number }[];
  unit: string;
}

const LOCATIONS = [
  { label: "Arabian Sea (14.2°N, 68.5°E)", lat: 14.2, lon: 68.5 },
  { label: "Bay of Bengal (15.0°N, 90.0°E)", lat: 15.0, lon: 90.0 },
  { label: "Equatorial Jet (0.0°N, 80.5°E)", lat: 0.0, lon: 80.5 },
  { label: "Lakshadweep (10.8°N, 72.2°E)", lat: 10.8, lon: 72.2 },
];

export default function TimeSeriesPanel() {
  const { selectedVariable, setSelectedVariable, variables } = useOceanStore();
  const [data, setData] = useState<TsData | null>(null);
  const [locIndex, setLocIndex] = useState(0);
  const [timeRange, setTimeRange] = useState<"1M" | "3M" | "1Y">("1Y");
  const [loading, setLoading] = useState(false);

  const curVar = variables.find((v) => v.id === selectedVariable);
  const activeLoc = LOCATIONS[locIndex];

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .timeseries(selectedVariable, activeLoc.lat, activeLoc.lon)
      .then((d) => {
        if (alive) setData(d as TsData);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [selectedVariable, activeLoc.lat, activeLoc.lon]);

  const filteredSeries = data?.series
    ? timeRange === "1M"
      ? data.series.slice(-2)
      : timeRange === "3M"
      ? data.series.slice(-4)
      : data.series
    : [];

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
          <TrendingUp size={11} color="#4d9fff" />
          Oceanographic Time Series
        </span>
        <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600 }}>
          {activeLoc.label}
        </span>
      </div>

      {/* Interactive Controls */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "3px 6px",
          borderBottom: "1px solid var(--border)",
          alignItems: "center",
        }}
      >
        <select
          className="select"
          style={{ fontSize: 9, padding: "2px 4px" }}
          value={selectedVariable}
          onChange={(e) => setSelectedVariable(e.target.value)}
        >
          {variables.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>

        <select
          className="select"
          style={{ fontSize: 9, padding: "2px 4px", flex: 1 }}
          value={locIndex}
          onChange={(e) => setLocIndex(Number(e.target.value))}
        >
          {LOCATIONS.map((loc, i) => (
            <option key={loc.label} value={i}>
              {loc.label}
            </option>
          ))}
        </select>

        {(["1M", "3M", "1Y"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setTimeRange(p)}
            className={`btn btn-ghost ${timeRange === p ? "active-region" : ""}`}
            style={{ fontSize: 9, padding: "2px 6px" }}
          >
            {p}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: "4px 6px" }}>
        {loading && (
          <div style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "center", paddingTop: 30 }}>
            Fetching time series from Copernicus Marine...
          </div>
        )}

        {!loading && filteredSeries.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredSeries} margin={{ top: 6, right: 12, left: -10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#162c46" />
              <XAxis dataKey="time" tick={{ fill: "#7aa3cc", fontSize: 8 }} />
              <YAxis tick={{ fill: "#7aa3cc", fontSize: 8 }} unit={curVar?.unit || "°C"} />
              <Tooltip contentStyle={{ background: "#0a1e34", border: "1px solid #1a3a5c", fontSize: 10, borderRadius: 4 }} />
              <Legend wrapperStyle={{ fontSize: 9, bottom: 0 }} />
              <Line
                type="monotone"
                dataKey="observation"
                stroke="#ff9f43"
                dot={{ r: 2.5 }}
                strokeWidth={1.8}
                name="In-situ Observation"
              />
              <Line
                type="monotone"
                dataKey="model"
                stroke="#00d4ff"
                dot={false}
                strokeWidth={1.8}
                strokeDasharray="4 2"
                name="Copernicus Assimilation"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
