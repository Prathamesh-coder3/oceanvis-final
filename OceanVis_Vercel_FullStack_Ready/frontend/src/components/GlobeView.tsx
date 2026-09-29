import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useOceanStore } from "../store/oceanStore";
import { api } from "../services/api";
import type { Observation } from "../types";
import {
  Layers, Box, Zap, Wind, TrendingUp, Globe2, RotateCcw,
  Plus, Minus, Play, Pause, Compass, Eye, Sliders
} from "lucide-react";

const OBS_COLORS: Record<string, string> = {
  "ARGO Float": "#ff9f43",
  Glider: "#43d9ff",
  "CTD Station": "#e056fd",
  "BGC Sensor": "#2ed573",
  Mooring: "#ffd32a",
  Buoy: "#ff5252",
};

interface SphereMesh {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array | Uint16Array;
}

function createSphere(segments = 180, rings = 100): SphereMesh {
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
      // Equirectangular mapping: u=0 at 180°W, u=0.5 at 0°, u=1.0 at 180°E
      uvs.push(1.0 - u, 1.0 - v);
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
  const f = 1.0 / Math.tan(fov / 2);
  const nf = 1.0 / (near - far);
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
      out[c * 4 + r] =
        a[r] * b[c * 4] +
        a[4 + r] * b[c * 4 + 1] +
        a[8 + r] * b[c * 4 + 2] +
        a[12 + r] * b[c * 4 + 3];
    }
  }
  return out;
}

function sphereRadiusPx(w: number, h: number, zoom: number): number {
  const fov = Math.PI / 4.0;
  const f = 1.0 / Math.tan(fov / 2);
  const dist = 3.2 / zoom;
  return Math.min(w, h) * 0.5 * (f / dist);
}

function latLonToScreen(
  latDeg: number,
  lonDeg: number,
  rotation: number,
  pitch: number,
  radiusPx: number,
  cx: number,
  cy: number
) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const cosLat = Math.cos(lat);
  const relLon = lon - rotation;
  const cosLon = Math.cos(relLon);
  const sinLon = Math.sin(relLon);

  const x = cosLat * sinLon;
  const y = Math.sin(lat) * Math.cos(pitch) - cosLat * cosLon * Math.sin(pitch);
  const z = Math.sin(lat) * Math.sin(pitch) + cosLat * cosLon * Math.cos(pitch);

  return { x: cx + x * radiusPx, y: cy - y * radiusPx, z };
}

// Scientific Colormaps matching Reference Image B:
// Turbo / Thermal palette for Sea Surface Temperature:
// 0.0 (Navy/Indigo) -> 0.25 (Cyan) -> 0.5 (Emerald) -> 0.75 (Gold/Amber) -> 1.0 (Crimson/Red)
function turboColor(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.min(1.0, Math.max(0.0, 1.4 * Math.sin(clamped * Math.PI * 1.3 - 0.4)));
  const g = Math.min(1.0, Math.max(0.0, Math.sin(clamped * Math.PI)));
  const b = Math.min(1.0, Math.max(0.0, 1.3 * Math.cos(clamped * Math.PI * 1.2)));
  return [r, g, b];
}

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

// Major Global Ocean Current Streamline curves (lat, lon pairs)
const STREAMLINE_SYSTEMS: { name: string; path: [number, number][] }[] = [
  // Somali Current & Arabian Sea Whirl
  {
    name: "Somali Current",
    path: [
      [-4, 43], [0, 46], [4, 49], [8, 52], [12, 54], [16, 58], [19, 63], [22, 67], [20, 71], [16, 72]
    ]
  },
  // Agulhas Current around Madagascar / South Africa
  {
    name: "Agulhas Current",
    path: [
      [-12, 52], [-16, 48], [-21, 43], [-26, 37], [-30, 32], [-34, 26], [-37, 20], [-40, 22], [-42, 28], [-41, 35]
    ]
  },
  // South Equatorial Current (Indian Ocean)
  {
    name: "South Equatorial Current",
    path: [
      [-12, 105], [-12, 95], [-11, 85], [-10, 75], [-10, 65], [-9, 55], [-10, 48]
    ]
  },
  // North Equatorial Current / Countercurrent
  {
    name: "Equatorial Jet",
    path: [
      [1, 50], [2, 60], [1, 70], [0, 80], [-1, 90], [0, 100]
    ]
  },
  // Bay of Bengal Gyre
  {
    name: "Bay of Bengal Gyre",
    path: [
      [8, 82], [11, 85], [15, 88], [18, 91], [20, 89], [17, 84], [13, 81], [9, 81]
    ]
  },
  // Arabian Sea Central Eddy
  {
    name: "Arabian Sea Gyre",
    path: [
      [11, 62], [14, 65], [17, 68], [19, 66], [17, 61], [13, 59], [11, 62]
    ]
  },
  // Antarctic Circumpolar Current - Indian Sector
  {
    name: "Antarctic Circumpolar Current",
    path: [
      [-48, 30], [-49, 45], [-50, 60], [-51, 75], [-50, 90], [-49, 105], [-50, 120]
    ]
  },
  // Leeuwin Current (Western Australia)
  {
    name: "Leeuwin Current",
    path: [
      [-21, 113], [-25, 112], [-30, 114], [-34, 116], [-36, 120], [-37, 126]
    ]
  },
];

export default function GlobeView() {
  const webglRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const meshRef = useRef<SphereMesh | null>(null);
  const buffersRef = useRef<Record<string, WebGLBuffer | null>>({});
  const earthTextureRef = useRef<WebGLTexture | null>(null);
  const specularTextureRef = useRef<WebGLTexture | null>(null);
  const dataTextureRef = useRef<WebGLTexture | null>(null);

  const stateRef = useRef({
    rotation: 1.25, // Centered on Indian Ocean & Arabian Sea
    pitch: 0.18,
    zoom: 1.15,
    targetZoom: 1.15,
    dragging: false,
    lastX: 0,
    lastY: 0,
    velX: 0,
    velY: 0,
    animTime: 0,
  });

  const [autoRotate, setAutoRotate] = useState(false);
  const [streamlinesOn, setStreamlinesOn] = useState(true);
  const [hoveredObs, setHoveredObs] = useState<Observation | null>(null);
  const [modelSlice, setModelSlice] = useState<ModelSlice | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    observations,
    obsLayersEnabled,
    selectedVariable,
    variables,
    layerOpacity,
    depthIndex,
    depthAxis,
    timeIndex,
    timeAxis,
    selectedRegion,
    selectedObservation,
    setSelectedObservation,
    vizMode,
    setVizMode,
    mode,
  } = useOceanStore();

  const curVar = variables.find((v) => v.id === selectedVariable);
  const filteredObs = useMemo(
    () => observations.filter((o) => obsLayersEnabled[o.type] ?? true),
    [observations, obsLayersEnabled]
  );

  // Focus camera smoothly when user picks a region preset
  useEffect(() => {
    const regionRotations: Record<string, { rot: number; pitch: number }> = {
      "Arabian Sea": { rot: 1.15, pitch: 0.28 },
      "Bay of Bengal": { rot: 1.55, pitch: 0.24 },
      "Indian Ocean": { rot: 1.32, pitch: 0.12 },
      "Custom Region": { rot: 1.32, pitch: 0.12 },
    };
    const target = regionRotations[selectedRegion];
    if (target) {
      stateRef.current.rotation = target.rot;
      stateRef.current.pitch = target.pitch;
    }
  }, [selectedRegion]);

  // Load live model slice from backend API whenever variable, depth, or time changes
  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .modelSlice(selectedVariable, depthIndex, timeIndex)
      .then((data) => {
        if (!alive) return;
        setModelSlice(data as ModelSlice);
      })
      .catch((err) => {
        console.warn("[OceanVis] Failed to load model slice:", err);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [selectedVariable, depthIndex, timeIndex]);

  // Create or update WebGL Data Texture whenever modelSlice changes
  const updateDataTexture = useCallback((slice: ModelSlice | null) => {
    const gl = glRef.current;
    if (!gl) return;

    if (!dataTextureRef.current) {
      dataTextureRef.current = gl.createTexture();
    }
    const tex = dataTextureRef.current;
    gl.bindTexture(gl.TEXTURE_2D, tex);

    const w = 64, h = 64;
    const pixels = new Uint8Array(w * h * 4);

    if (slice?.data && slice.data.length > 0) {
      const rows = slice.data.length;
      const cols = slice.data[0]?.length || 1;
      const min = slice.min;
      const max = slice.max;
      const range = Math.max(1e-6, max - min);

      for (let y = 0; y < h; y++) {
        const rFrac = y / (h - 1);
        const r = Math.min(rows - 1, Math.floor(rFrac * rows));
        for (let x = 0; x < w; x++) {
          const cFrac = x / (w - 1);
          const c = Math.min(cols - 1, Math.floor(cFrac * cols));
          const val = slice.data[r]?.[c] ?? min;
          const t = Math.max(0, Math.min(1, (val - min) / range));
          const [cr, cg, cb] = turboColor(t);

          const idx = (y * w + x) * 4;
          pixels[idx] = Math.floor(cr * 255);
          pixels[idx + 1] = Math.floor(cg * 255);
          pixels[idx + 2] = Math.floor(cb * 255);
          pixels[idx + 3] = 255;
        }
      }
    } else {
      // Clean fallback thermal gradient
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const t = 0.5 + 0.4 * Math.sin((x / w) * Math.PI) * Math.cos((y / h) * Math.PI);
          const [cr, cg, cb] = turboColor(t);
          const idx = (y * w + x) * 4;
          pixels[idx] = Math.floor(cr * 255);
          pixels[idx + 1] = Math.floor(cg * 255);
          pixels[idx + 2] = Math.floor(cb * 255);
          pixels[idx + 3] = 255;
        }
      }
    }

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }, []);

  useEffect(() => {
    updateDataTexture(modelSlice);
  }, [modelSlice, updateDataTexture]);

  // WebGL 3D Globe Initialization
  useEffect(() => {
    const canvas = webglRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    if (!gl) return;
    glRef.current = gl;

    // Advanced Ocean Shader with Earth Texture, Specular Water Mask, Dynamic Ocean Data Field,
    // and Atmospheric Fresnel Limb Rim Glow matching Reference Image B!
    const vs = `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      attribute vec2 aUv;

      uniform mat4 uMvp;
      uniform mat4 uModel;

      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;

      void main() {
        vNormal = normalize(mat3(uModel) * aNormal);
        vPosition = (uModel * vec4(aPosition, 1.0)).xyz;
        vUv = aUv;
        gl_Position = uMvp * vec4(aPosition, 1.0);
      }
    `;

    const fs = `
      precision mediump float;

      uniform sampler2D uEarthTexture;
      uniform sampler2D uSpecularTexture;
      uniform sampler2D uDataTexture;
      uniform float uOpacity;
      uniform float uDataMix;

      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = vec3(0.0, 0.0, 1.0);

        vec3 earthColor = texture2D(uEarthTexture, vUv).rgb;
        float waterMask = texture2D(uSpecularTexture, vUv).r; // 1.0 on oceans, 0.0 on land

        // Equirectangular mapping for regional/global scientific ocean data field
        // Center around Indian Ocean coordinates
        vec2 oceanUv = vec2(fract(vUv.x * 1.0 + 0.15), vUv.y);
        vec3 dataColor = texture2D(uDataTexture, oceanUv).rgb;

        // Lighting model
        vec3 sunDir = normalize(vec3(-0.45, 0.55, 0.85));
        float diffuse = max(dot(normal, sunDir), 0.05);

        // Vibrant atmospheric Fresnel rim glow around the spherical silhouette
        float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.2);
        vec3 atmoGlow = vec3(0.12, 0.62, 1.0) * rim * 0.92;

        // Ocean blending
        vec3 finalColor;
        if (waterMask > 0.12) {
          // On oceans: blend photorealistic bathymetry with vibrant scientific thermal field
          vec3 oceanBase = mix(vec3(0.02, 0.08, 0.18), earthColor * 0.85, 0.4);
          vec3 energizedField = mix(oceanBase, dataColor * 1.25, uOpacity * uDataMix);
          finalColor = energizedField * (0.45 + 0.75 * diffuse);
          // Ocean specular sun glint
          vec3 halfVector = normalize(sunDir + viewDir);
          float spec = pow(max(dot(normal, halfVector), 0.0), 32.0);
          finalColor += vec3(0.4, 0.7, 1.0) * spec * 0.55;
        } else {
          // On land: show crisp natural topography, mountains, deserts, ice
          finalColor = earthColor * (0.35 + 0.95 * diffuse);
        }

        finalColor += atmoGlow;
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const compileShader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(s) || "Shader compile error");
      }
      return s;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "Program link error");
    }
    programRef.current = program;

    // Build sphere geometry
    const mesh = createSphere();
    meshRef.current = mesh;

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);

    const normBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, gl.STATIC_DRAW);

    const idxBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    buffersRef.current = { pos: posBuffer, norm: normBuffer, uv: uvBuffer, idx: idxBuffer };

    // Load Earth Satellite texture
    const earthTex = gl.createTexture()!;
    earthTextureRef.current = earthTex;
    gl.bindTexture(gl.TEXTURE_2D, earthTex);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
      gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([10, 30, 60, 255])
    );

    const earthImg = new Image();
    earthImg.src = "/earth_nasa_2048.jpg";
    earthImg.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, earthTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, earthImg);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
    };

    // Load Specular Water Mask
    const specTex = gl.createTexture()!;
    specularTextureRef.current = specTex;
    gl.bindTexture(gl.TEXTURE_2D, specTex);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
      gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255])
    );

    const specImg = new Image();
    specImg.src = "/earth_specular_2048.jpg";
    specImg.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, specTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, specImg);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
    };

    updateDataTexture(modelSlice);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      Object.values(buffersRef.current).forEach((b) => b && gl.deleteBuffer(b));
      if (earthTextureRef.current) gl.deleteTexture(earthTextureRef.current);
      if (specularTextureRef.current) gl.deleteTexture(specularTextureRef.current);
      if (dataTextureRef.current) gl.deleteTexture(dataTextureRef.current);
      if (programRef.current) gl.deleteProgram(programRef.current);
    };
  }, [updateDataTexture]);

  // Main Render Loop (WebGL globe + Canvas vector overlay)
  const render = useCallback(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const mesh = meshRef.current;
    const webglCanvas = webglRef.current;
    const overlayCanvas = overlayRef.current;
    if (!gl || !program || !mesh || !webglCanvas || !overlayCanvas) return;

    const s = stateRef.current;

    // Apply auto-rotation or velocity damping
    if (autoRotate) {
      s.rotation += 0.0035;
    } else if (!s.dragging) {
      s.rotation += s.velX;
      s.pitch += s.velY;
      s.velX *= 0.92;
      s.velY *= 0.92;
      s.pitch = Math.max(-1.35, Math.min(1.35, s.pitch));
    }
    s.animTime += 0.02;

    // Smooth zoom interpolation
    s.zoom += (s.targetZoom - s.zoom) * 0.15;

    // Canvas sizing with device pixel ratio
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = webglCanvas.clientWidth;
    const h = webglCanvas.clientHeight;
    if (w <= 0 || h <= 0) return;

    const targetW = Math.floor(w * dpr);
    const targetH = Math.floor(h * dpr);

    if (webglCanvas.width !== targetW || webglCanvas.height !== targetH) {
      webglCanvas.width = targetW;
      webglCanvas.height = targetH;
    }
    if (overlayCanvas.width !== targetW || overlayCanvas.height !== targetH) {
      overlayCanvas.width = targetW;
      overlayCanvas.height = targetH;
    }

    // --- WebGL 3D Globe Pass ---
    gl.viewport(0, 0, targetW, targetH);
    gl.clearColor(0.003, 0.015, 0.035, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);

    const aspect = w / h;
    const fov = Math.PI / 4.0;
    const proj = perspective(fov, aspect, 0.1, 100.0);
    const rot = rotationMatrix(s.rotation, s.pitch);

    const dist = 3.2 / s.zoom;
    const view = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, -dist, 1,
    ]);

    const mvp = multiply4(proj, multiply4(view, rot));

    const uMvp = gl.getUniformLocation(program, "uMvp");
    const uModel = gl.getUniformLocation(program, "uModel");
    const uEarth = gl.getUniformLocation(program, "uEarthTexture");
    const uSpec = gl.getUniformLocation(program, "uSpecularTexture");
    const uData = gl.getUniformLocation(program, "uDataTexture");
    const uOpacity = gl.getUniformLocation(program, "uOpacity");
    const uDataMix = gl.getUniformLocation(program, "uDataMix");

    gl.uniformMatrix4fv(uMvp, false, mvp);
    gl.uniformMatrix4fv(uModel, false, rot);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, earthTextureRef.current);
    gl.uniform1i(uEarth, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, specularTextureRef.current);
    gl.uniform1i(uSpec, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, dataTextureRef.current);
    gl.uniform1i(uData, 2);

    gl.uniform1f(uOpacity, layerOpacity / 100.0);
    gl.uniform1f(uDataMix, vizMode === "surface" || vizMode === "depth-slice" ? 0.95 : 0.45);

    // Bind Attributes
    const aPos = gl.getAttribLocation(program, "aPosition");
    const aNorm = gl.getAttribLocation(program, "aNormal");
    const aUv = gl.getAttribLocation(program, "aUv");

    gl.bindBuffer(gl.ARRAY_BUFFER, buffersRef.current.pos);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffersRef.current.norm);
    gl.enableVertexAttribArray(aNorm);
    gl.vertexAttribPointer(aNorm, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffersRef.current.uv);
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffersRef.current.idx);
    gl.drawElements(
      gl.TRIANGLES,
      mesh.indices.length,
      mesh.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
      0
    );

    // --- 2D Vector Overlay Pass (Atmospheric Halo, Streamlines, Observations, Labels) ---
    const ctx = overlayCanvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const radius = sphereRadiusPx(w, h, s.zoom);
    const cx = w / 2;
    const cy = h / 2;

    // Glowing Atmospheric Outer Aura
    const auraGrad = ctx.createRadialGradient(cx, cy, radius * 0.98, cx, cy, radius * 1.14);
    auraGrad.addColorStop(0.0, "rgba(40, 160, 255, 0.05)");
    auraGrad.addColorStop(0.65, "rgba(30, 140, 255, 0.28)");
    auraGrad.addColorStop(1.0, "rgba(0, 80, 220, 0.0)");
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.14, 0, Math.PI * 2);
    ctx.fill();

    // Graticule Lines (Latitude / Longitude vector curves conforming to spherical perspective)
    ctx.save();
    ctx.strokeStyle = "rgba(100, 200, 255, 0.16)";
    ctx.lineWidth = 0.75;

    for (let lat = -60; lat <= 60; lat += 20) {
      ctx.beginPath();
      let first = true;
      for (let lon = -180; lon <= 180; lon += 4) {
        const p = latLonToScreen(lat, lon, s.rotation, s.pitch, radius, cx, cy);
        if (p.z > 0.02) {
          if (first) {
            ctx.moveTo(p.x, p.y);
            first = false;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        } else {
          first = true;
        }
      }
      ctx.stroke();
    }

    for (let lon = -180; lon < 180; lon += 30) {
      ctx.beginPath();
      let first = true;
      for (let lat = -80; lat <= 80; lat += 3) {
        const p = latLonToScreen(lat, lon, s.rotation, s.pitch, radius, cx, cy);
        if (p.z > 0.02) {
          if (first) {
            ctx.moveTo(p.x, p.y);
            first = false;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        } else {
          first = true;
        }
      }
      ctx.stroke();
    }
    ctx.restore();

    // Animated Ocean Current Streamlines adhering to the 3D spherical globe
    if (streamlinesOn) {
      ctx.save();
      const phase = s.animTime * 1.5;

      STREAMLINE_SYSTEMS.forEach((system) => {
        const pts = system.path.map(([lat, lon]) =>
          latLonToScreen(lat, lon, s.rotation, s.pitch, radius + 1.5, cx, cy)
        );

        // Check if segment is on visible front hemisphere
        const visiblePts = pts.filter((p) => p.z > 0.1);
        if (visiblePts.length < 2) return;

        // Draw flowing luminous streamline path
        ctx.beginPath();
        let started = false;
        pts.forEach((p) => {
          if (p.z > 0.08) {
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            started = false;
          }
        });
        ctx.strokeStyle = "rgba(120, 240, 255, 0.55)";
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Draw animated current arrowheads / particles along the curve
        for (let i = 0; i < pts.length - 1; i++) {
          const p1 = pts[i];
          const p2 = pts[i + 1];
          if (p1.z <= 0.1 || p2.z <= 0.1) continue;

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.hypot(dx, dy);
          if (len < 6) continue;

          // Pulse along the current line
          const particleT = (i * 0.35 + phase * 0.4) % 1.0;
          const px = p1.x + dx * particleT;
          const py = p1.y + dy * particleT;
          const angle = Math.atan2(dy, dx);

          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(px, py, 2.0, 0, Math.PI * 2);
          ctx.fill();

          // Streamline directional arrow
          ctx.strokeStyle = "rgba(220, 255, 255, 0.9)";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(
            px - Math.cos(angle - 0.45) * 5,
            py - Math.sin(angle - 0.45) * 5
          );
          ctx.lineTo(px, py);
          ctx.lineTo(
            px - Math.cos(angle + 0.45) * 5,
            py - Math.sin(angle + 0.45) * 5
          );
          ctx.stroke();
        }
      });
      ctx.restore();
    }

    // Observation Station Markers (Argo, Mooring, Buoy, Glider, CTD, BGC)
    filteredObs.forEach((obs) => {
      const p = latLonToScreen(obs.lat, obs.lon, s.rotation, s.pitch, radius + 2.0, cx, cy);
      if (p.z < 0.12) return; // Hidden on back of globe

      const color = OBS_COLORS[obs.type] || "#ffffff";
      const isSelected = selectedObservation?.id === obs.id;
      const isHovered = hoveredObs?.id === obs.id;
      const size = isSelected ? 8 : isHovered ? 7 : 5;

      ctx.save();
      ctx.fillStyle = color;
      ctx.strokeStyle = "#020914";
      ctx.lineWidth = 2.0;

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
      } else if (obs.type === "Mooring") {
        ctx.beginPath();
        ctx.rect(p.x - size, p.y - size, size * 2, size * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      if (isSelected || isHovered) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    });

    // Geographic Ocean Labels
    const labels: [number, number, string][] = [
      [18, 66, "Arabian Sea"],
      [15, 88, "Bay of Bengal"],
      [-6, 75, "Indian Ocean"],
      [22, 78, "India"],
      [-22, 48, "Madagascar"],
      [-30, 32, "Agulhas"],
      [-52, 70, "Southern Ocean"],
    ];

    ctx.save();
    ctx.font = "700 12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(235, 248, 255, 0.9)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 6;

    labels.forEach(([lat, lon, text]) => {
      const p = latLonToScreen(lat, lon, s.rotation, s.pitch, radius + 4, cx, cy);
      if (p.z > 0.22) {
        ctx.fillText(text, p.x, p.y);
      }
    });
    ctx.restore();

    frameRef.current = requestAnimationFrame(render);
  }, [autoRotate, streamlinesOn, filteredObs, selectedObservation, hoveredObs, layerOpacity, vizMode]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(render);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [render]);

  // Pointer Interaction Handlers (Mouse & Touch Orbit controls)
  const handlePointerDown = (e: React.PointerEvent) => {
    stateRef.current.dragging = true;
    stateRef.current.lastX = e.clientX;
    stateRef.current.lastY = e.clientY;
    stateRef.current.velX = 0;
    stateRef.current.velY = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const s = stateRef.current;
    if (s.dragging) {
      const dx = e.clientX - s.lastX;
      const dy = e.clientY - s.lastY;
      s.rotation += dx * 0.005;
      s.pitch += dy * 0.005;
      s.pitch = Math.max(-1.35, Math.min(1.35, s.pitch));
      s.velX = dx * 0.0015;
      s.velY = dy * 0.0015;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      return;
    }

    // Hover detection on observation markers
    const canvas = overlayRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const radius = sphereRadiusPx(w, h, s.zoom);
    const cx = w / 2;
    const cy = h / 2;

    let found: Observation | null = null;
    for (const obs of filteredObs) {
      const p = latLonToScreen(obs.lat, obs.lon, s.rotation, s.pitch, radius, cx, cy);
      if (p.z > 0.12) {
        const dist = Math.hypot(p.x - mx, p.y - my);
        if (dist <= 14) {
          found = obs;
          break;
        }
      }
    }
    setHoveredObs(found);
  };

  const handlePointerUp = () => {
    stateRef.current.dragging = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    stateRef.current.targetZoom = Math.max(0.75, Math.min(4.5, stateRef.current.targetZoom * factor));
  };

  const handleClick = (e: React.MouseEvent) => {
    if (hoveredObs) {
      setSelectedObservation(hoveredObs);
    }
  };

  const handleResetCamera = () => {
    stateRef.current.rotation = 1.25;
    stateRef.current.pitch = 0.18;
    stateRef.current.targetZoom = 1.15;
  };

  return (
    <div
      className="globe-view-container"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        background: "radial-gradient(ellipse at 50% 50%, #03152c 0%, #010610 100%)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 3D Globe Top Scientific Toolbar */}
      <div className="map-toolbar" style={{ zIndex: 10 }}>
        <div className="map-toolbar-left">
          <span className="map-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Globe2 size={14} color="#00d4ff" /> 3D Ocean Globe
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
            className={`btn-icon ${streamlinesOn ? "active" : ""}`}
            title="Toggle Current Streamlines"
            onClick={() => setStreamlinesOn((v) => !v)}
          >
            <Wind size={13} />
          </button>
          <button
            className={`btn-icon ${autoRotate ? "active" : ""}`}
            title="Auto Rotate Planet"
            onClick={() => setAutoRotate((v) => !v)}
          >
            {autoRotate ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button
            className="btn-icon"
            title="Zoom In"
            onClick={() => {
              stateRef.current.targetZoom = Math.min(4.5, stateRef.current.targetZoom * 1.2);
            }}
          >
            <Plus size={13} />
          </button>
          <button
            className="btn-icon"
            title="Zoom Out"
            onClick={() => {
              stateRef.current.targetZoom = Math.max(0.75, stateRef.current.targetZoom / 1.2);
            }}
          >
            <Minus size={13} />
          </button>
          <button className="btn-icon" title="Reset View" onClick={handleResetCamera}>
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Dual WebGL + Vector Canvas Stack */}
      <div
        style={{
          position: "relative",
          flex: 1,
          width: "100%",
          height: "100%",
          cursor: stateRef.current.dragging ? "grabbing" : "grab",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        onClick={handleClick}
      >
        <canvas
          ref={webglRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />
        <canvas
          ref={overlayRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
            pointerEvents: "none",
          }}
        />

        {/* Dynamic Color Scale Legend */}
        <div className="map-legend" style={{ zIndex: 15 }}>
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
            <span>{loading ? "Syncing..." : "Copernicus Marine"}</span>
            <span>{modelSlice?.max ?? curVar?.max ?? 32}</span>
          </div>
          <div className="map-legend-foot">
            <span><span className="legend-dot model" /> MODEL FIELD</span>
            <span><span className="legend-dot obs" /> OBSERVATIONS</span>
            <span><span className="legend-swatch current" /> CURRENTS</span>
          </div>
        </div>

        {/* Hovered Observation Tooltip Card */}
        {hoveredObs && (
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 16,
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
              minWidth: 200,
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
              Lat: {hoveredObs.lat.toFixed(2)}° · Lon: {hoveredObs.lon.toFixed(2)}°
            </div>
            <div>Max Depth: {hoveredObs.maxDepth} m · {hoveredObs.date}</div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
              Click station to view detailed profile
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
