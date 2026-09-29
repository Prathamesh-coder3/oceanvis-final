(() => {
  'use strict';

  const OBS_FALLBACK = [
    ['TB07593','ARGO Float',12.5,72.1,2000], ['TB07594','ARGO Float',18.3,65.2,2000], ['TB07595','ARGO Float',8.7,78.4,1500],
    ['TB07596','ARGO Float',15.1,60.8,2000], ['TB07597','ARGO Float',22.4,68.3,1800],
    ['GL001','Glider',10.2,74.5,500], ['GL002','Glider',14.8,71.2,600],
    ['CTD001','CTD Station',16.5,82.3,1000], ['CTD002','CTD Station',11.3,77.8,800], ['CTD003','CTD Station',20.1,70.4,1200],
    ['BGC001','BGC Sensor',9.6,80.1,300], ['BGC002','BGC Sensor',17.2,63.5,200],
    ['MR001','Mooring',0,80.5,500], ['MR002','Mooring',15,90,700], ['BY001','Buoy',6.8,73.2,5], ['BY002','Buoy',24.5,67.1,5]
  ].map(([id,type,lat,lon,maxDepth]) => ({id,type,lat,lon,maxDepth}));

  const OBS_COLORS = {
    'ARGO Float':'#ff9f43', Glider:'#43d9ff', 'CTD Station':'#d58cff',
    'BGC Sensor':'#4ee09a', Mooring:'#ffd166', Buoy:'#ff5d73'
  };

  const VAR_INFO = {
    temperature:{min:18,max:31,label:'Sea Surface Temperature',unit:'°C',colormap:'thermal'},
    salinity:{min:32,max:38,label:'Salinity',unit:'PSU',colormap:'haline'},
    currents:{min:0,max:2,label:'Currents (U/V)',unit:'m/s',colormap:'speed'},
    chlorophyll:{min:.01,max:3,label:'Chlorophyll-a',unit:'mg/m³',colormap:'algae'},
    mld:{min:10,max:120,label:'Mixed Layer Depth',unit:'m',colormap:'deep'},
    ssh:{min:-.5,max:.5,label:'Sea Surface Height',unit:'m',colormap:'balance'},
    oxygen:{min:150,max:280,label:'Dissolved Oxygen',unit:'µmol/kg',colormap:'matter'},
    nutrients:{min:0,max:30,label:'Nutrients',unit:'µmol/L',colormap:'turbid'}
  };

  const DEFAULT_TIMES = ['2024-01-01','2024-01-08','2024-01-15','2024-01-22','2024-02-01','2024-02-08','2024-02-15'];
  const cache = new Map();
  const loaded = { observations: OBS_FALLBACK, dataset: null };
  const hosts = new WeakMap();

  function addStyle() {
    if (document.getElementById('oceanvis-upgrade-style')) return;
    const style = document.createElement('style');
    style.id = 'oceanvis-upgrade-style';
    style.textContent = `
      .ov-upgrade-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;display:block}
      .ov-upgrade-canvas.globe{z-index:7}
      .ov-upgrade-hud{position:absolute;z-index:12;pointer-events:none;font:600 10px/1.25 Inter,system-ui,sans-serif;color:#b9ddf5;letter-spacing:.35px}
      .ov-upgrade-hud .ov-chip{display:inline-flex;align-items:center;gap:6px;margin:0 4px 4px 0;padding:6px 8px;border:1px solid rgba(58,135,195,.72);border-radius:7px;background:rgba(4,17,31,.82);backdrop-filter:blur(6px);box-shadow:0 5px 16px rgba(0,0,0,.24)}
      .ov-upgrade-hud .ov-dot{width:7px;height:7px;border-radius:50%;display:inline-block;box-shadow:0 0 7px currentColor}
      .ov-upgrade-hud .ov-field-bar{width:128px;height:7px;border-radius:999px;background:linear-gradient(90deg,#2136ff,#23b7ff,#49edbe,#ffe267,#ff742e,#ff2626);border:1px solid rgba(255,255,255,.10)}
      .ov-upgrade-hud .ov-legend{position:absolute;left:0;top:32px;display:flex;align-items:center;gap:7px;padding:7px 9px;white-space:nowrap;border:1px solid rgba(58,135,195,.62);border-radius:7px;background:rgba(4,17,31,.78)}
      .ov-upgrade-hud .ov-caption{color:#7194af;font-weight:500}
      .ov-upgrade-hud.map-hud{left:12px;top:12px}
      .ov-upgrade-hud.globe-hud{left:14px;bottom:14px}
      .ov-upgrade-hud .ov-pill{padding:3px 6px;border-radius:999px;border:1px solid rgba(58,135,195,.55);background:rgba(4,17,31,.74)}
      .map-legend-foot{margin-top:6px;display:flex;gap:10px;color:#7898b0;font-size:8px}
      .legend-dot,.legend-swatch{display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:4px;vertical-align:1px}
      .legend-dot.model,.legend-swatch.model{background:#39e0a5;box-shadow:0 0 5px #39e0a5}.legend-dot.obs,.legend-swatch.obs{background:#ffd166;box-shadow:0 0 5px #ffd166}.legend-swatch.current{background:#8eeaff;box-shadow:0 0 5px #8eeaff}
      .map-north-arrow{position:absolute;right:12px;top:12px;width:32px;height:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;color:#dff7ff;font:700 9px/1 Inter,system-ui,sans-serif;background:rgba(4,17,31,.78);border:1px solid rgba(58,135,195,.65);border-radius:7px;pointer-events:none}
      .map-north-arrow svg{color:#72dcff}
      .map-scale-bar{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);display:flex;align-items:center;gap:7px;color:#7e9db4;font:500 8px Inter,system-ui,sans-serif;background:rgba(4,17,31,.70);border:1px solid rgba(58,135,195,.45);padding:4px 7px;border-radius:6px;pointer-events:none}
      .scale-line{display:flex;align-items:center}.scale-line i{display:block;width:32px;height:4px;border-top:1px solid #8edfff;border-bottom:1px solid #8edfff}.scale-line i:nth-child(2){border-left:1px solid #8edfff;border-right:1px solid #8edfff}
      .map-measure-card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(4,17,31,.92);border:1px solid rgba(58,135,195,.78);border-radius:8px;box-shadow:0 12px 28px rgba(0,0,0,.4);pointer-events:auto}
      .map-measure-card strong{font-size:14px;color:#e7f7ff}.map-measure-card span{font-size:9px;color:#7597af}.map-measure-card .btn-icon{width:22px;height:22px}
      .globe-science-legend{position:absolute;right:14px;bottom:14px;z-index:12;display:flex;flex-direction:column;gap:4px;padding:7px 9px;border:1px solid rgba(58,135,195,.62);border-radius:7px;background:rgba(4,17,31,.78);color:#7fa2bd;font:600 8px Inter,system-ui,sans-serif;pointer-events:none}
    `;
    document.head.appendChild(style);
  }

  function knownVariable(text) {
    const t = String(text || '').toLowerCase();
    for (const id of Object.keys(VAR_INFO)) {
      if (t.includes(id) || t.includes(VAR_INFO[id].label.toLowerCase())) return id;
    }
    if (t.includes('temp')) return 'temperature';
    return 'temperature';
  }

  function currentContext(container) {
    const globeText = container.querySelector('.globe-context-label')?.textContent || '';
    const mapTexts = [...container.querySelectorAll('.map-context')].map(n => n.textContent || '').join(' ');
    const headerRegion = [...document.querySelectorAll('.app-header .active-region')].map(n => n.textContent || '').join(' ');
    const text = `${globeText} ${mapTexts} ${headerRegion}`;
    const regions=['Arabian Sea','Bay of Bengal','Indian Ocean','Custom Region'];
    const region=regions.find(r=>text.includes(r)) || 'Indian Ocean';
    const depthMatch = text.match(/(?:Depth:\s*|\b)(\d{1,4})\s*m\b/);
    const depth = depthMatch ? Number(depthMatch[1]) : 0;
    const variable = knownVariable(text);
    let timeIndex = 2;
    const selects = [...document.querySelectorAll('.right-panel-responsive select.select')];
    const timeSelect = selects.find(s => [...s.options].some(o => String(o.textContent || '').includes('UTC')));
    if (timeSelect) timeIndex = Number(timeSelect.value) || 0;
    const ranges=[...document.querySelectorAll('input[type="range"]')];
    const opacityNode=ranges.find(r => (r.parentElement?.textContent || '').includes('Layer Opacity')) || document.querySelector('[data-oceanvis-layer-panel] input[type="range"]');
    const opacity=opacityNode ? Number(opacityNode.value || 80) : 80;
    return { region, variable, depthIndex: Math.max(0, Math.min(13, Math.round(depthToIndex(depth)))), timeIndex, opacity };
  }

  function depthToIndex(depth) {
    const axis = [0,10,25,50,75,100,150,200,300,500,750,1000,1500,2000];
    let best = 0, bestD = Infinity;
    axis.forEach((d,i) => { const dd = Math.abs(d-depth); if (dd<bestD) {best=i;bestD=dd;} });
    return best;
  }

  function fetchModel(variable, depthIndex, timeIndex) {
    const key = `${variable}|${depthIndex}|${timeIndex}`;
    if (cache.has(key)) return cache.get(key);
    const fallback = makeFallbackField(variable, depthIndex, timeIndex);
    cache.set(key, fallback);
    fetch(`/api/demo/model-slice?variable=${encodeURIComponent(variable)}&depthIndex=${depthIndex}&timeIndex=${timeIndex}`, {cache:'no-store'})
      .then(r => r.ok ? r.json() : Promise.reject(new Error('model unavailable')))
      .then(data => { if (data && Array.isArray(data.data)) cache.set(key, data); })
      .catch(() => {});
    return fallback;
  }

  function loadObservations() {
    if (window.__oceanvisUpgradeObsPromise) return window.__oceanvisUpgradeObsPromise;
    window.__oceanvisUpgradeObsPromise = fetch('/api/demo/observations', {cache:'force-cache'})
      .then(r => r.ok ? r.json() : Promise.reject(new Error('obs unavailable')))
      .then(data => { if (Array.isArray(data)) loaded.observations = data; return loaded.observations; })
      .catch(() => loaded.observations);
    return window.__oceanvisUpgradeObsPromise;
  }

  function makeFallbackField(variable, depthIndex, timeIndex) {
    const info = VAR_INFO[variable] || VAR_INFO.temperature;
    const rows = 20, cols = 20, data = [];
    const depth = [0,10,25,50,75,100,150,200,300,500,750,1000,1500,2000][depthIndex] || 0;
    const phase = timeIndex * 0.55 - depth * 0.0009 + variable.length * 0.11;
    for (let r=0;r<rows;r++) {
      const row=[];
      for (let c=0;c<cols;c++) {
        const x=c/(cols-1), y=r/(rows-1);
        const wave = .50 + .22*Math.sin((x*5.8)+phase) + .18*Math.cos((y*5.1)-phase*.7) + .10*Math.sin((x+y)*8.7);
        row.push(info.min + Math.max(0,Math.min(1,wave))*(info.max-info.min));
      }
      data.push(row);
    }
    return {gridSize:20,data,min:info.min,max:info.max,unit:info.unit};
  }

  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function colorScale(value,min,max,variable='temperature') {
    const t = clamp((value-min)/Math.max(1e-9,max-min),0,1);
    let h = 228 - 228*t, s=90, l=45+12*t;
    if(variable==='salinity') h=245-210*t;
    else if(variable==='chlorophyll') h=85+90*t;
    else if(variable==='oxygen') h=210-70*t;
    else if(variable==='nutrients') h=40+250*t;
    return `hsl(${h} ${s}% ${l}%)`;
  }

  function project2D(lon,lat,transform,w,h) {
    const bx=(lon+180)/360*1200, by=(90-lat)/180*600;
    const k=Math.min(w/1200,h/600);
    const ox=(w-1200*k)/2, oy=(h-600*k)/2;
    const x=(600+transform.panX)+(bx-600)*transform.zoom;
    const y=(300+transform.panY)+(by-300)*transform.zoom;
    return {x:ox+x*k,y:oy+y*k};
  }

  function parseMapTransform(map) {
    const g=[...map.querySelectorAll('g[transform]')].find(el => (el.getAttribute('transform')||'').includes('scale('));
    const t=g?.getAttribute('transform') || '';
    const m=t.match(/translate\(([-+\d.]+)\s+([-+\d.]+)\)\s+scale\(([-+\d.]+)\)/);
    return m ? {panX:Number(m[1])-600,panY:Number(m[2])-300,zoom:Number(m[3])} : {panX:0,panY:0,zoom:1};
  }

  function isWaterCell(lat,lon) {
    if (lat > 22 && lon > 75) return false;
    if (lat > 9 && lon > 67 && lon < 91) return false;
    if (lon > 77 && lon < 82 && lat > 5 && lat < 10) return false;
    if (lat > 25 && lon < 72) return true;
    return lon >= 55 && lon <= 95 && lat >= -10 && lat <= 30;
  }

  function draw2DField(ctx,w,h,field,ctxInfo,transform) {
    const rows=field.data.length, cols=field.data[0]?.length||0;
    const {variable}=ctxInfo;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const lon=55+(c+.5)/cols*40;
        const lat=30-(r+.5)/rows*40;
        if(!isWaterCell(lat,lon)) continue;
        const p=project2D(lon,lat,transform,w,h);
        const p0=project2D(55+c/cols*40,30-r/rows*40,transform,w,h);
        const p1=project2D(55+(c+1)/cols*40,30-(r+1)/rows*40,transform,w,h);
        const val=field.data[r][c];
        ctx.fillStyle=colorScale(val,field.min,field.max,variable);
        ctx.globalAlpha=.32;
        ctx.fillRect(p0.x,p0.y,Math.max(1,p1.x-p0.x+.7),Math.max(1,p1.y-p0.y+.7));
      }
    }
    ctx.globalAlpha=1;
  }

  function drawArrows2D(ctx,w,h,transform){
    ctx.save(); ctx.strokeStyle='#b4efff'; ctx.fillStyle='#b4efff'; ctx.globalAlpha=.72; ctx.lineWidth=1;
    for(let lat=-6;lat<=20;lat+=5){
      for(let lon=58;lon<=93;lon+=5){
        if(!isWaterCell(lat,lon)) continue;
        const p=project2D(lon,lat,transform,w,h);
        const a=.65*Math.sin(lon*.09+lat*.06)+.55*Math.cos(lon*.03-lat*.05);
        const len=8.5, ex=p.x+Math.cos(a)*len, ey=p.y-Math.sin(a)*len;
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(ex,ey);ctx.stroke();
        ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex-Math.cos(a-.55)*3.5,ey+Math.sin(a-.55)*3.5);ctx.lineTo(ex-Math.cos(a+.55)*3.5,ey+Math.sin(a+.55)*3.5);ctx.closePath();ctx.fill();
      }
    }
    ctx.restore();
  }

  function draw2DMarkers(ctx,w,h,transform,obs){
    obs.forEach(o=>{
      if(!o || !Number.isFinite(Number(o.lat)) || !Number.isFinite(Number(o.lon))) return;
      const p=project2D(Number(o.lon),Number(o.lat),transform,w,h); if(p.x<-30||p.x>w+30||p.y<-30||p.y>h+30) return;
      const c=OBS_COLORS[o.type]||'#fff'; ctx.save(); ctx.fillStyle=c; ctx.strokeStyle='#061425'; ctx.lineWidth=2;
      if(o.type==='Glider'){ctx.beginPath();ctx.moveTo(p.x,p.y-6);ctx.lineTo(p.x+6,p.y+5);ctx.lineTo(p.x-6,p.y+5);ctx.closePath();ctx.fill();ctx.stroke();}
      else if(o.type==='CTD Station'){ctx.beginPath();ctx.moveTo(p.x,p.y-6);ctx.lineTo(p.x+6,p.y);ctx.lineTo(p.x,p.y+6);ctx.lineTo(p.x-6,p.y);ctx.closePath();ctx.fill();ctx.stroke();}
      else if(o.type==='Buoy'){ctx.beginPath();ctx.rect(p.x-4.5,p.y-4.5,9,9);ctx.fill();ctx.stroke();}
      else {ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill();ctx.stroke();}
      ctx.restore();
    });
  }

  function install2D(host) {
    const wrap=host.querySelector('.map-canvas-wrap'); if(!wrap || hosts.has(wrap)) return;
    hosts.set(wrap,true);
    const map=wrap.querySelector('.map-svg'); if(!map) return;
    // Remove duplicated prototype field/flow/markers while keeping the cartographic base image.
    const rootG=[...map.children].find(el=>el.tagName==='g' && (el.getAttribute('transform')||'').includes('scale('));
    if(rootG){
      const kids=[...rootG.children];
      if(kids[1]) kids[1].style.opacity='0';
      if(kids[3]) kids[3].style.opacity='0';
      if(kids[4]) kids[4].style.opacity='0';
      [...rootG.querySelectorAll('g[transform^="translate("]')].forEach(g=>g.style.opacity='0');
    }
    const canvas=document.createElement('canvas'); canvas.className='ov-upgrade-canvas map'; wrap.appendChild(canvas);
    const hud=document.createElement('div'); hud.className='ov-upgrade-hud map-hud'; hud.innerHTML=`<span class="ov-chip"><span class="ov-dot" style="color:#39e0a5;background:#39e0a5"></span>MODEL FIELD</span><span class="ov-chip"><span class="ov-dot" style="color:#ffd166;background:#ffd166"></span>OBSERVATIONS</span><div class="ov-legend"><span class="ov-caption">Value</span><span class="ov-field-bar"></span><span class="ov-caption">low → high</span></div>`; wrap.appendChild(hud);
    let lastKey='';
    let field=makeFallbackField('temperature',0,2);
    let obs=loaded.observations;
    loadObservations().then(v=>{obs=v;});
    const draw=()=>{
      if(!wrap.isConnected) return;
      const dpr=Math.min(devicePixelRatio||1,2), w=wrap.clientWidth, h=wrap.clientHeight; if(!w||!h){requestAnimationFrame(draw);return;}
      if(canvas.width!==Math.floor(w*dpr)||canvas.height!==Math.floor(h*dpr)){canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);} 
      const ctx=canvas.getContext('2d'); if(!ctx) return; ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h);
      const c=currentContext(host), key=`${c.variable}|${c.depthIndex}|${c.timeIndex}|${w}|${h}`;
      field=fetchModel(c.variable,c.depthIndex,c.timeIndex);
      const tr=parseMapTransform(map);
      ctx.globalAlpha=clamp(c.opacity/80,0,1);
      draw2DField(ctx,w,h,field,c,tr); drawArrows2D(ctx,w,h,tr); draw2DMarkers(ctx,w,h,tr,obs);
      ctx.globalAlpha=1;
      // Refined regional boundary cue.
      ctx.save(); ctx.strokeStyle='rgba(120,209,247,.22)'; ctx.lineWidth=1; ctx.setLineDash([4,4]);
      const a=project2D(55,-10,tr,w,h), b=project2D(95,30,tr,w,h); ctx.strokeRect(a.x,b.y,b.x-a.x,a.y-b.y); ctx.restore();
      if(key!==lastKey){lastKey=key;}
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  function latLonToScreen(latDeg,lonDeg,rotation,pitch,radius,cx,cy){
    const lat=latDeg*Math.PI/180, lon=lonDeg*Math.PI/180, cl=Math.cos(lat), rel=lon-rotation, cosL=Math.cos(rel), sinL=Math.sin(rel);
    const x=cl*sinL, y=Math.sin(lat)*Math.cos(pitch)-cl*cosL*Math.sin(pitch), z=Math.sin(lat)*Math.sin(pitch)+cl*cosL*Math.cos(pitch);
    return {x:cx+x*radius,y:cy-y*radius,z};
  }

  function drawGlobeField(ctx,w,h,field,variable,rotation,pitch,zoom,mode,obs){
    const f=1/Math.tan((Math.PI/4.2)/2), dist=3.3/zoom, radius=Math.min(w,h)*.5*f/dist*.94, cx=w/2, cy=h/2;
    ctx.save();
    // soft ocean-field veil
    const rows=field.data.length, cols=field.data[0]?.length||0;
    const stride=rows>=20?2:1;
    ctx.globalCompositeOperation='screen';
    for(let r=0;r<rows;r+=stride){for(let c=0;c<cols;c+=stride){
      const v=field.data[r]?.[c]; if(!Number.isFinite(v)) continue;
      const lat=30-(r+.5)/rows*40, lon=55+(c+.5)/cols*40, p=latLonToScreen(lat,lon,rotation,pitch,radius,cx,cy);
      if(p.z<.03) continue;
      const t=clamp((v-field.min)/Math.max(1e-9,field.max-field.min),0,1);
      ctx.globalAlpha=.20+clamp(p.z,0,1)*.30; ctx.fillStyle=colorScale(v,field.min,field.max,variable);
      ctx.beginPath();ctx.arc(p.x,p.y,Math.max(3.5,Math.min(8.5,radius*.014))*(.9+.2*t),0,Math.PI*2);ctx.fill();
    }}
    ctx.restore();

    // Scientific graticule.
    ctx.save(); ctx.strokeStyle='rgba(134,218,255,.22)'; ctx.lineWidth=.65;
    for(let lat=-60;lat<=60;lat+=15){const pts=[];for(let lon=-180;lon<=180;lon+=4)pts.push(latLonToScreen(lat,lon,rotation,pitch,radius,cx,cy));drawArc(ctx,pts);}
    for(let lon=-180;lon<180;lon+=15){const pts=[];for(let lat=-90;lat<=90;lat+=3)pts.push(latLonToScreen(lat,lon,rotation,pitch,radius,cx,cy));drawArc(ctx,pts);}
    ctx.restore();

    if(mode==='depth-slice'||mode!=='surface'){
      const depthFrac=clamp((field.depthIndex||0)/13,0,1); ctx.save();ctx.strokeStyle='rgba(92,220,255,.36)';ctx.setLineDash([5,5]);ctx.beginPath();ctx.ellipse(cx,cy+depthFrac*radius*.23,radius*(.60+depthFrac*.12),radius*(.16+depthFrac*.06),0,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    if(mode==='volume-3d'){ctx.save();ctx.strokeStyle='rgba(104,210,255,.18)';for(let i=1;i<=4;i++){ctx.beginPath();ctx.arc(cx,cy,radius*(.86-i*.11),0,Math.PI*2);ctx.stroke();}ctx.restore();}

    // Current vectors.
    if(mode==='surface'||mode==='currents'||mode==='volume-3d'){
      ctx.save();ctx.strokeStyle='#8eeaff';ctx.fillStyle='#8eeaff';ctx.globalAlpha=.70;ctx.lineWidth=1;
      for(let lat=-30;lat<=30;lat+=5){for(let lon=40;lon<=110;lon+=5){const p=latLonToScreen(lat,lon,rotation,pitch,radius,cx,cy);if(p.z<.12)continue;const a=Math.sin(lon*.11+lat*.08)*.9+Math.cos(lon*.04);const len=Math.max(5,Math.min(11,radius/38));const ex=p.x+Math.cos(a)*len,ey=p.y-Math.sin(a)*len;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(ex,ey);ctx.stroke();ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex-Math.cos(a-.55)*4,ey+Math.sin(a-.55)*4);ctx.lineTo(ex-Math.cos(a+.55)*4,ey+Math.sin(a+.55)*4);ctx.closePath();ctx.fill();}}
      ctx.restore();
    }

    // Tracks mode uses short, visible demo tails so the mode is distinguishable.
    if(mode==='tracks'){
      ctx.save();ctx.strokeStyle='rgba(146,236,255,.70)';ctx.lineWidth=1.5;ctx.setLineDash([4,5]);
      obs.forEach((o,i)=>{const a=latLonToScreen(o.lat,o.lon,rotation,pitch,radius,cx,cy),b=latLonToScreen(o.lat-(2+i%3),o.lon-(3+i%4),rotation,pitch,radius,cx,cy);if(a.z<.08&&b.z<.08)return;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(a.x,a.y);ctx.stroke();});ctx.restore();
    }

    obs.forEach(o=>{const p=latLonToScreen(Number(o.lat),Number(o.lon),rotation,pitch,radius,cx,cy);if(p.z<.1)return;const color=OBS_COLORS[o.type]||'#fff';ctx.save();ctx.fillStyle=color;ctx.strokeStyle='#041224';ctx.lineWidth=2;const size=5.3;
      if(o.type==='Glider'){ctx.beginPath();ctx.moveTo(p.x,p.y-size);ctx.lineTo(p.x+size,p.y+size);ctx.lineTo(p.x-size,p.y+size);ctx.closePath();ctx.fill();ctx.stroke();}
      else if(o.type==='CTD Station'){ctx.beginPath();ctx.moveTo(p.x,p.y-size);ctx.lineTo(p.x+size,p.y);ctx.lineTo(p.x,p.y+size);ctx.lineTo(p.x-size,p.y);ctx.closePath();ctx.fill();ctx.stroke();}
      else if(o.type==='Buoy'){ctx.beginPath();ctx.rect(p.x-size,p.y-size,size*2,size*2);ctx.fill();ctx.stroke();}
      else {ctx.beginPath();ctx.arc(p.x,p.y,size,0,Math.PI*2);ctx.fill();ctx.stroke();}
      ctx.restore();
    });

    const labels=[[20,67,'Arabian Sea'],[14,90,'Bay of Bengal'],[-8,77,'Indian Ocean'],[22,79,'India']];
    ctx.save();ctx.font='700 13px Inter,system-ui,sans-serif';ctx.fillStyle='rgba(236,249,255,.88)';ctx.textAlign='center';ctx.shadowColor='rgba(0,0,0,.72)';ctx.shadowBlur=5;labels.forEach(([lat,lon,label])=>{const p=latLonToScreen(lat,lon,rotation,pitch,radius,cx,cy);if(p.z>.20)ctx.fillText(label,p.x,p.y);});ctx.restore();
    return radius;
  }

  function drawArc(ctx,points){let drawing=false;ctx.beginPath();for(const p of points){if(p.z>.04){if(!drawing){ctx.moveTo(p.x,p.y);drawing=true}else ctx.lineTo(p.x,p.y)}else drawing=false;}}

  function install3D(host){
    if(hosts.has(host)) return;
    hosts.set(host,true);
    const base=host.querySelector('.globe-overlay'); const view=host.querySelector('.globe-view') || host; if(!view) return;
    const canvas=document.createElement('canvas'); canvas.className='ov-upgrade-canvas globe'; view.appendChild(canvas);
    if(base) base.style.opacity='0';
    const hud=document.createElement('div'); hud.className='ov-upgrade-hud globe-hud'; hud.innerHTML=`<span class="ov-chip"><span class="ov-dot" style="color:#39e0a5;background:#39e0a5"></span>MODEL FIELD</span><span class="ov-chip"><span class="ov-dot" style="color:#ffd166;background:#ffd166"></span>OBSERVATIONS</span><span class="ov-chip"><span class="ov-pill">DEMO / SYNTHETIC</span></span>`; view.appendChild(hud);
    let rotation=.45, pitch=.10, zoom=1.0, drag=false, lx=0, ly=0, regionRotKey='';
    const getMode=()=>{
      const btn=[...host.querySelectorAll('.viz-mode-stack .btn-icon.active')][0];
      return btn?.title || 'surface';
    };
    if(base){
      base.addEventListener('pointerdown',e=>{drag=true;lx=e.clientX;ly=e.clientY;});
      base.addEventListener('pointermove',e=>{if(!drag)return;rotation+=(e.clientX-lx)*.0055;pitch=clamp(pitch+(e.clientY-ly)*.0045,-1.15,1.15);lx=e.clientX;ly=e.clientY;});
      base.addEventListener('pointerup',()=>drag=false);base.addEventListener('pointerleave',()=>drag=false);
      base.addEventListener('wheel',e=>{zoom=clamp(zoom*(e.deltaY>0?.92:1.09),.78,1.95);},{passive:true});
    }
    let field=makeFallbackField('temperature',0,2), obs=loaded.observations;
    loadObservations().then(v=>{obs=v;});
    const draw=()=>{
      if(!view.isConnected) return;
      const dpr=Math.min(devicePixelRatio||1,2), w=view.clientWidth,h=view.clientHeight;if(!w||!h){requestAnimationFrame(draw);return;}
      if(canvas.width!==Math.floor(w*dpr)||canvas.height!==Math.floor(h*dpr)){canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr)}
      const ctx=canvas.getContext('2d');if(!ctx){requestAnimationFrame(draw);return;}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
      const c=currentContext(host);
      const regionPresets={'Arabian Sea':1.20,'Bay of Bengal':0.10,'Indian Ocean':0.52,'Custom Region':0.52};
      if(c.region!==regionRotKey){rotation=regionPresets[c.region]??0.52;regionRotKey=c.region;}
      field=fetchModel(c.variable,c.depthIndex,c.timeIndex);field.depthIndex=c.depthIndex;
      ctx.globalAlpha=clamp(c.opacity/80,0,1);
      const activeRotate=!!host.querySelector('.globe-control-stack .btn-icon[title="Auto rotate"].active');if(activeRotate&&!drag)rotation+=.00030;
      const mode=getMode();drawGlobeField(ctx,w,h,field,c.variable,rotation,pitch,zoom,mode,obs);
      ctx.globalAlpha=1;
      // Keep the HUD context accurate even when React's compact label is hidden by another panel.
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  function scan(){
    addStyle();
    document.querySelectorAll('.map2d-view').forEach(el => { if (el.dataset.oceanvisCore !== 'enhanced') install2D(el); });
    document.querySelectorAll('.globe-view').forEach(el => { if (el.dataset.oceanvisCore !== 'enhanced') install3D(el); });
  }

  const observer=new MutationObserver(()=>scan());
  window.addEventListener('load',scan);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(scan,1000);
})();
