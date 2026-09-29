import React, { useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, Minus, Plus, RotateCcw, Crosshair, Ruler, Layers, Grid2X2, Navigation } from "lucide-react";
import { useOceanStore } from "../store/oceanStore";
import { api } from "../services/api";
import type { Observation } from "../types";

const OBS_COLORS: Record<string, string> = {
  "ARGO Float": "#ff9f43", Glider: "#43d9ff", "CTD Station": "#d58cff",
  "BGC Sensor": "#4ee09a", Mooring: "#ffd166", Buoy: "#ff5d73",
};

const BOUNDS = { latMin: -10, latMax: 30, lonMin: 55, lonMax: 95 };

type ModelSlice = {
  gridSize: number;
  data: number[][];
  min: number;
  max: number;
  unit: string;
};

function project(lon: number, lat: number) {
  return { x: (lon + 180) / 360 * 1200, y: (90 - lat) / 180 * 600 };
}

function fieldColor(value: number, min: number, max: number) {
  const t = Math.max(0, Math.min(1, (value - min) / Math.max(1e-9, max - min)));
  const hue = 228 - t * 228;
  const sat = 86;
  const light = 43 + t * 13;
  return `hsl(${hue} ${sat}% ${light}%)`;
}

function formatLat(lat: number) { return `${Math.abs(lat).toFixed(0)}°${lat >= 0 ? "N" : "S"}`; }

export default function MapView2D() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { observations, obsLayersEnabled, selectedRegion, selectedVariable, variables, selectedObservation, setSelectedObservation, depthIndex, depthAxis, timeAxis, timeIndex, setActiveView, layerOpacity } = useOceanStore();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number; px: number; py: number } | null>(null);
  const [tool, setTool] = useState<"select" | "transect" | "measure">("select");
  const [showGraticule, setShowGraticule] = useState(true);
  const [measureStart, setMeasureStart] = useState<{lat:number;lon:number} | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{lat:number;lon:number} | null>(null);
  const [modelSlice, setModelSlice] = useState<ModelSlice | null>(null);
  const [fieldLoading, setFieldLoading] = useState(false);
  const curVar = variables.find(v => v.id === selectedVariable);

  const bounds = useMemo(() => ({
    "Arabian Sea": { x: -105, y: -8, zoom: 2.15 },
    "Bay of Bengal": { x: 48, y: -6, zoom: 2.15 },
    "Indian Ocean": { x: 0, y: 10, zoom: 1.45 },
    "Custom Region": { x: 0, y: 10, zoom: 1.2 },
  } as Record<string, { x: number; y: number; zoom: number }>), []);

  const reset = () => {
    const b = bounds[selectedRegion] ?? bounds["Indian Ocean"];
    setZoom(b.zoom); setPan({ x: b.x, y: b.y });
  };
  useEffect(() => { reset(); }, [selectedRegion]);

  useEffect(() => {
    let alive = true;
    setFieldLoading(true);
    api.modelSlice(selectedVariable, depthIndex, timeIndex)
      .then((d) => alive && setModelSlice(d as ModelSlice))
      .catch(() => alive && setModelSlice(null))
      .finally(() => alive && setFieldLoading(false));
    return () => { alive = false; };
  }, [selectedVariable, depthIndex, timeIndex]);

  const visibleObs = useMemo(() => observations.filter(o => obsLayersEnabled[o.type]), [observations, obsLayersEnabled]);
  const transform = `translate(${600 + pan.x} ${300 + pan.y}) scale(${zoom}) translate(-600 -300)`;
  const timeLabel = timeAxis[timeIndex]?.label ?? "Current";
  const latLines = useMemo(() => Array.from({ length: 7 }, (_, i) => -60 + i * 20), []);
  const lonLines = useMemo(() => Array.from({ length: 13 }, (_, i) => -180 + i * 30), []);

  const measureDistanceKm = useMemo(() => {
    if (!measureStart || !measureEnd) return null;
    const rad = Math.PI / 180;
    const p1 = measureStart.lat * rad, p2 = measureEnd.lat * rad;
    const dp = (measureEnd.lat - measureStart.lat) * rad;
    const dl = (measureEnd.lon - measureStart.lon) * rad;
    const a = Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }, [measureStart, measureEnd]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(1, Math.min(6, z * (e.deltaY > 0 ? 0.90 : 1.11))));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    svgRef.current?.setPointerCapture(e.pointerId);
    setDrag({ x: pan.x, y: pan.y, px: e.clientX, py: e.clientY });
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drag || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgScale = Math.min(rect.width / 1200, rect.height / 600);
    if (!Number.isFinite(svgScale) || svgScale <= 0) return;
    setPan({
      x: drag.x + (e.clientX - drag.px) / (svgScale * zoom),
      y: drag.y + (e.clientY - drag.py) / (svgScale * zoom),
    });
  };
  const handlePointerUp = () => setDrag(null);

  const svgPoint = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 600, y: 300 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 600, y: 300 };
    return pt.matrixTransform(ctm.inverse());
  };

  const pickGeoPoint = (e: React.PointerEvent<SVGSVGElement>) => {
    const local = svgPoint(e);
    return {
      lon: ((local.x - (600 + pan.x)) / zoom + 600) / 1200 * 360 - 180,
      lat: 90 - (((local.y - (300 + pan.y)) / zoom + 300) / 600 * 180),
    };
  };

  const fieldCells = useMemo(() => {
    const grid = modelSlice?.data;
    if (!grid?.length) return [];
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    const items: { key: string; x:number; y:number; w:number; h:number; color:string }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const value = grid[r]?.[c];
        if (!Number.isFinite(value)) continue;
        const lon0 = BOUNDS.lonMin + (c / cols) * (BOUNDS.lonMax - BOUNDS.lonMin);
        const lon1 = BOUNDS.lonMin + ((c + 1) / cols) * (BOUNDS.lonMax - BOUNDS.lonMin);
        const lat0 = BOUNDS.latMax - ((r + 1) / rows) * (BOUNDS.latMax - BOUNDS.latMin);
        const lat1 = BOUNDS.latMax - (r / rows) * (BOUNDS.latMax - BOUNDS.latMin);
        const p0 = project(lon0, lat1), p1 = project(lon1, lat0);
        items.push({ key:`${r}-${c}`, x:p0.x, y:p0.y, w:p1.x-p0.x+0.5, h:p1.y-p0.y+0.5, color:fieldColor(value, modelSlice.min, modelSlice.max) });
      }
    }
    return items;
  }, [modelSlice]);

  return (
    <div className="map2d-view" data-oceanvis-core="enhanced" style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="map-toolbar">
        <div className="map-toolbar-left">
          <span className="map-title"><Layers size={13} /> 2D Ocean Map</span>
          <span className="map-context">{selectedRegion}</span>
          <span className="map-context">{curVar?.name ?? selectedVariable} · {curVar?.unit ?? ""}</span>
          <span className="map-context">{depthAxis[depthIndex] != null ? `${depthAxis[depthIndex]} m` : "Surface"}</span>
          <span className="map-context">{timeLabel}</span>
        </div>
        <div className="map-toolbar-actions">
          <button className={`btn-icon ${tool === "select" ? "active" : ""}`} title="Select observation" onClick={() => setTool("select")}><LocateFixed size={13} /></button>
          <button className={`btn-icon ${tool === "transect" ? "active" : ""}`} title="Open transect" onClick={() => { setTool("transect"); setActiveView("transect"); }}><Crosshair size={13} /></button>
          <button className={`btn-icon ${tool === "measure" ? "active" : ""}`} title="Measure distance" onClick={() => setTool("measure")}><Ruler size={13} /></button>
          <button className={`btn-icon ${showGraticule ? "active" : ""}`} title="Toggle latitude/longitude grid" onClick={() => setShowGraticule(v => !v)}><Grid2X2 size={13} /></button>
          <button className="btn-icon" title="Zoom in" onClick={() => setZoom(z => Math.min(6, z * 1.15))}><Plus size={13} /></button>
          <button className="btn-icon" title="Zoom out" onClick={() => setZoom(z => Math.max(1, z / 1.15))}><Minus size={13} /></button>
          <button className="btn-icon" title="Reset map" onClick={reset}><RotateCcw size={13} /></button>
        </div>
      </div>

      <div className="map-canvas-wrap">
        <svg ref={svgRef} className="map-svg" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid meet"
          onWheel={handleWheel} onPointerDown={(e) => {
            if (tool === "measure") {
              const point = pickGeoPoint(e);
              if (!measureStart || measureEnd) { setMeasureStart(point); setMeasureEnd(null); }
              else setMeasureEnd(point);
              return;
            }
            if (tool === "select") return handlePointerDown(e);
            handlePointerDown(e);
          }} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
          <defs>
            <linearGradient id="mapOceanBase" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b3157"/><stop offset="0.55" stopColor="#06223c"/><stop offset="1" stopColor="#020b14"/>
            </linearGradient>
            <filter id="mapFieldSoft"><feGaussianBlur stdDeviation="3.5"/></filter>
          </defs>
          <rect width="1200" height="600" fill="url(#mapOceanBase)" />
          <g transform={transform}>
            {showGraticule && (
              <g stroke="#75bce8" strokeOpacity="0.20" strokeWidth="0.7">
                {latLines.map(lat => { const y = project(0, lat).y; return <line key={`lat-${lat}`} x1="0" y1={y} x2="1200" y2={y} />; })}
                {lonLines.map(lon => { const x = project(lon, 0).x; return <line key={`lon-${lon}`} x1={x} y1="0" x2={x} y2="600" />; })}
              </g>
            )}

            {/* API-backed model field. Land graphic is painted afterwards so the field is naturally occluded by continents. */}
            <g opacity={(fieldLoading ? 0.38 : 0.72) * (layerOpacity / 80)}>
              {fieldCells.map(cell => <rect key={cell.key} x={cell.x} y={cell.y} width={cell.w} height={cell.h} fill={cell.color} />)}
            </g>
            <g opacity="0.20" filter="url(#mapFieldSoft)">
              {fieldCells.filter((_, i) => i % 3 === 0).map(cell => <rect key={`soft-${cell.key}`} x={cell.x+2} y={cell.y+2} width={Math.max(1,cell.w-4)} height={Math.max(1,cell.h-4)} fill={cell.color} />)}
            </g>

            <image href="/world-map.svg" x="0" y="0" width="1200" height="600" opacity="0.98" />

            {/* Directional surface current vectors. */}
            <g opacity="0.75" fill="none" stroke="#a7edff" strokeWidth="1.2">
              {Array.from({ length: 7 }, (_, r) => Array.from({ length: 10 }, (_, c) => {
                const lat = -5 + r * 5.5;
                const lon = 58 + c * 3.6;
                const p = project(lon, lat);
                const a = Math.sin(lon * 0.11 + lat * 0.07) * 0.7 + 0.35;
                const len = 10;
                const ex = p.x + Math.cos(a) * len, ey = p.y - Math.sin(a) * len;
                return <path key={`${r}-${c}`} d={`M${p.x} ${p.y} L${ex} ${ey} M${ex} ${ey} l${-Math.cos(a-0.55)*3} ${Math.sin(a-0.55)*3} M${ex} ${ey} l${-Math.cos(a+0.55)*3} ${Math.sin(a+0.55)*3}`} />;
              }))}
            </g>

            {visibleObs.map(obs => {
              const p = project(obs.lon, obs.lat);
              const color = OBS_COLORS[obs.type] || "#fff";
              const selected = selectedObservation?.id === obs.id;
              return (
                <g key={obs.id} transform={`translate(${p.x} ${p.y})`} onClick={(e) => { e.stopPropagation(); if (tool === "select") setSelectedObservation(obs); }} style={{ cursor: tool === "select" ? "pointer" : "default" }}>
                  {selected && <circle r="10" fill="none" stroke={color} strokeWidth="2.2" opacity="0.95" />}
                  {obs.type === "Glider" ? <path d="M 0 -6 L 6 5 L -6 5 Z" fill={color} stroke="#04101d" strokeWidth="2" /> : obs.type === "CTD Station" ? <path d="M 0 -7 L 7 0 L 0 7 L -7 0 Z" fill={color} stroke="#04101d" strokeWidth="2" /> : <circle r="5.5" fill={color} stroke="#04101d" strokeWidth="2" />}
                </g>
              );
            })}

            <g fontFamily="Inter, sans-serif" fontWeight="700" fill="#eef8ff" textAnchor="middle">
              <text x="485" y="238" fontSize="15" opacity="0.92">Arabian Sea</text>
              <text x="750" y="245" fontSize="15" opacity="0.92">Bay of Bengal</text>
              <text x="675" y="421" fontSize="16" opacity="0.92">Indian Ocean</text>
              <text x="690" y="182" fontSize="13" opacity="0.84">India</text>
              <text x="175" y="265" fontSize="11" opacity="0.7">AFRICA</text>
              <text x="965" y="260" fontSize="11" opacity="0.7">AUSTRALIA</text>
            </g>
          </g>

          {measureStart && <circle cx={project(measureStart.lon, measureStart.lat).x * zoom + (600+pan.x)*(1-zoom)} cy={project(measureStart.lon, measureStart.lat).y * zoom + (300+pan.y)*(1-zoom)} r="5" fill="#ffffff" stroke="#1e6fff" strokeWidth="2" />}
          {measureEnd && <circle cx={project(measureEnd.lon, measureEnd.lat).x * zoom + (600+pan.x)*(1-zoom)} cy={project(measureEnd.lon, measureEnd.lat).y * zoom + (300+pan.y)*(1-zoom)} r="5" fill="#ffffff" stroke="#ff8c1a" strokeWidth="2" />}
        </svg>

        <div className="map-legend">
          <div className="map-legend-title"><span>{curVar?.name ?? selectedVariable}</span>{modelSlice?.unit ? <span> · {modelSlice.unit}</span> : null}</div>
          <div className={`colormap-bar colormap-${curVar?.colormap ?? "thermal"}`} />
          <div className="map-legend-values"><span>{modelSlice?.min ?? curVar?.min ?? 0}</span><span>{fieldLoading ? "Loading model field…" : "Model field"}</span><span>{modelSlice?.max ?? curVar?.max ?? 1}</span></div>
          <div className="map-legend-foot"><span><span className="legend-dot model" /> MODEL</span><span><span className="legend-dot obs" /> OBS</span></div>
        </div>

        <div className="map-north-arrow" aria-hidden="true"><Navigation size={14}/><span>N</span></div>
        <div className="map-scale-bar"><span>55°E</span><div className="scale-line"><i/><i/><i/></div><span>95°E</span></div>
        <div className="map-scale">Zoom {zoom.toFixed(2)}× · Drag to pan</div>
        {measureDistanceKm != null && <div className="map-measure-card"><strong>{measureDistanceKm.toFixed(1)} km</strong><span>Great-circle distance</span><button className="btn-icon" onClick={() => { setMeasureStart(null); setMeasureEnd(null); }}><RotateCcw size={10}/></button></div>}
        {selectedObservation && (
          <div className="map-selection-card">
            <div className="map-selection-head"><span>Selected observation</span><button className="btn-icon" onClick={() => setSelectedObservation(null)}>×</button></div>
            <strong>{selectedObservation.id}</strong>
            <div>{selectedObservation.type} · {Math.abs(selectedObservation.lat).toFixed(2)}°{selectedObservation.lat>=0?"N":"S"}, {Math.abs(selectedObservation.lon).toFixed(2)}°{selectedObservation.lon>=0?"E":"W"}</div>
            <div>Depth range: 0–{selectedObservation.maxDepth} m</div>
          </div>
        )}
      </div>
    </div>
  );
}

