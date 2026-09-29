import React from "react";
import { Map, Plus, Minus, LocateFixed } from "lucide-react";
import { useOceanStore } from "../../store/oceanStore";

const OBS_COLORS: Record<string, string> = {
  "ARGO Float": "#ff9f43", Glider: "#43d9ff", "CTD Station": "#d58cff", "BGC Sensor": "#4ee09a", Mooring: "#ffd166", Buoy: "#ff5d73",
};
function project(lon:number,lat:number){return{x:(lon+180)/360*1000,y:(90-lat)/180*520};}
export default function Map2DPanel(){
  const {observations,obsLayersEnabled,selectedVariable,variables,selectedRegion,setActiveView}=useOceanStore();
  const curVar=variables.find(v=>v.id===selectedVariable);
  return <div className="mini-map-panel">
    <div className="panel-header mini-header"><span><Map size={11} color="var(--accent-blue)"/>2D Ocean Map View</span><span className="mini-header-context">{selectedRegion} · {curVar?.name??selectedVariable}</span></div>
    <div className="mini-map-body">
      <svg viewBox="0 0 1000 520" preserveAspectRatio="xMidYMid slice" className="mini-map-svg">
        <defs><linearGradient id="miniOcean" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0b2f55"/><stop offset="1" stopColor="#02111f"/></linearGradient><radialGradient id="miniHot"><stop offset="0" stopColor="#ff2b2b" stopOpacity=".75"/><stop offset=".65" stopColor="#31e5c0" stopOpacity=".35"/><stop offset="1" stopColor="#1d5cff" stopOpacity="0"/></radialGradient></defs>
        <rect width="1000" height="520" fill="url(#miniOcean)"/>
        <g stroke="#7ccaff" strokeOpacity=".18" strokeWidth="1">{Array.from({length:7},(_,i)=><line key={`lat${i}`} x1="0" x2="1000" y1={45+i*72} y2={45+i*72}/>)}{Array.from({length:11},(_,i)=><line key={`lon${i}`} y1="0" y2="520" x1={45+i*91} x2={45+i*91}/>)}</g>
        <circle cx="645" cy="335" r="180" fill="url(#miniHot)"/><circle cx="760" cy="315" r="130" fill="url(#miniHot)" opacity=".7"/>
        <image href="/world-map.svg" x="0" y="0" width="1000" height="500" preserveAspectRatio="none" opacity=".98"/>
        {observations.filter(o=>obsLayersEnabled[o.type]).map(obs=>{const p=project(obs.lon,obs.lat);const c=OBS_COLORS[obs.type]||"#fff";return <circle key={obs.id} cx={p.x} cy={p.y} r="4" fill={c} stroke="#031120" strokeWidth="1.5"/>;})}
        <text x="555" y="220" fill="#eef8ff" opacity=".9" fontSize="16" fontWeight="700">Arabian Sea</text>
        <text x="700" y="245" fill="#eef8ff" opacity=".9" fontSize="16" fontWeight="700">Bay of Bengal</text>
        <text x="640" y="385" fill="#eef8ff" opacity=".9" fontSize="17" fontWeight="700">Indian Ocean</text>
      </svg>
      <div className="mini-map-tools"><button className="btn-icon" title="Open full 2D map" onClick={()=>setActiveView("map-2d")}><LocateFixed size={12}/></button><button className="btn-icon" title="Zoom in" onClick={()=>setActiveView("map-2d")}><Plus size={12}/></button><button className="btn-icon" title="Zoom out" onClick={()=>setActiveView("map-2d")}><Minus size={12}/></button></div>
      <div className="mini-map-badge">Stations: {observations.length}</div>
    </div>
  </div>
}
