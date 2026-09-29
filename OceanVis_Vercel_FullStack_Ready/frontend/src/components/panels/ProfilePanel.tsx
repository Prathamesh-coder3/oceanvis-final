import React, { useEffect, useState } from "react";
import { BarChart2, Download } from "lucide-react";
import { useOceanStore } from "../../store/oceanStore";
import { api } from "../../services/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function ProfilePanel() {
  const { selectedObservation, observations } = useOceanStore();
  const obs = selectedObservation ?? observations[0];
  const [profile, setProfile] = useState<Record<string, number>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!obs) return;
    setLoading(true);
    api.profile(obs.id)
      .then((d: unknown) => {
        const data = d as { profile: Record<string, number>[] };
        setProfile(data.profile ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [obs?.id]);

  const chartData = profile.map(p => ({
    depth: -p.depth,
    obs: p.temperatureObs,
    model: p.temperatureModel,
  }));

  return (
    <div style={{ flex: 1, minWidth: 0, background: "var(--bg-panel)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="panel-header" style={{ fontSize: 10, padding: "4px 8px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <BarChart2 size={11} color="#a855f7" />
          Vertical Profile (Observation)
        </span>
        {obs && <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{obs.id}</span>}
      </div>
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Chart */}
        <div style={{ flex: 1, padding: "4px 0" }}>
          {loading && <div style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "center", paddingTop: 20 }}>Loading...</div>}
          {!loading && chartData.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <XAxis type="number" dataKey="obs" domain={[15, 32]} tick={{ fill: "#7aa3cc", fontSize: 9 }} />
                <YAxis type="number" dataKey="depth" tick={{ fill: "#7aa3cc", fontSize: 9 }} />
                <Tooltip
                  contentStyle={{ background: "#0a1e34", border: "1px solid #1a3a5c", borderRadius: 4, fontSize: 10 }}
                  labelStyle={{ color: "#7aa3cc" }}
                />
                <Line type="monotone" dataKey="obs" stroke="#ff6b35" dot={false} strokeWidth={1.5} name="Obs (ARGO)" />
                <Line type="monotone" dataKey="model" stroke="#4d9fff" dot={false} strokeWidth={1.5} strokeDasharray="4 2" name="Model (HYCOM)" />
              </LineChart>
            </ResponsiveContainer>
          )}
          {!loading && chartData.length === 0 && (
            <div style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "center", paddingTop: 20 }}>
              {obs ? "No profile data" : "Select an observation"}
            </div>
          )}
        </div>
        {/* Station info */}
        {obs && (
          <div style={{ width: 100, padding: "4px 6px", borderLeft: "1px solid var(--border)", fontSize: 10 }}>
            <div style={{ color: "var(--text-muted)", marginBottom: 4, fontWeight: 600, fontSize: 9 }}>STATION INFO</div>
            {[
              ["Who ID", obs.id],
              ["Type", obs.type],
              ["Lat", `${obs.lat}°N`],
              ["Lon", `${obs.lon}°E`],
              ["Date", obs.date],
              ["Max Depth", `${obs.maxDepth} m`],
            ].map(([k, v]) => (
              <div key={k} style={{ marginBottom: 3 }}>
                <div style={{ color: "var(--text-muted)", fontSize: 8 }}>{k}</div>
                <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{v}</div>
              </div>
            ))}
            <div style={{ marginTop: 4 }}>
              <div style={{ color: "var(--text-muted)", fontSize: 8, marginBottom: 3 }}>Parameters</div>
              {obs.variables.map(v => (
                <div key={v} style={{ fontSize: 9, color: "var(--text-secondary)", marginBottom: 1 }}>• {v}</div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ width: "100%", marginTop: 8, fontSize: 9, padding: "3px" }}>
              <Download size={9} /> Download
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
