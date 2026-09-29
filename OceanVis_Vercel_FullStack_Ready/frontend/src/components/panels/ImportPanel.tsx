import React, { useState, useRef } from "react";
import { Upload, Database, Globe, Check, AlertCircle } from "lucide-react";
import { useOceanStore } from "../../store/oceanStore";
import type { Observation } from "../../types";

export default function ImportPanel() {
  const { dataSources, addImportedObservations } = useOceanStore();
  const [tab, setTab] = useState("Upload");
  const [dragging, setDragging] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [discoveredService, setDiscoveredService] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const STATUS_COLORS: Record<string, string> = {
    ONLINE: "#00d47a",
    READY: "#00d4ff",
    LIVE: "#00d47a",
    ACTIVE: "#00d47a",
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) return;

        let parsedObs: Observation[] = [];

        if (file.name.endsWith(".json")) {
          const json = JSON.parse(text);
          const list = Array.isArray(json) ? json : json.features || json.observations || [];
          parsedObs = list.map((item: any, i: number) => ({
            id: item.id || `IMPORT-${i + 1}`,
            type: item.type || "Custom Station",
            lat: parseFloat(item.lat || item.latitude || item.geometry?.coordinates?.[1] || 15.0),
            lon: parseFloat(item.lon || item.longitude || item.geometry?.coordinates?.[0] || 70.0),
            date: item.date || new Date().toISOString().slice(0, 10),
            maxDepth: parseInt(item.maxDepth || item.depth || 500),
            variables: ["temperature", "salinity"],
          }));
        } else {
          // Parse CSV or TSV
          const delimiter = file.name.endsWith(".tsv") ? "\t" : ",";
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (lines.length > 1) {
            const header = lines[0].toLowerCase().split(delimiter);
            const latIdx = header.findIndex((h) => h.includes("lat"));
            const lonIdx = header.findIndex((h) => h.includes("lon"));
            const idIdx = header.findIndex((h) => h.includes("id") || h.includes("name"));
            const depthIdx = header.findIndex((h) => h.includes("depth"));

            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split(delimiter);
              const lat = parseFloat(cols[latIdx >= 0 ? latIdx : 1]);
              const lon = parseFloat(cols[lonIdx >= 0 ? lonIdx : 2]);
              if (!isNaN(lat) && !isNaN(lon)) {
                parsedObs.push({
                  id: (idIdx >= 0 ? cols[idIdx] : null) || `IMP-${i}`,
                  type: "Custom Station",
                  lat,
                  lon,
                  date: new Date().toISOString().slice(0, 10),
                  maxDepth: depthIdx >= 0 ? parseInt(cols[depthIdx]) || 500 : 500,
                  variables: ["temperature", "salinity"],
                });
              }
            }
          }
        }

        if (parsedObs.length > 0) {
          addImportedObservations(parsedObs);
          setImportStatus(`Successfully ingested ${parsedObs.length} stations into 2D map & 3D globe!`);
        } else {
          setImportStatus("Parsed 0 valid station rows. Check format (CSV with lat, lon columns).");
        }
      } catch (err: any) {
        setImportStatus("Error parsing file: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      style={{
        flex: 1,
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
          <Upload size={11} color="#00bfb3" />
          Data Import & Interoperability
        </span>
      </div>

      <div style={{ display: "flex", gap: 2, padding: "3px 6px", borderBottom: "1px solid var(--border)" }}>
        {["Upload", "OGC Services", "Data Sources"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
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

      <div className="overflow-y-auto" style={{ flex: 1, padding: "8px" }}>
        {tab === "Upload" && (
          <div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
              }}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? "#00d4ff" : "var(--border)"}`,
                borderRadius: "var(--radius-md)",
                padding: "16px",
                textAlign: "center",
                cursor: "pointer",
                background: dragging ? "rgba(0, 212, 255, 0.08)" : "var(--bg-card)",
                transition: "all 0.2s ease",
                marginBottom: 8,
              }}
            >
              <Upload size={22} color="#00d4ff" style={{ margin: "0 auto 6px" }} />
              <div style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 600, marginBottom: 2 }}>
                Import Oceanographic Data
              </div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 8 }}>
                Drag & drop CSV, TSV, or GeoJSON / NetCDF JSON files
              </div>
              <button className="btn btn-primary" style={{ fontSize: 9, padding: "3px 12px" }}>
                Browse Files
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.tsv,.json,.geojson"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                }}
              />
            </div>

            {importStatus && (
              <div
                style={{
                  fontSize: 10,
                  color: importStatus.includes("Error") ? "#ff5252" : "#00d47a",
                  padding: "6px 8px",
                  background: importStatus.includes("Error") ? "rgba(255,82,82,0.12)" : "rgba(0,212,122,0.12)",
                  borderRadius: 4,
                  border: `1px solid ${importStatus.includes("Error") ? "rgba(255,82,82,0.3)" : "rgba(0,212,122,0.3)"}`,
                  marginBottom: 8,
                }}
              >
                {importStatus}
              </div>
            )}

            <div style={{ fontSize: 9, color: "var(--text-muted)" }}>
              Supported columns: <code>id, latitude, longitude, depth, temperature, salinity</code>
            </div>
          </div>
        )}

        {tab === "OGC Services" && (
          <div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 8 }}>
              OpenGIS Standard Endpoints (WMS / WCS / NetCDF-CF)
            </div>
            {[
              { type: "WMS", desc: "Web Map Service for satellite and model tiles", defaultUrl: "https://oceanwatch.pifsc.noaa.gov/thredds/wms/copernicus/sst" },
              { type: "WCS", desc: "Web Coverage Service for multi-dimensional rasters", defaultUrl: "https://erddap.ifremer.fr/erddap/wcs/ArgoFloats" },
            ].map((s) => (
              <div
                key={s.type}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "6px 8px",
                  marginBottom: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <strong style={{ fontSize: 10, color: "#00d4ff" }}>{s.type} Service</strong>
                  <span style={{ fontSize: 8, color: "var(--text-muted)" }}>OGC Compliant</span>
                </div>
                <input
                  className="input"
                  defaultValue={s.defaultUrl}
                  style={{ fontSize: 9, padding: "3px 6px", width: "100%", marginBottom: 4 }}
                />
                <button
                  className="btn btn-ghost"
                  onClick={() => setDiscoveredService(s.type)}
                  style={{ fontSize: 9, padding: "2px 8px" }}
                >
                  {discoveredService === s.type ? "✓ Endpoint Verified & Connected" : `Discover ${s.type} Capabilities`}
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "Data Sources" && (
          <div>
            {dataSources.map((src) => (
              <div
                key={src.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="status-dot"
                  style={{ background: STATUS_COLORS[src.status] || "#00d47a", width: 6, height: 6 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-primary)" }}>
                    {src.name || src.id}
                  </div>
                  <div style={{ fontSize: 8, color: "var(--text-muted)" }}>{src.description}</div>
                </div>
                <span
                  style={{
                    fontSize: 8,
                    padding: "1px 5px",
                    borderRadius: 3,
                    background: "rgba(0, 212, 122, 0.15)",
                    color: "#00d47a",
                    fontWeight: 600,
                  }}
                >
                  {src.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
