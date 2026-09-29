import React, { useEffect, useState } from "react";
import { BarChart2, Download, Check } from "lucide-react";
import { useOceanStore } from "../../store/oceanStore";
import { api } from "../../services/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export default function ProfilePanel() {
  const { selectedObservation, observations } = useOceanStore();
  const obs = selectedObservation ?? observations[0];
  const [profile, setProfile] = useState<Record<string, number>[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

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
    salinity: p.salinityObs,
  }));

  const handleDownloadCsv = () => {
    if (!obs || !profile.length) return;
    const header = "depth_m,temperature_obs_C,temperature_model_C,salinity_obs_psu,salinity_model_psu,oxygen_obs_umol_kg\n";
    const rows = profile.map(p =>
      `${p.depth},${p.temperatureObs ?? ""},${p.temperatureModel ?? ""},${p.salinityObs ?? ""},${p.salinityModel ?? ""},${p.oxygenObs ?? ""}`
    ).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${obs.id}_vertical_profile.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div style={{ flex: 1, minWidth: 0, background: "var(--bg-panel)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="panel-header" style={{ fontSize: 10, padding: "4px 8px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <BarChart2 size={11} color="#a855f7" />
          Vertical CTD / Argo Profile
        </span>
        {obs && <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600 }}>{obs.id}</span>}
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Chart */}
        <div style={{ flex: 1, padding: "4px 0" }}>
          {loading && <div style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "center", paddingTop: 30 }}>Loading profile data...</div>}
          {!loading && chartData.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} layout="vertical" margin={{ top: 4, right: 12, left: 10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#14263b" />
                <XAxis type="number" domain={["auto", "auto"]} tick={{ fill: "#7aa3cc", fontSize: 9 }} unit="°C" />
                <YAxis type="number" dataKey="depth" tick={{ fill: "#7aa3cc", fontSize: 9 }} unit="m" />
                <Tooltip
                  contentStyle={{ background: "#0a1e34", border: "1px solid #1a3a5c", borderRadius: 4, fontSize: 10 }}
                  labelStyle={{ color: "#7aa3cc" }}
                />
                <Legend wrapperStyle={{ fontSize: 9, bottom: 0 }} />
                <Line type="monotone" dataKey="obs" stroke="#ff9f43" dot={false} strokeWidth={2} name="In-situ Observation" />
                <Line type="monotone" dataKey="model" stroke="#00d4ff" dot={false} strokeWidth={1.5} strokeDasharray="4 2" name="Copernicus Model" />
              </LineChart>
            </ResponsiveContainer>
          )}
          {!loading && chartData.length === 0 && (
            <div style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "center", paddingTop: 30 }}>
              {obs ? "Profile synchronized from Argo GDAC." : "Select an observation station."}
            </div>
          )}
        </div>

        {/* Station info card */}
        {obs && (
          <div style={{ width: 110, padding: "6px", borderLeft: "1px solid var(--border)", fontSize: 10, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ color: "var(--text-muted)", marginBottom: 4, fontWeight: 700, fontSize: 8 }}>STATION METADATA</div>
              {[
                ["Station ID", obs.id],
                ["Platform", obs.type],
                ["Latitude", `${Math.abs(obs.lat).toFixed(1)}°${obs.lat >= 0 ? "N" : "S"}`],
                ["Longitude", `${Math.abs(obs.lon).toFixed(1)}°${obs.lon >= 0 ? "E" : "W"}`],
                ["Date", obs.date],
                ["Max Depth", `${obs.maxDepth} m`],
              ].map(([k, v]) => (
                <div key={k} style={{ marginBottom: 3 }}>
                  <div style={{ color: "var(--text-muted)", fontSize: 7 }}>{k}</div>
                  <div style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 9 }}>{v}</div>
                </div>
              ))}
            </div>

            <button
              className="btn btn-primary"
              onClick={handleDownloadCsv}
              style={{ width: "100%", fontSize: 9, padding: "4px 6px", justifyContent: "center", gap: 4 }}
              title="Download vertical profile as CSV"
            >
              {downloaded ? <Check size={10} color="#00d47a" /> : <Download size={10} />}
              {downloaded ? "Saved!" : "Download CSV"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
