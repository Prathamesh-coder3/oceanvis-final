import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  LocateFixed, Minus, Plus, RotateCcw, Crosshair, Ruler,
  Layers, Grid2X2, Navigation, Wind, Eye, Check
} from "lucide-react";
import { useOceanStore } from "../store/oceanStore";
import { api } from "../services/api";
import type { Observation } from "../types";

const OBS_COLORS: Record<string, string> = {
  "ARGO Float": "#ff9f43",
  Glider: "#43d9ff",
  "CTD Station": "#e056fd",
  "BGC Sensor": "#2ed573",
  Mooring: "#ffd32a",
  Buoy: "#ff5252",
};

type ModelSlice = {
  gridSize: number;
  data: number[][];
  min: number;
  max: number;
  unit: string;
  variable: string;
  source: string;
  timestamp: string;
};

// Equirectangular projection: 180°W to 180°E -> 0 to 1440, 90°N to 90°S -> 0 to 720
const MAP_W = 1440;
const MAP_H = 720;

function geoToScreen(lon: number, lat: number): { x: number; y: number } {
  const x = ((lon + 180) / 360) * MAP_W;
  const y = ((90 - lat) / 180) * MAP_H;
  return { x, y };
}

function screenToGeo(x: number, y: number): { lon: number; lat: number } {
  const lon = (x / MAP_W) * 360 - 180;
  const lat = 90 - (y / MAP_H) * 180;
  return { lon, lat };
}

// Scientific Turbo Colormap matching Reference Image A:
// Blue (low) -> Cyan -> Emerald Green -> Warm Yellow -> Orange -> Deep Red (high)
function turboRgb(t: number): string {
  const c = Math.max(0, Math.min(1, t));
  const r = Math.floor(Math.min(255, Math.max(0, 255 * (1.4 * Math.sin(c * Math.PI * 1.3 - 0.4)))));
  const g = Math.floor(Math.min(255, Math.max(0, 255 * Math.sin(c * Math.PI))));
  const b = Math.floor(Math.min(255, Math.max(0, 255 * (1.3 * Math.cos(c * Math.PI * 1.2)))));
  return `rgb(${r},${g},${b})`;
}

// Global & Regional Major Ocean Current Streamlines
const STREAMLINE_CURVES: { name: string; pts: [number, number][] }[] = [
  // Somali Current
  { name: "Somali Current", pts: [[-3, 44], [2, 47], [7, 51], [12, 54], [17, 60], [21, 66], [20, 71], [16, 73]] },
  // Agulhas Current
  { name: "Agulhas Current", pts: [[-14, 50], [-19, 45], [-24, 39], [-29, 34], [-33, 28], [-37, 21], [-40, 23], [-42, 30], [-40, 38]] },
  // South Equatorial Current (Indian Ocean)
  { name: "South Equatorial Current", pts: [[-12, 110], [-12, 95], [-11, 80], [-10, 65], [-9, 52], [-10, 48]] },
  // Equatorial Countercurrent
  { name: "Equatorial Jet", pts: [[0, 52], [1, 62], [1, 72], [0, 82], [-1, 92], [0, 102]] },
  // Bay of Bengal Gyre
  { name: "Bay of Bengal Gyre", pts: [[8, 83], [12, 86], [16, 89], [19, 91], [19, 87], [16, 83], [12, 81], [8, 83]] },
  // Arabian Sea Gyre
  { name: "Arabian Sea Gyre", pts: [[11, 63], [14, 66], [17, 69], [18, 66], [16, 61], [12, 59], [11, 63]] },
  // Antarctic Circumpolar Current
  { name: "Antarctic Circumpolar Current 1", pts: [[-48, -40], [-49, -10], [-50, 20], [-51, 50], [-50, 80], [-49, 110], [-50, 140], [-51, 170]] },
  { name: "Antarctic Circumpolar Current 2", pts: [[-55, -30], [-56, 0], [-57, 30], [-58, 60], [-57, 90], [-56, 120], [-57, 150]] },
  // North Atlantic Gulf Stream
  { name: "Gulf Stream", pts: [[24, -80], [29, -78], [34, -75], [38, -68], [41, -55], [44, -42], [48, -30], [52, -20]] },
  // Kuroshio Current
  { name: "Kuroshio", pts: [[22, 122], [26, 126], [31, 131], [35, 140], [38, 148], [40, 158]] },
];

export default function MapView2D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const earthImgRef = useRef<HTMLImageElement | null>(null);
  const [earthImgLoaded, setEarthImgLoaded] = useState(false);

  const {
    observations,
    obsLayersEnabled,
    selectedRegion,
    selectedVariable,
    variables,
    selectedObservation,
    setSelectedObservation,
    depthIndex,
    depthAxis,
    timeAxis,
    timeIndex,
    setActiveView,
    layerOpacity,
    streamlinesEnabled,
    toggleStreamlines,
  } = useOceanStore();

  const [zoom, setZoom] = useState(1.4);
  const [pan, setPan] = useState({ x: -280, y: -40 }); // Centered on Indian Ocean & Arabian Sea
  const [drag, setDrag] = useState<{ x: number; y: number; px: number; py: number } | null>(null);
  const [tool, setTool] = useState<"select" | "measure" | "transect">("select");
  const [showGraticule, setShowGraticule] = useState(true);
  const [measureStart, setMeasureStart] = useState<{ lat: number; lon: number } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ lat: number; lon: number } | null>(null);
  const [mouseGeo, setMouseGeo] = useState<{ lat: number; lon: number } | null>(null);
  const [hoveredObs, setHoveredObs] = useState<Observation | null>(null);

  const [modelSlice, setModelSlice] = useState<ModelSlice | null>(null);
  const [fieldLoading, setFieldLoading] = useState(false);

  const curVar = variables.find((v) => v.id === selectedVariable);
  const visibleObs = useMemo(
    () => observations.filter((o) => obsLayersEnabled[o.type] ?? true),
    [observations, obsLayersEnabled]
  );

  // Region bounds centering
  const resetRegion = useCallback(() => {
    if (selectedRegion === "Arabian Sea") {
      setZoom(2.8);
      setPan({ x: -520, y: -130 });
    } else if (selectedRegion === "Bay of Bengal") {
      setZoom(2.8);
      setPan({ x: -680, y: -130 });
    } else {
      setZoom(1.5);
      setPan({ x: -320, y: -50 });
    }
  }, [selectedRegion]);

  useEffect(() => {
    resetRegion();
  }, [selectedRegion, resetRegion]);

  // Load high-resolution natural Earth satellite texture
  useEffect(() => {
    const img = new Image();
    img.src = "/earth_nasa_2048.jpg";
    img.onload = () => {
      earthImgRef.current = img;
      setEarthImgLoaded(true);
    };
  }, []);

  // Fetch model slice from API
  useEffect(() => {
    let alive = true;
    setFieldLoading(true);
    api
      .modelSlice(selectedVariable, depthIndex, timeIndex)
      .then((data) => {
        if (!alive) return;
        setModelSlice(data as ModelSlice);
      })
      .catch((e) => {
        console.warn("[OceanVis] Failed to load 2D slice:", e);
      })
      .finally(() => {
        if (alive) setFieldLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [selectedVariable, depthIndex, timeIndex]);

  // Great-circle distance calculation
  const measureDistanceKm = useMemo(() => {
    if (!measureStart || !measureEnd) return null;
    const rad = Math.PI / 180;
    const p1 = measureStart.lat * rad, p2 = measureEnd.lat * rad;
    const dp = (measureEnd.lat - measureStart.lat) * rad;
    const dl = (measureEnd.lon - measureStart.lon) * rad;
    const a =
      Math.sin(dp / 2) ** 2 +
      Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, [measureStart, measureEnd]);

  // Main 2D Canvas Render Pass (Scientific Equirectangular Map)
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (cw <= 0 || ch <= 0) return;

    const targetW = Math.floor(cw * dpr);
    const targetH = Math.floor(ch * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    // Deep abyssal background
    ctx.fillStyle = "#010814";
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    // Apply pan & zoom
    ctx.translate(cw / 2 + pan.x, ch / 2 + pan.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-MAP_W / 2, -MAP_H / 2);

    // 1. Draw Satellite Earth Base Map (Continents, topography, mountain relief, deserts)
    if (earthImgRef.current && earthImgLoaded) {
      ctx.drawImage(earthImgRef.current, 0, 0, MAP_W, MAP_H);
    }

    // 2. Draw Scientific Continuous Ocean Scalar Field (matching Reference Image A)
    if (modelSlice?.data && modelSlice.data.length > 0) {
      ctx.save();
      ctx.globalAlpha = (layerOpacity / 100.0) * 0.78;
      ctx.globalCompositeOperation = "color-dodge";

      const rows = modelSlice.data.length;
      const cols = modelSlice.data[0]?.length || 1;
      const minVal = modelSlice.min;
      const maxVal = modelSlice.max;
      const valRange = Math.max(1e-6, maxVal - minVal);

      // Map bounds: Arabian Sea, Indian Ocean, Bay of Bengal (-15 to 30 lat, 45 to 105 lon)
      const latMax = 30.0, latMin = -15.0;
      const lonMin = 45.0, lonMax = 105.0;

      for (let r = 0; r < rows; r++) {
        const lat0 = latMax - (r / rows) * (latMax - latMin);
        const lat1 = latMax - ((r + 1) / rows) * (latMax - latMin);
        for (let c = 0; c < cols; c++) {
          const lon0 = lonMin + (c / cols) * (lonMax - lonMin);
          const lon1 = lonMin + ((c + 1) / cols) * (lonMax - lonMin);

          const val = modelSlice.data[r]?.[c] ?? minVal;
          const t = Math.max(0, Math.min(1, (val - minVal) / valRange));

          const p0 = geoToScreen(lon0, lat0);
          const p1 = geoToScreen(lon1, lat1);

          ctx.fillStyle = turboRgb(t);
          ctx.fillRect(p0.x, p0.y, Math.abs(p1.x - p0.x) + 0.5, Math.abs(p1.y - p0.y) + 0.5);
        }
      }
      ctx.restore();
    }

    // 3. Graticule Lines & Latitude/Longitude Grid
    if (showGraticule) {
      ctx.save();
      ctx.strokeStyle = "rgba(100, 200, 255, 0.18)";
      ctx.lineWidth = 0.8;

      for (let lat = -60; lat <= 60; lat += 20) {
        const p = geoToScreen(-180, lat);
        ctx.beginPath();
        ctx.moveTo(0, p.y);
        ctx.lineTo(MAP_W, p.y);
        ctx.stroke();

        ctx.font = "500 9px Inter, sans-serif";
        ctx.fillStyle = "rgba(160, 220, 255, 0.65)";
        ctx.fillText(`${Math.abs(lat)}°${lat >= 0 ? "N" : "S"}`, 6, p.y - 2);
      }

      for (let lon = -180; lon < 180; lon += 30) {
        const p = geoToScreen(lon, 0);
        ctx.beginPath();
        ctx.moveTo(p.x, 0);
        ctx.lineTo(p.x, MAP_H);
        ctx.stroke();

        ctx.font = "500 9px Inter, sans-serif";
        ctx.fillStyle = "rgba(160, 220, 255, 0.65)";
        ctx.fillText(`${Math.abs(lon)}°${lon >= 0 ? "E" : "W"}`, p.x + 3, MAP_H - 8);
      }
      ctx.restore();
    }

    // 4. Directional Ocean Current Streamlines & Flow Vectors
    if (streamlinesEnabled) {
      ctx.save();
      STREAMLINE_CURVES.forEach((curve) => {
        const screenPts = curve.pts.map(([lat, lon]) => geoToScreen(lon, lat));
        if (screenPts.length < 2) return;

        // Draw streamline path
        ctx.strokeStyle = "rgba(140, 240, 255, 0.65)";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        screenPts.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // Draw current vectors with arrows
        for (let i = 0; i < screenPts.length - 1; i++) {
          const p1 = screenPts[i];
          const p2 = screenPts[i + 1];
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(midX, midY, 1.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "rgba(220, 255, 255, 0.9)";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(midX - Math.cos(angle - 0.45) * 5, midY - Math.sin(angle - 0.45) * 5);
          ctx.lineTo(midX, midY);
          ctx.lineTo(midX - Math.cos(angle + 0.45) * 5, midY - Math.sin(angle + 0.45) * 5);
          ctx.stroke();
        }
      });
      ctx.restore();
    }

    // 5. Geographic Ocean & Sea Labels
    const geoLabels: [number, number, string][] = [
      [19, 65, "Arabian Sea"],
      [15, 89, "Bay of Bengal"],
      [-6, 75, "Indian Ocean"],
      [22, 79, "India"],
      [-20, 47, "Madagascar"],
      [35, 14, "Mediterranean Sea"],
      [-55, 70, "Southern Ocean"],
    ];

    ctx.save();
    ctx.font = "700 13px Inter, sans-serif";
    ctx.fillStyle = "rgba(235, 248, 255, 0.88)";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 6;
    geoLabels.forEach(([lat, lon, txt]) => {
      const p = geoToScreen(lon, lat);
      ctx.fillText(txt, p.x, p.y);
    });
    ctx.restore();

    // 6. In-situ Observation Markers
    visibleObs.forEach((obs) => {
      const p = geoToScreen(obs.lon, obs.lat);
      const color = OBS_COLORS[obs.type] || "#ffffff";
      const isSel = selectedObservation?.id === obs.id;
      const isHov = hoveredObs?.id === obs.id;
      const size = isSel ? 7 : isHov ? 6 : 4.5;

      ctx.save();
      ctx.fillStyle = color;
      ctx.strokeStyle = "#020a16";
      ctx.lineWidth = 1.8;

      if (obs.type === "ARGO Float") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (obs.type === "Glider") {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - size * 1.3);
        ctx.lineTo(p.x + size, p.y + size * 0.8);
        ctx.lineTo(p.x - size, p.y + size * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (obs.type === "CTD Station") {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - size * 1.2);
        ctx.lineTo(p.x + size * 1.2, p.y);
        ctx.lineTo(p.x, p.y + size * 1.2);
        ctx.lineTo(p.x - size * 1.2, p.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.rect(p.x - size, p.y - size, size * 2, size * 2);
        ctx.fill();
        ctx.stroke();
      }

      if (isSel || isHov) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size + 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    });

    // 7. Measure Line if measuring
    if (measureStart) {
      const p1 = geoToScreen(measureStart.lon, measureStart.lat);
      ctx.fillStyle = "#00d4ff";
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 5, 0, Math.PI * 2);
      ctx.fill();

      if (measureEnd) {
        const p2 = geoToScreen(measureEnd.lon, measureEnd.lat);
        ctx.strokeStyle = "#00d4ff";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#ff9f43";
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }, [
    earthImgLoaded,
    modelSlice,
    showGraticule,
    streamlinesEnabled,
    visibleObs,
    selectedObservation,
    hoveredObs,
    zoom,
    pan,
    layerOpacity,
    measureStart,
    measureEnd,
  ]);

  useEffect(() => {
    drawMap();
  }, [drawMap]);

  // Pointer Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Convert mouse position to Geo
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const worldX = (mx - (cw / 2 + pan.x)) / zoom + MAP_W / 2;
    const worldY = (my - (ch / 2 + pan.y)) / zoom + MAP_H / 2;
    const geo = screenToGeo(worldX, worldY);

    if (tool === "measure") {
      if (!measureStart || measureEnd) {
        setMeasureStart(geo);
        setMeasureEnd(null);
      } else {
        setMeasureEnd(geo);
      }
      return;
    }

    if (tool === "transect") {
      setActiveView("transect");
      return;
    }

    // Check if clicked an observation
    if (hoveredObs) {
      setSelectedObservation(hoveredObs);
      return;
    }

    // Drag to pan
    setDrag({ x: pan.x, y: pan.y, px: e.clientX, py: e.clientY });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (drag) {
      setPan({
        x: drag.x + (e.clientX - drag.px),
        y: drag.y + (e.clientY - drag.py),
      });
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const worldX = (mx - (cw / 2 + pan.x)) / zoom + MAP_W / 2;
    const worldY = (my - (ch / 2 + pan.y)) / zoom + MAP_H / 2;
    const geo = screenToGeo(worldX, worldY);
    setMouseGeo(geo);

    // Hover detection on observations
    let found: Observation | null = null;
    for (const obs of visibleObs) {
      const p = geoToScreen(obs.lon, obs.lat);
      const screenX = (p.x - MAP_W / 2) * zoom + cw / 2 + pan.x;
      const screenY = (p.y - MAP_H / 2) * zoom + ch / 2 + pan.y;
      if (Math.hypot(screenX - mx, screenY - my) <= 12) {
        found = obs;
        break;
      }
    }
    setHoveredObs(found);
  };

  const handlePointerUp = () => {
    setDrag(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((z) => Math.max(1.0, Math.min(6.0, z * factor)));
  };

  return (
    <div
      ref={containerRef}
      className="map2d-view"
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* 2D Map Toolbar */}
      <div className="map-toolbar" style={{ zIndex: 10 }}>
        <div className="map-toolbar-left">
          <span className="map-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Layers size={14} color="#00d4ff" /> 2D Ocean Map
          </span>
          <span className="map-context">{selectedRegion}</span>
          <span className="map-context">
            {curVar?.name || "Sea Surface Temperature"} · {modelSlice?.unit || curVar?.unit || "°C"}
          </span>
          <span className="map-context">
            {depthAxis[depthIndex] != null ? `${depthAxis[depthIndex]} m` : "Surface"}
          </span>
          <span className="map-context">
            {timeAxis[timeIndex]?.label || "Live"}
          </span>
        </div>

        <div className="map-toolbar-actions">
          <button
            className={`btn-icon ${tool === "select" ? "active" : ""}`}
            title="Inspect / Select Observation"
            onClick={() => setTool("select")}
          >
            <LocateFixed size={13} />
          </button>
          <button
            className={`btn-icon ${tool === "measure" ? "active" : ""}`}
            title="Measure Great-Circle Distance"
            onClick={() => setTool("measure")}
          >
            <Ruler size={13} />
          </button>
          <button
            className={`btn-icon ${tool === "transect" ? "active" : ""}`}
            title="Transect Cross-Section"
            onClick={() => {
              setTool("transect");
              setActiveView("transect");
            }}
          >
            <Crosshair size={13} />
          </button>
          <button
            className={`btn-icon ${showGraticule ? "active" : ""}`}
            title="Toggle Graticule Grid"
            onClick={() => setShowGraticule((v) => !v)}
          >
            <Grid2X2 size={13} />
          </button>
          <button
            className={`btn-icon ${streamlinesEnabled ? "active" : ""}`}
            title="Toggle Current Streamlines"
            onClick={toggleStreamlines}
          >
            <Wind size={13} />
          </button>
          <button
            className="btn-icon"
            title="Zoom In"
            onClick={() => setZoom((z) => Math.min(6.0, z * 1.2))}
          >
            <Plus size={13} />
          </button>
          <button
            className="btn-icon"
            title="Zoom Out"
            onClick={() => setZoom((z) => Math.max(1.0, z / 1.2))}
          >
            <Minus size={13} />
          </button>
          <button className="btn-icon" title="Reset View" onClick={resetRegion}>
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Map Canvas Viewport */}
      <div
        className="map-canvas-wrap"
        style={{
          flex: 1,
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          cursor: drag ? "grabbing" : tool === "measure" ? "crosshair" : "grab",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />

        {/* Legend */}
        <div className="map-legend" style={{ zIndex: 12 }}>
          <div className="map-legend-title">
            <span>{curVar?.name || "Sea Surface Temperature"}</span>
            <span> · {modelSlice?.unit || curVar?.unit || "°C"}</span>
          </div>
          <div
            className="colormap-bar"
            style={{
              background: "linear-gradient(90deg, #101c5a 0%, #0099cc 25%, #10d070 50%, #ffcc00 75%, #e60000 100%)",
              height: 8,
              borderRadius: 4,
              margin: "5px 0",
              boxShadow: "0 0 10px rgba(0,212,255,0.3)",
            }}
          />
          <div className="map-legend-values">
            <span>{modelSlice?.min ?? curVar?.min ?? 16}</span>
            <span>{fieldLoading ? "Syncing..." : "Copernicus Marine"}</span>
            <span>{modelSlice?.max ?? curVar?.max ?? 32}</span>
          </div>
          <div className="map-legend-foot">
            <span><span className="legend-dot model" /> MODEL</span>
            <span><span className="legend-dot obs" /> OBS</span>
            <span><span className="legend-swatch current" /> CURRENTS</span>
          </div>
        </div>

        {/* North Arrow & Coordinate Inspector */}
        <div className="map-north-arrow" aria-hidden="true">
          <Navigation size={14} />
          <span>N</span>
        </div>

        <div className="map-scale-bar">
          <span>{mouseGeo ? `${Math.abs(mouseGeo.lat).toFixed(1)}°${mouseGeo.lat >= 0 ? "N" : "S"}, ${Math.abs(mouseGeo.lon).toFixed(1)}°${mouseGeo.lon >= 0 ? "E" : "W"}` : "45°E – 105°E"}</span>
          <div className="scale-line"><i /><i /><i /></div>
          <span>Zoom {zoom.toFixed(1)}×</span>
        </div>

        {/* Distance Measure Card */}
        {measureDistanceKm != null && (
          <div className="map-measure-card">
            <strong>{measureDistanceKm.toFixed(1)} km</strong>
            <span>Great-circle distance</span>
            <button
              className="btn-icon"
              onClick={() => {
                setMeasureStart(null);
                setMeasureEnd(null);
              }}
            >
              <RotateCcw size={10} />
            </button>
          </div>
        )}

        {/* Hovered Observation Card */}
        {hoveredObs && (
          <div
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              zIndex: 20,
              background: "rgba(4, 18, 36, 0.92)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(0, 212, 255, 0.4)",
              borderRadius: 8,
              padding: "8px 12px",
              color: "#e2f2ff",
              fontSize: 11,
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              pointerEvents: "none",
              minWidth: 190,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <strong style={{ color: "#00d4ff" }}>{hoveredObs.id}</strong>
              <span
                style={{
                  color: OBS_COLORS[hoveredObs.type] || "#fff",
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                {hoveredObs.type}
              </span>
            </div>
            <div>
              {Math.abs(hoveredObs.lat).toFixed(2)}°{hoveredObs.lat >= 0 ? "N" : "S"},{" "}
              {Math.abs(hoveredObs.lon).toFixed(2)}°{hoveredObs.lon >= 0 ? "E" : "W"}
            </div>
            <div>Depth: 0–{hoveredObs.maxDepth} m · {hoveredObs.date}</div>
          </div>
        )}
      </div>
    </div>
  );
}
