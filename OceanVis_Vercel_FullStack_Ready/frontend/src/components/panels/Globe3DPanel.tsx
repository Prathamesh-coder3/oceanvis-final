import React from "react";
import { Globe2 } from "lucide-react";
import { useOceanStore } from "../../store/oceanStore";
export default function Globe3DPanel(){
  const {depthIndex,depthAxis,selectedVariable,setSelectedVariable,vizMode,setVizMode,variables,setActiveView}=useOceanStore();
  const modes=["surface","depth-slice","volume-3d","isosurface","currents","tracks"];
  return <div className="mini-globe-panel">
    <div className="panel-header mini-header"><span><Globe2 size={11} color="var(--accent-cyan)"/>3D Ocean Globe (Interactive)</span><span className="mini-header-context">Depth: {depthAxis[depthIndex]??0} m</span></div>
    <div className="mini-globe-body">
      <div className="mini-globe-canvas">
        <div className="mini-earth"><img src="/world-map.svg" alt="Earth"/></div>
        <div className="mini-earth-grid"/>
        <div className="mini-earth-label">{vizMode.replace("-"," ").toUpperCase()}</div>
      </div>
      <div className="mini-globe-controls">
        {modes.map(m=><button key={m} className={`btn-icon ${vizMode===m?"active":""}`} title={m} onClick={()=>setVizMode(m)}>{modes.indexOf(m)+1}</button>)}
      </div>
      <div className="mini-variable-row">{variables.slice(0,4).map(v=><button key={v.id} className={`btn btn-ghost ${selectedVariable===v.id?"active":""}`} onClick={()=>setSelectedVariable(v.id)}>{v.name.replace("Sea Surface ","")}</button>)}<button className="btn btn-primary" onClick={()=>setActiveView("globe-3d")}>Open 3D</button></div>
    </div>
  </div>
}
