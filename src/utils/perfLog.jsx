import { useState } from "react";

// ── On-screen performance logger — tap to clear, shows last 12 events ─────────
let _perfSetLog = null;
window._perfLog = function(label) {
  const now = performance.now();
  window._perfLogs = window._perfLogs || [];
  const dt = window._perfLogs.length ? Math.round(now - window._perfLogs[window._perfLogs.length-1].t) : 0;
  window._perfLogs = [...window._perfLogs.slice(-11), { label, t: now, dt }];
  _perfSetLog?.(window._perfLogs);
};
export function perfLog(label) { window._perfLog(label); }

export function PerfOverlay({ open, onToggle }) {
  const [logs, setLogs] = useState([]);
  _perfSetLog = setLogs;

  if (!open) return null;

  return (
    <div style={{
      position:"fixed", top:8, right:8, zIndex:99999,
      fontFamily:"monospace", pointerEvents:"auto",
    }}>
      <div style={{
          width:260,
          background:"rgba(0,0,0,.92)", border:"1px solid #555",
          borderRadius:6, padding:"6px 8px",
          fontSize:10, color:"#ccc",
        }}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,alignItems:"center"}}>
            <span style={{color:"#f0c040",fontWeight:700,fontSize:11}}>⏱ PERF LOG</span>
            <span
              onTouchEnd={e=>{e.stopPropagation();window._perfLogs=[];setLogs([]);}}
              onClick={e=>{e.stopPropagation();window._perfLogs=[];setLogs([]);}}
              style={{color:"#aaa",padding:"2px 8px",background:"#333",borderRadius:3,cursor:"pointer"}}>CLR</span>
          </div>
          {logs.length === 0
            ? <div style={{color:"#666",fontSize:9}}>tap a tile or pan to record...</div>
            : logs.map((l,i) => (
              <div key={i} style={{
                display:"flex",justifyContent:"space-between",
                borderBottom:"1px solid #222",padding:"2px 0",
                color: l.dt > 100 ? "#ff5050" : l.dt > 33 ? "#f0c040" : "#66dd66"
              }}>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{l.label}</span>
                <span style={{marginLeft:8,flexShrink:0,fontWeight:700}}>+{l.dt}ms</span>
              </div>
            ))
          }
          <div style={{fontSize:8,color:"#555",marginTop:3}}>🔴&gt;100ms 🟡&gt;33ms 🟢fast</div>
        </div>
    </div>
  );
}
