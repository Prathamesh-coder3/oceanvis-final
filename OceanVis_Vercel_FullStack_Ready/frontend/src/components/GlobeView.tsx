import React, { useEffect, useMemo, useRef, useState } from "react";
import { useOceanStore } from "../store/oceanStore";
import { api } from "../services/api";
import type { Observation } from "../types";
import { Layers, Box, Zap, Wind, TrendingUp, Globe2, RotateCcw, Plus, Minus, Move3d } from "lucide-react";

const OBS_COLORS: Record<string, string> = {
  "ARGO Float": "#ff9f43",
  Glider: "#43d9ff",
  "CTD Station": "#d58cff",
  "BGC Sensor": "#4ee09a",
  Mooring: "#ffd166",
  Buoy: "#ff5d73",
};

const VIZ_MODES = [
  { id: "surface", label: "Surface", icon: <Globe2 size={13} /> },
  { id: "depth-slice", label: "Depth Slice", icon: <Layers size={13} /> },
  { id: "volume-3d", label: "3D Volume", icon: <Box size={13} /> },
  { id: "isosurface", label: "Isosurface", icon: <Zap size={13} /> },
  { id: "currents", label: "Current Vectors", icon: <Wind size={13} /> },
  { id: "tracks", label: "Observation Tracks", icon: <TrendingUp size={13} /> },
];

interface SphereMesh {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array | Uint16Array;
}

function createSphere(segments = 160, rings = 96): SphereMesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let y = 0; y <= rings; y++) {
    const v = y / rings;
    const phi = v * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    for (let x = 0; x <= segments; x++) {
      const u = x / segments;
      const theta = u * Math.PI * 2;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const px = sinPhi * cosTheta;
      const py = cosPhi;
      const pz = sinPhi * sinTheta;
      positions.push(px, py, pz);
      normals.push(px, py, pz);
      // Equirectangular texture: u=0 is 180°W and u=1 is 180°E.
      uvs.push(1 - u, 1 - v);
    }
  }

  const row = segments + 1;
  for (let y = 0; y < rings; y++) {
    for (let x = 0; x < segments; x++) {
      const a = y * row + x;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: positions.length / 3 > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
  };
}

function perspective(fov: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}

function rotationMatrix(rotY: number, rotX: number): Float32Array {
  const cy = Math.cos(rotY), sy = Math.sin(rotY);
  const cx = Math.cos(rotX), sx = Math.sin(rotX);
  return new Float32Array([
    cy, sx * sy, -cx * sy, 0,
    0, cx, sx, 0,
    sy, -sx * cy, cx * cy, 0,
    0, 0, 0, 1,
  ]);
}

function multiply4(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return out;
}

function latLonToScreen(latDeg: number, lonDeg: number, rotation: number, pitch: number, radiusPx: number, cx: number, cy: number) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  const cosLat = Math.cos(lat);
  const relativeLon = lon - rotation;
  const cosLon = Math.cos(relativeLon);
  const sinLon = Math.sin(relativeLon);
  const x = cosLat * sinLon;
  const y = Math.sin(lat) * Math.cos(pitch) - cosLat * cosLon * Math.sin(pitch);
  const z = Math.sin(lat) * Math.sin(pitch) + cosLat * cosLon * Math.cos(pitch);
  return { x: cx + x * radiusPx, y: cy - y * radiusPx, z };
}

function colorForVariable(variableId: string, n: number): string {
  const t = Math.max(0, Math.min(1, n));
  if (variableId === "salinity") return `hsl(${250 - t * 210} 78% ${40 + t * 16}%)`;
  if (variableId === "chlorophyll") return `hsl(${80 + t * 85} 80% ${36 + t * 20}%)`;
  if (variableId === "oxygen") return `hsl(${205 - t * 80} 82% ${38 + t * 18}%)`;
  if (variableId === "nutrients") return `hsl(${40 + t * 260} 78% ${38 + t * 16}%)`;
  return `hsl(${225 - t * 225} 88% ${42 + t * 16}%)`;
}

type ModelSlice = { gridSize: number; data: number[][]; min: number; max: number; unit: string };

function modelValueColor(value: number, min: number, max: number, variable: string) {
  const t = Math.max(0, Math.min(1, (value - min) / Math.max(1e-9, max - min)));
  return colorForVariable(variable, t);
}

function sphereRadiusPx(w: number, h: number, zoom: number) {
  const f = 1 / Math.tan((Math.PI / 4.2) / 2);
  const dist = 3.3 / zoom;
  return Math.min(w, h) * 0.5 * f / dist * 0.94;
}

function drawArc(ctx: CanvasRenderingContext2D, points: { x: number; y: number; z: number }[]) {
  let drawing = false;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.z > 0.04) {
      if (!drawing) { ctx.moveTo(p.x, p.y); drawing = true; } else ctx.lineTo(p.x, p.y);
    } else drawing = false;
  }
}

export default function GlobeView() {
  const webglRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const meshRef = useRef<SphereMesh | null>(null);
  const buffersRef = useRef<Record<string, WebGLBuffer | null>>({});
  const textureRef = useRef<WebGLTexture | null>(null);
  const stateRef = useRef({ rotation: 0.45, pitch: 0.10, zoom: 1.0, dragging: false, lastX: 0, lastY: 0, autoRotate: false });
  const [textureReady, setTextureReady] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [hoveredObs, setHoveredObs] = useState<Observation | null>(null);
  const [modelSlice, setModelSlice] = useState<ModelSlice | null>(null);
  const [fieldLoading, setFieldLoading] = useState(false);
  const [viewZoom, setViewZoom] = useState(1);

  const {
    observations, obsLayersEnabled, selectedVariable, variables, layerOpacity,
    depthIndex, depthAxis, timeIndex, selectedRegion, selectedObservation,
    setSelectedObservation, vizMode, setVizMode,
  } = useOceanStore();
  const curVar = variables.find(v => v.id === selectedVariable);

  const filteredObs = useMemo(() => observations.filter(o => obsLayersEnabled[o.type]), [observations, obsLayersEnabled]);

  useEffect(() => {
    const presets: Record<string, number> = {
      "Arabian Sea": 1.20,
      "Bay of Bengal": 0.10,
      "Indian Ocean": 0.52,
      "Custom Region": 0.52,
    };
    stateRef.current.rotation = presets[selectedRegion] ?? 0.52;
  }, [selectedRegion]);

  useEffect(() => {
    let alive = true;
    setFieldLoading(true);
    api.modelSlice(selectedVariable, depthIndex, timeIndex)
      .then((d) => alive && setModelSlice(d as ModelSlice))
      .catch(() => alive && setModelSlice(null))
      .finally(() => alive && setFieldLoading(false));
    return () => { alive = false; };
  }, [selectedVariable, depthIndex, timeIndex]);

  // Persistent WebGL sphere + local texture. A tiny fallback texture keeps the globe visible even while assets load.
  useEffect(() => {
    const canvas = webglRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
    if (!gl) return;
    glRef.current = gl;

    const vs = `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      attribute vec2 aUv;
      uniform mat4 uMvp;
      uniform mat4 uModel;
      varying vec3 vNormal;
      varying vec2 vUv;
      void main() {
        vNormal = mat3(uModel) * aNormal;
        vUv = aUv;
        gl_Position = uMvp * vec4(aPosition, 1.0);
      }
    `;
    const fs = `
      precision mediump float;
      uniform sampler2D uTexture;
      varying vec3 vNormal;
      varying vec2 vUv;
      void main() {
        vec3 base = texture2D(uTexture, vUv).rgb;
        vec3 n = normalize(vNormal);
        vec3 lightDir = normalize(vec3(-0.35, 0.62, 0.82));
        float diffuse = max(dot(n, lightDir), 0.0);
        float specular = pow(max(dot(reflect(-lightDir, n), vec3(0.0, 0.0, 1.0)), 0.0), 30.0);
        float rim = pow(1.0 - max(dot(n, vec3(0.0, 0.0, 1.0)), 0.0), 2.8);
        vec3 lit = base * (0.38 + 0.88 * diffuse);
        lit += vec3(0.12, 0.28, 0.48) * rim;
        lit += vec3(0.22, 0.32, 0.42) * specular;
        gl_FragColor = vec4(lit, 1.0);
      }
    `;
    const compile = (type: number, source: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, source); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "Shader compile failed");
      return s;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "Program link failed");
    programRef.current = program;

    const mesh = createSphere();
    meshRef.current = mesh;
    const pos = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pos); gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
    const normal = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, normal); gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);
    const uv = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, uv); gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, gl.STATIC_DRAW);
    const index = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    buffersRef.current = { pos, normal, uv, index };

    const tex = gl.createTexture()!;
    textureRef.current = tex;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([16, 64, 110, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);

    const loadTexture = (src: string, allowFallback = true) => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
      img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        // Keep the texture sharp at normal and moderate zoom; avoid expensive anisotropy extensions.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);
        setTextureReady(true);
      };
      img.onerror = () => {
        if (allowFallback) loadTexture("/world-map.svg", false);
        else setTextureReady(false);
      };
    };
    loadTexture("/earth_base_4096.jpg");

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      Object.values(buffersRef.current).forEach(b => b && gl.deleteBuffer(b));
      if (textureRef.current) gl.deleteTexture(textureRef.current);
      if (programRef.current) gl.deleteProgram(programRef.current);
    };
  }, []);

  const drawOverlay = () => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const targetW = Math.max(1, Math.floor(w * dpr));
    const targetH = Math.max(1, Math.floor(h * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH) { canvas.width = targetW; canvas.height = targetH; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const s = stateRef.current;
    const radius = sphereRadiusPx(w, h, s.zoom);
    const cx = w / 2, cy = h / 2;

    // Atmospheric rim.
    const atmo = ctx.createRadialGradient(cx, cy, radius * 0.98, cx, cy, radius * 1.10);
    atmo.addColorStop(0, "rgba(35,150,255,0.02)");
    atmo.addColorStop(0.65, "rgba(50,170,255,0.18)");
    atmo.addColorStop(1, "rgba(0,90,190,0)");
    ctx.fillStyle = atmo;
    ctx.beginPath(); ctx.arc(cx, cy, radius * 1.10, 0, Math.PI * 2); ctx.fill();

    // Latitude / longitude graticule. Smooth projected curves remain crisp at zoom because this is a vector overlay.
    ctx.save();
    ctx.strokeStyle = "rgba(127,205,255,0.22)";
    ctx.lineWidth = 0.65;
    for (let lat = -60; lat <= 60; lat += 15) {
      const points = [];
      for (let lon = -180; lon <= 180; lon += 4) points.push(latLonToScreen(lat, lon, s.rotation, s.pitch, radius, cx, cy));
      ctx.beginPath(); drawArc(ctx, points); ctx.stroke();
    }
    for (let lon = -180; lon < 180; lon += 15) {
      const points = [];
      for (let lat = -90; lat <= 90; lat += 3) points.push(latLonToScreen(lat, lon, s.rotation, s.pitch, radius, cx, cy));
      ctx.beginPath(); drawArc(ctx, points); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(170,225,255,0.42)";
    ctx.lineWidth = 0.9;
    const eq = [];
    for (let lon = -180; lon <= 180; lon += 3) eq.push(latLonToScreen(0, lon, s.rotation, s.pitch, radius, cx, cy));
    ctx.beginPath(); drawArc(ctx, eq); ctx.stroke();
    ctx.restore();

    // Graticule labels.
    ctx.save();
    ctx.font = "600 10px Inter, sans-serif";
    ctx.fillStyle = "rgba(210,238,255,0.82)";
    ctx.textAlign = "center";
    [-120, -60, 0, 60, 120].forEach(lon => {
      const p = latLonToScreen(0, lon, s.rotation, s.pitch, radius + 12, cx, cy);
      if (p.z > 0.25) ctx.fillText(lon < 0 ? `${Math.abs(lon)}°W` : lon > 0 ? `${lon}°E` : "0°", p.x, p.y + 4);
    });
    ctx.textAlign = "left";
    [-60, -30, 30, 60].forEach(lat => {
      const p = latLonToScreen(lat, -90, s.rotation, s.pitch, radius + 8, cx, cy);
      if (p.z > 0.2) ctx.fillText(lat < 0 ? `${Math.abs(lat)}°S` : `${lat}°N`, Math.max(4, p.x - 2), p.y);
    });
    ctx.restore();

    // API-backed model field projected onto the globe surface. Demo mode is explicit in the UI;
    // this layer uses the same /api/demo/model-slice values as the analysis panels.
    if (modelSlice?.data?.length) {
      const rows = modelSlice.data.length;
      const cols = modelSlice.data[0]?.length ?? 0;
      const stride = rows >= 20 ? 2 : 1;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (let r = 0; r < rows; r += stride) {
        for (let c = 0; c < cols; c += stride) {
          const value = modelSlice.data[r]?.[c];
          if (!Number.isFinite(value)) continue;
          const lat = 30 - ((r + 0.5) / rows) * 40;
          const lon = 55 + ((c + 0.5) / cols) * 40;
          const p = latLonToScreen(lat, lon, s.rotation, s.pitch, radius, cx, cy);
          if (p.z < 0.02) continue;
          const t = (value - modelSlice.min) / Math.max(1e-9, modelSlice.max - modelSlice.min);
          const rr = Math.max(2.6, Math.min(8.5, radius * 0.014));
          ctx.globalAlpha = (0.20 + Math.max(0, Math.min(1, p.z)) * 0.36) * (layerOpacity / 80);
          ctx.fillStyle = modelValueColor(value, modelSlice.min, modelSlice.max, selectedVariable);
          ctx.beginPath(); ctx.arc(p.x, p.y, rr * (0.85 + t * 0.25), 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }

    // Mode-specific depth cues. These are visual guides for the selected model depth.
    if (vizMode === "depth-slice" || depthIndex > 0) {
      const depthFrac = Math.min(1, (depthAxis[depthIndex] ?? 0) / 3000);
      ctx.save();
      ctx.strokeStyle = "rgba(115,220,255,0.34)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.ellipse(cx, cy + depthFrac * radius * 0.24, radius * (0.62 + depthFrac * 0.12), radius * (0.17 + depthFrac * 0.06), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (vizMode === "volume-3d") {
      ctx.save();
      ctx.strokeStyle = "rgba(104,210,255,0.18)";
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath(); ctx.arc(cx, cy, radius * (0.86 - i * 0.11), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    if (vizMode === "isosurface" && modelSlice?.data?.length) {
      const threshold = (modelSlice.min + modelSlice.max) * 0.5;
      ctx.save();
      ctx.strokeStyle = "rgba(255,220,94,0.95)";
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = 0.9;
      for (let r = 0; r < modelSlice.data.length; r += 2) {
        for (let c = 0; c < (modelSlice.data[r]?.length ?? 0); c += 2) {
          const value = modelSlice.data[r]?.[c];
          if (!Number.isFinite(value) || Math.abs(value - threshold) > (modelSlice.max - modelSlice.min) * 0.06) continue;
          const lat = 30 - ((r + 0.5) / modelSlice.data.length) * 40;
          const lon = 55 + ((c + 0.5) / (modelSlice.data[0]?.length ?? 1)) * 40;
          const p = latLonToScreen(lat, lon, s.rotation, s.pitch, radius, cx, cy);
          if (p.z < 0.08) continue;
          ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.restore();
    }

    // Current vectors.
    if (vizMode === "surface" || vizMode === "currents") {
      ctx.save();
      ctx.globalAlpha = 0.76;
      ctx.strokeStyle = "#8ce9ff";
      ctx.fillStyle = "#8ce9ff";
      ctx.lineWidth = 1.05;
      for (let lat = -30; lat <= 30; lat += 5) {
        for (let lon = 40; lon <= 110; lon += 5) {
          const p = latLonToScreen(lat, lon, s.rotation, s.pitch, radius, cx, cy);
          if (p.z < 0.12) continue;
          const angle = Math.sin((lon * 0.11) + (lat * 0.08)) * 0.9 + Math.cos(lon * 0.04);
          const len = Math.max(5, Math.min(12, radius / 36));
          const ex = p.x + Math.cos(angle) * len;
          const ey = p.y - Math.sin(angle) * len;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(ex, ey); ctx.stroke();
          const a = Math.atan2(ey - p.y, ex - p.x);
          ctx.beginPath(); ctx.moveTo(ex, ey);
          ctx.lineTo(ex - Math.cos(a - 0.55) * 4, ey - Math.sin(a - 0.55) * 4);
          ctx.lineTo(ex - Math.cos(a + 0.55) * 4, ey - Math.sin(a + 0.55) * 4);
          ctx.closePath(); ctx.fill();
        }
      }
      ctx.restore();
    }

    // Observation markers.
    filteredObs.forEach(obs => {
      const p = latLonToScreen(obs.lat, obs.lon, s.rotation, s.pitch, radius, cx, cy);
      if (p.z < 0.10) return;
      const color = OBS_COLORS[obs.type] || "#ffffff";
      const isSel = selectedObservation?.id === obs.id;
      const isHover = hoveredObs?.id === obs.id;
      const size = isSel ? 7 : 5;
      ctx.save();
      ctx.fillStyle = color;
      ctx.strokeStyle = "#041224";
      ctx.lineWidth = 2;
      if (obs.type === "ARGO Float") {
        ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else if (obs.type === "Glider") {
        ctx.beginPath(); ctx.moveTo(p.x, p.y - size); ctx.lineTo(p.x + size, p.y + size); ctx.lineTo(p.x - size, p.y + size); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (obs.type === "CTD Station") {
        ctx.beginPath(); ctx.moveTo(p.x, p.y - size); ctx.lineTo(p.x + size, p.y); ctx.lineTo(p.x, p.y + size); ctx.lineTo(p.x - size, p.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.rect(p.x - size, p.y - size, size * 2, size * 2); ctx.fill(); ctx.stroke();
      }
      if (isSel || isHover) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, size + 6, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    });

    const labels: [number, number, string][] = [
      [20, 67, "Arabian Sea"], [14, 90, "Bay of Bengal"], [-8, 77, "Indian Ocean"], [22, 79, "India"],
    ];
    ctx.save();
    ctx.font = "700 13px Inter, sans-serif";
    ctx.fillStyle = "rgba(235,247,255,0.88)";
    ctx.textAlign = "center";
    labels.forEach(([lat, lon, label]) => {
      const p = latLonToScreen(lat, lon, s.rotation, s.pitch, radius, cx, cy);
      if (p.z < 0.20) return;
      ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 5;
      ctx.fillText(label, p.x, p.y);
    });
    ctx.restore();
  };

  const drawGlobe = () => {
    const canvas = webglRef.current;
    const gl = glRef.current;
    const program = programRef.current;
    const mesh = meshRef.current;
    const texture = textureRef.current;
    if (!canvas || !gl || !program || !mesh || !texture) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const targetW = Math.max(1, Math.floor(w * dpr));
    const targetH = Math.max(1, Math.floor(h * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH) { canvas.width = targetW; canvas.height = targetH; }
    gl.viewport(0, 0, targetW, targetH);
    gl.clearColor(0.003, 0.016, 0.040, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const s = stateRef.current;
    if (s.autoRotate && !s.dragging) s.rotation += 0.00030;
    const aspect = targetW / targetH;
    const proj = perspective(Math.PI / 4.2, aspect, 0.1, 100);
    const rot = rotationMatrix(s.rotation, s.pitch);
    const dist = 3.3 / s.zoom;
    const view = new Float32Array([
      1,0,0,0,
      0,1,0,0,
      0,0,1,0,
      0,0,-dist,1,
    ]);
    const mvp = multiply4(proj, multiply4(view, rot));
    gl.useProgram(program);
    const bindAttr = (name: string, buf: WebGLBuffer | null, size: number) => {
      const loc = gl.getAttribLocation(program, name);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    bindAttr("aPosition", buffersRef.current.pos, 3);
    bindAttr("aNormal", buffersRef.current.normal, 3);
    bindAttr("aUv", buffersRef.current.uv, 2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffersRef.current.index);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uMvp"), false, mvp);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uModel"), false, rot);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 0);
    gl.drawElements(gl.TRIANGLES, mesh.indices.length, mesh.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0);
  };

  useEffect(() => {
    const loop = () => {
      drawGlobe();
      drawOverlay();
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    const resize = () => { drawGlobe(); drawOverlay(); };
    window.addEventListener("resize", resize);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); window.removeEventListener("resize", resize); };
  }, [
    observations, obsLayersEnabled, selectedVariable, depthIndex, timeIndex, modelSlice, fieldLoading,
    layerOpacity, selectedObservation, hoveredObs, vizMode, selectedRegion, textureReady,
  ]);

  const eventToLocal = (e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const hitTest = (e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = eventToLocal(e);
    const s = stateRef.current;
    const w = overlayRef.current?.clientWidth ?? 1, h = overlayRef.current?.clientHeight ?? 1;
    const radius = sphereRadiusPx(w, h, s.zoom);
    const cx = w / 2, cy = h / 2;
    let best: Observation | null = null; let bestDist = 16;
    for (const obs of filteredObs) {
      const p = latLonToScreen(obs.lat, obs.lon, s.rotation, s.pitch, radius, cx, cy);
      if (p.z < 0.10) continue;
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < bestDist) { best = obs; bestDist = d; }
    }
    return best;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    s.dragging = true; s.lastX = e.clientX; s.lastY = e.clientY; s.autoRotate = false;
    setAutoRotate(false);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    if (s.dragging) {
      s.rotation += (e.clientX - s.lastX) * 0.0055;
      s.pitch = Math.max(-1.15, Math.min(1.15, s.pitch + (e.clientY - s.lastY) * 0.0045));
      s.lastX = e.clientX; s.lastY = e.clientY;
    }
    setHoveredObs(hitTest(e));
  };

  const handlePointerUp = (e?: React.PointerEvent<HTMLCanvasElement>) => { stateRef.current.dragging = false; if (e?.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    stateRef.current.zoom = Math.max(0.78, Math.min(1.95, stateRef.current.zoom * (e.deltaY > 0 ? 0.92 : 1.09)));
    setViewZoom(stateRef.current.zoom);
  };

  const reset = () => {
    const presets: Record<string, number> = {
      "Arabian Sea": 1.20,
      "Bay of Bengal": 0.10,
      "Indian Ocean": 0.52,
      "Custom Region": 0.52,
    };
    stateRef.current.rotation = presets[selectedRegion] ?? 0.52;
    stateRef.current.pitch = 0.10;
    stateRef.current.zoom = 1.0;
    stateRef.current.autoRotate = false;
    setViewZoom(1.0);
    setAutoRotate(false);
  };

  return (
    <div className="globe-view" data-oceanvis-core="enhanced" style={{ position: "relative", flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden", background: "radial-gradient(circle at 50% 42%, #0a2a55 0%, #04101f 48%, #01060d 100%)" }}>
      <div className="globe-stars" />
      <canvas ref={webglRef} className="globe-canvas" aria-label="Interactive 3D Earth" />
      <canvas
        ref={overlayRef}
        className="globe-overlay"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => handlePointerUp(e)}
        onPointerLeave={(e) => { handlePointerUp(e); setHoveredObs(null); }}
        onWheel={handleWheel}
        onClick={(e) => { const picked = hitTest(e); setSelectedObservation(picked); }}
      />

      <div className="globe-status">
        <span className={`status-dot ${textureReady ? "live" : "demo"}`} />
        {textureReady ? "3D EARTH READY" : "3D EARTH LOADING"}
      </div>

      <div className="globe-control-stack">
        <button className="btn-icon" title="Zoom in" onClick={() => { stateRef.current.zoom = Math.min(1.95, stateRef.current.zoom * 1.10); setViewZoom(stateRef.current.zoom); }}><Plus size={14} /></button>
        <button className="btn-icon" title="Zoom out" onClick={() => { stateRef.current.zoom = Math.max(0.78, stateRef.current.zoom * 0.90); setViewZoom(stateRef.current.zoom); }}><Minus size={14} /></button>
        <button className="btn-icon" title="Reset Earth" onClick={reset}><RotateCcw size={14} /></button>
        <button className={`btn-icon ${autoRotate ? "active" : ""}`} title="Auto rotate" onClick={() => { const next = !stateRef.current.autoRotate; stateRef.current.autoRotate = next; setAutoRotate(next); }}><Move3d size={13} /></button>
      </div>

      <div className="viz-mode-stack">
        {VIZ_MODES.map(m => (
          <button key={m.id} className={`btn-icon ${vizMode === m.id ? "active" : ""}`} title={m.label} onClick={() => setVizMode(m.id)}>{m.icon}</button>
        ))}
      </div>

      <div className="globe-scale-label">Lat/Lon Grid · Zoom {viewZoom.toFixed(2)}×</div>
      <div className="globe-context-label">
        <span>{depthAxis[depthIndex] != null ? `Depth: ${depthAxis[depthIndex]} m` : "Surface"}</span>
        <span className="divider-vertical" />
        <span className="accent">{curVar?.name ?? selectedVariable}</span>
        <span className="divider-vertical" />
        <span>{fieldLoading ? "MODEL FIELD …" : "MODEL FIELD READY"}</span>
      </div>

      <div className="globe-science-legend">
        <div><span className="legend-swatch model" />MODEL</div>
        <div><span className="legend-swatch obs" />OBSERVATIONS</div>
        <div><span className="legend-swatch current" />CURRENT VECTORS</div>
      </div>

      {hoveredObs && (
        <div className="globe-hover-card" style={{ left: 18, bottom: 18 }}>
          <div className="globe-hover-title"><span className="status-dot demo" />{hoveredObs.type}</div>
          <div className="globe-hover-id">{hoveredObs.id}</div>
          <div className="globe-hover-meta">{hoveredObs.lat.toFixed(2)}°, {hoveredObs.lon.toFixed(2)}° · max {hoveredObs.maxDepth} m</div>
        </div>
      )}
    </div>
  );
}
