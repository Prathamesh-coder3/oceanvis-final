import React, { useEffect, useRef } from "react";
import { useOceanStore } from "../store/oceanStore";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

export default function TimeControls() {
  const { timeIndex, timeAxis, isPlaying, playSpeed, setTimeIndex, setIsPlaying, setPlaySpeed } = useOceanStore();
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        useOceanStore.getState().setTimeIndex(
          (useOceanStore.getState().timeIndex + 1) % useOceanStore.getState().timeAxis.length
        );
      }, 1000 / playSpeed);
    } else if (intervalRef.current) clearInterval(intervalRef.current);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, playSpeed]);

  const cur = timeAxis[timeIndex];

  return (
    <div style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
      {/* Date + controls row */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
        <select className="select" style={{ fontSize: 11, padding: "3px 5px", flex: 1 }}
          value={timeIndex} onChange={e => setTimeIndex(Number(e.target.value))}>
          {timeAxis.map(t => (
            <option key={t.index} value={t.index}>{t.date} 12:00 UTC</option>
          ))}
        </select>
        <button className="btn-icon" onClick={() => setTimeIndex(Math.max(0, timeIndex - 1))} title="Previous">
          <SkipBack size={12} />
        </button>
        <button
          className="btn-icon active"
          onClick={() => setIsPlaying(!isPlaying)}
          title={isPlaying ? "Pause" : "Play"}
          style={{ background: "var(--accent-blue)22", borderColor: "var(--accent-blue)44" }}
        >
          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
        </button>
        <button className="btn-icon" onClick={() => setTimeIndex(Math.min(timeAxis.length - 1, timeIndex + 1))} title="Next">
          <SkipForward size={12} />
        </button>
      </div>

      {/* Period buttons */}
      <div style={{ display: "flex", gap: 3 }}>
        {["Daily", "Weekly", "Monthly", "Custom"].map((p, i) => (
          <button
            key={p}
            className={`btn btn-ghost ${i === 0 ? "active-region" : ""}`}
            style={{ fontSize: 10, padding: "2px 6px", flex: 1 }}
            onClick={() => {
              if (!timeAxis.length) return;
              if (p === "Daily") setTimeIndex(Math.min(timeAxis.length - 1, timeIndex));
              else if (p === "Weekly") setTimeIndex(Math.min(timeAxis.length - 1, timeIndex + 1));
              else if (p === "Monthly") setTimeIndex(timeAxis.length - 1);
              else setIsPlaying(false);
            }}
          >{p}</button>
        ))}
      </div>

      {/* Timeline slider */}
      <div style={{ marginTop: 6 }}>
        <input
          type="range" min={0} max={timeAxis.length - 1} value={timeIndex}
          onChange={e => setTimeIndex(Number(e.target.value))}
          className="slider"
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
          <span>{timeAxis[0]?.date}</span>
          <span>{timeAxis[timeAxis.length - 1]?.date}</span>
        </div>
      </div>
    </div>
  );
}
