import React, { useState, useRef } from "react";
import { Upload, Database, Globe } from "lucide-react";
import { useOceanStore } from "../../store/oceanStore";

export default function ImportPanel() {
  const { dataSources } = useOceanStore();
  const [tab, setTab] = useState("Upload");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const STATUS_COLORS: Record<string, string> = { DEMO: "#1e6fff", LIVE: "#00d47a", UNAVAILABLE: "#3a6080", ERROR: "#ff3d5a" };

  return (
    <div style={{ flex: 1, minWidth: 0, background: "var(--bg-panel)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="panel-header" style={{ fontSize: 10, padding: "4px 8px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Upload size={11} color="#00bfb3" />
          Data Import & Interoperability
        </span>
      </div>
      <div style={{ display: "flex", gap: 2, padding: "3px 6px", borderBottom: "1px solid var(--border)" }}>
        {["Upload", "OGC Services", "Data Sources"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontSize: 9, padding: "2px 5px", borderRadius: 3, cursor: "pointer",
            background: tab === t ? "var(--accent-blue)22" : "transparent",
            border: tab === t ? "1px solid var(--accent-blue)44" : "1px solid transparent",
            color: tab === t ? "var(--accent-blue)" : "var(--text-muted)"
          }}>{t}</button>
        ))}
      </div>
      <div className="overflow-y-auto" style={{ flex: 1, padding: "6px" }}>
        {tab === "Upload" && (
          <div>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); setFile(e.dataTransfer.files[0] || null); }}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? "var(--accent-blue)" : "var(--border)"}`,
                borderRadius: "var(--radius-md)", padding: "12px", textAlign: "center",
                cursor: "pointer", background: dragging ? "var(--accent-blue)11" : "var(--bg-card)",
                transition: "var(--transition)", marginBottom: 6,
              }}
            >
              <Upload size={20} color="var(--text-muted)" style={{ margin: "0 auto 6px" }} />
              <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 3 }}>
                {file ? file.name : "Drag & drop NetCDF, CSV, or TSV files"}
              </div>
              <button className="btn btn-primary" style={{ fontSize: 9, padding: "3px 10px" }}>Browse Files</button>
              <input ref={inputRef} type="file" accept=".nc,.csv,.tsv" style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <div style={{ fontSize: 9, color: "var(--text-muted)" }}>
              Supported formats:
              {["NetCDF (.nc)", "CSV", "TSV", "GeoTIFF"].map(f => (
                <span key={f} style={{ margin: "0 4px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 3, padding: "1px 4px" }}>{f}</span>
              ))}
            </div>
          </div>
        )}
        {tab === "OGC Services" && (
          <div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 6 }}>WMS / WCS Services</div>
            {["WMS", "WCS", "NetCDF/CF"].map(s => (
              <div key={s} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "5px 7px", marginBottom: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 2 }}>{s}</div>
                <input className="input" placeholder={`Enter ${s} endpoint URL...`} style={{ fontSize: 9, padding: "2px 6px", marginBottom: 3 }} />
                <button className="btn btn-ghost" style={{ fontSize: 9, padding: "2px 8px" }}>Discover</button>
              </div>
            ))}
          </div>
        )}
        {tab === "Data Sources" && (
          <div>
            {dataSources.map(src => (
              <div key={src.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: "1px solid var(--border)44" }}>
                <div className="status-dot" style={{ background: STATUS_COLORS[src.status] || "#3a6080" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-primary)" }}>{src.id}</div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{src.description}</div>
                </div>
                <span style={{
                  fontSize: 8, padding: "1px 5px", borderRadius: 3,
                  background: STATUS_COLORS[src.status] + "22",
                  color: STATUS_COLORS[src.status], fontWeight: 600
                }}>{src.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
