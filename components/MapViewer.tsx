"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { worldToRadar, getMapConfig } from "@/lib/mapConfig";
import {
  drawGrenades,
  drawHeatmap,
  drawKills,
  drawPlayers,
  drawRadar,
  resolveActiveLowerLevel,
} from "@/lib/csdm/viewer/draw";

interface Kill {
  tick: number;
  attackerSteamId: string;
  victimSteamId: string;
  weapon: string;
  headshot: boolean;
  x: number;
  y: number;
  z?: number;
}

interface PlayerPosition {
  tick: number;
  steamId: string;
  x: number;
  y: number;
  z?: number;
  yaw: number;
}

interface GrenadeTrajectoryPoint { x: number; y: number; z: number }
interface GrenadeEvent {
  tick: number;
  type: string;
  steamId: string;
  trajectory: GrenadeTrajectoryPoint[];
}
interface DamageEvent {
  tick: number;
  attackerSteamId: string;
  victimSteamId: string;
  damage: number;
  hitgroup: string;
}

interface Round { roundNum: number; winner: string; tScore: number; ctScore: number }
interface PlayerStat { steamId: string; playerName: string; team: string }

interface MapViewerProps {
  mapName: string;
  kills: Kill[];
  playerPositions: PlayerPosition[];
  grenadeEvents: GrenadeEvent[];
  damages: DamageEvent[];
  rounds: Round[];
  playerStats: PlayerStat[];
  totalTicks?: number;
}

const TICK_RATE = 64;
const MAPS_WITH_LOWER_RADAR = new Set([
  "cs_militia",
  "de_nuke",
  "de_palais",
  "de_thera",
  "de_train",
  "de_vertigo",
]);

export default function MapViewer({
  mapName,
  kills,
  playerPositions,
  grenadeEvents,
  damages,
  rounds,
  playerStats,
  totalTicks,
}: MapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastRealTimeRef = useRef<number>(0);

  const [currentTick, setCurrentTick] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentRound, setCurrentRound] = useState(0);
  const [radarLevel, setRadarLevel] = useState<"auto" | "upper" | "lower">("auto");
  const [stylePreset, setStylePreset] = useState<"classic" | "cinematic">("classic");
  const [layers, setLayers] = useState({
    players: true,
    grenades: true,
    shots: true,
    kills: true,
    heatmap: false,
  });
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapImgRef = useRef<HTMLImageElement | null>(null);
  const lowerMapImgRef = useRef<HTMLImageElement | null>(null);
  const currentTickRef = useRef(0);
  const playingRef = useRef(false);
  const speedRef = useRef(1);
  const layersRef = useRef(layers);

  // Keep refs in sync
  useEffect(() => { currentTickRef.current = currentTick; }, [currentTick]);
  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { layersRef.current = layers; }, [layers]);

  // Keep canvas backing resolution synced with CSS size for crisp text/shapes.
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const syncCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    syncCanvasSize();
    const observer = new ResizeObserver(syncCanvasSize);
    observer.observe(container);
    window.addEventListener("resize", syncCanvasSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncCanvasSize);
    };
  }, []);

  const mapCfg = getMapConfig(mapName);
  const maxTick = totalTicks ?? (playerPositions.length > 0
    ? Math.max(...playerPositions.map((p) => p.tick))
    : 150000);

  // Build lookup maps for performance
  const positionsByTick = useRef<Map<number, PlayerPosition[]>>(new Map());
  const sortedTicks = useRef<number[]>([]);

  useEffect(() => {
    const map = new Map<number, PlayerPosition[]>();
    for (const p of playerPositions) {
      const t = p.tick;
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(p);
    }
    positionsByTick.current = map;
    sortedTicks.current = Array.from(map.keys()).sort((a, b) => a - b);
  }, [playerPositions]);

  // Player name lookup
  const playerNameMap = useRef<Map<string, { name: string; team: string }>>(new Map());
  useEffect(() => {
    const m = new Map<string, { name: string; team: string }>();
    for (const s of playerStats) {
      m.set(s.steamId, { name: s.playerName || s.steamId.slice(-4), team: s.team });
    }
    playerNameMap.current = m;
  }, [playerStats]);

  // Load map image
  useEffect(() => {
    setMapLoaded(false);
    const upper = new Image();
    const hasLowerRadarAsset = MAPS_WITH_LOWER_RADAR.has(mapName);
    const lower = hasLowerRadarAsset ? new Image() : null;
    let done = 0;
    const targetLoads = hasLowerRadarAsset ? 2 : 1;
    const finish = () => {
      done += 1;
      if (done >= targetLoads) setMapLoaded(true);
    };
    upper.onload = () => { mapImgRef.current = upper; finish(); };
    upper.onerror = () => { mapImgRef.current = null; finish(); };
    if (lower) {
      lower.onload = () => { lowerMapImgRef.current = lower; finish(); };
      lower.onerror = () => { lowerMapImgRef.current = null; finish(); };
    } else {
      lowerMapImgRef.current = null;
    }
    upper.src = `/maps/${mapName}.png`;
    if (lower) {
      lower.src = `/maps/${mapName}_lower.png`;
    }
  }, [mapName]);

  // Jump to round start tick
  const goToRound = useCallback((roundIdx: number) => {
    const round = rounds[roundIdx];
    if (!round) return;
    // Approximate tick from round number
    const approxTick = roundIdx * 6400;
    // Find nearest actual tick
    const ticks = sortedTicks.current;
    let nearest = approxTick;
    for (const t of ticks) {
      if (t >= approxTick) { nearest = t; break; }
    }
    setCurrentTick(nearest);
    setCurrentRound(roundIdx);
  }, [rounds]);

  // Get interpolated positions at a given tick
  const getPositionsAtTick = useCallback((tick: number): PlayerPosition[] => {
    const ticks = sortedTicks.current;
    const map = positionsByTick.current;
    if (ticks.length === 0) return [];

    // Find closest tick <= current
    let lo = 0, hi = ticks.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (ticks[mid] <= tick) lo = mid;
      else hi = mid - 1;
    }
    const t1 = ticks[lo];
    const p1 = map.get(t1) ?? [];
    const nextIdx = Math.min(lo + 1, ticks.length - 1);
    const t2 = ticks[nextIdx];
    if (t2 === t1) return p1;
    const p2 = map.get(t2) ?? [];
    if (p2.length === 0) return p1;

    const alpha = Math.max(0, Math.min(1, (tick - t1) / (t2 - t1)));
    if (alpha <= 0) return p1;
    if (alpha >= 1) return p2;

    const p2BySteamId = new Map<string, PlayerPosition>();
    for (const pos of p2) p2BySteamId.set(pos.steamId, pos);

    const lerpYaw = (from: number, to: number, t: number) => {
      let delta = to - from;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      return from + delta * t;
    };

    return p1.map((start) => {
      const end = p2BySteamId.get(start.steamId);
      if (!end) return start;
      return {
        ...start,
        x: start.x + (end.x - start.x) * alpha,
        y: start.y + (end.y - start.y) * alpha,
        z: (start.z ?? 0) + ((end.z ?? 0) - (start.z ?? 0)) * alpha,
        yaw: lerpYaw(start.yaw, end.yaw, alpha),
      };
    });
  }, []);

  // Main render loop
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const dpr = window.devicePixelRatio || 1;
    const cssW = W / dpr;
    const cssH = H / dpr;
    const tick = currentTickRef.current;
    const ls = layersRef.current;
    const cfg = mapCfg;
    const drawSize = Math.min(cssW, cssH);
    const drawOffsetX = (cssW - drawSize) / 2;
    const drawOffsetY = (cssH - drawSize) / 2;
    const mapScale = drawSize / cfg.imageSize;

    const positionsAtTick = getPositionsAtTick(tick);
    const hasLowerRadar = lowerMapImgRef.current !== null;
    const activeLowerLevel = resolveActiveLowerLevel({
      cfg,
      positionsAtTick,
      hasLowerRadar,
      radarLevel,
    });
    const thresholdZ = cfg.thresholdZ ?? 0;

    const isOnActiveLevel = (z: number) => {
      if (!hasLowerRadar) return true;
      const isLower = z < thresholdZ;
      return activeLowerLevel ? isLower : !isLower;
    };

    const projectToCanvas = (worldX: number, worldY: number) => {
      const radar = worldToRadar(worldX, worldY, cfg);
      return {
        x: drawOffsetX + radar.x * mapScale,
        y: drawOffsetY + radar.y * mapScale,
      };
    };

    // Clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, cssW, cssH);

    // Draw map image
    const activeMapImage = activeLowerLevel ? (lowerMapImgRef.current ?? mapImgRef.current) : mapImgRef.current;
    drawRadar({
      ctx,
      mapName,
      activeMapImage,
      cssW,
      cssH,
      drawOffsetX,
      drawOffsetY,
      drawSize,
    });

    // Darken overlay
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(drawOffsetX, drawOffsetY, drawSize, drawSize);

    // Draw heatmap (kill/death positions)
    if (ls.heatmap) {
      drawHeatmap({ ctx, kills, project: projectToCanvas, mapScale, isOnActiveLevel });
    }
    if (ls.grenades) {
      drawGrenades({
        ctx,
        tick,
        grenadeEvents,
        project: projectToCanvas,
        mapScale,
        isOnActiveLevel,
        effectScale: stylePreset === "cinematic" ? 1.15 : 1,
      });
    }
    if (ls.shots) {
      const SHOT_WINDOW = stylePreset === "cinematic" ? 18 : 12;
      const shotColorForWeapon = (weapon?: string) => {
        const w = (weapon ?? "").toLowerCase();
        if (w.includes("awp") || w.includes("ssg")) return "rgba(255,120,120,0.98)";
        if (w.includes("ak")) return "rgba(255,205,110,0.98)";
        if (w.includes("m4") || w.includes("famas") || w.includes("galil")) return "rgba(130,210,255,0.98)";
        if (w.includes("deagle")) return "rgba(255,170,110,0.98)";
        if (w.includes("usp") || w.includes("glock") || w.includes("p250") || w.includes("five")) return "rgba(210,220,255,0.98)";
        return "rgba(255,220,140,0.95)";
      };
      for (const dmg of damages) {
        const age = tick - dmg.tick;
        if (age < 0 || age > SHOT_WINDOW) continue;

        const attacker = getPositionsAtTick(dmg.tick).find((p) => p.steamId === dmg.attackerSteamId);
        const victim = getPositionsAtTick(dmg.tick).find((p) => p.steamId === dmg.victimSteamId);
        if (!attacker || !victim) continue;
        if (!isOnActiveLevel(attacker.z ?? 0) || !isOnActiveLevel(victim.z ?? 0)) continue;

        const from = projectToCanvas(attacker.x, attacker.y);
        const to = projectToCanvas(victim.x, victim.y);
        const progress = Math.min(1, Math.max(0.2, age / SHOT_WINDOW));
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const endX = from.x + dx * progress;
        const endY = from.y + dy * progress;
        const alpha = 1 - age / SHOT_WINDOW;
        const relatedKill = kills.find(
          (k) =>
            Math.abs(k.tick - dmg.tick) <= 32 &&
            k.attackerSteamId === dmg.attackerSteamId &&
            k.victimSteamId === dmg.victimSteamId
        );
        const shotColor = shotColorForWeapon(relatedKill?.weapon);

        ctx.save();
        ctx.globalAlpha = alpha;
        // muzzle flash
        ctx.beginPath();
        ctx.arc(from.x, from.y, (stylePreset === "cinematic" ? 4.6 : 3.5) * mapScale, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,245,180,0.9)";
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = shotColor;
        const baseWidth = dmg.hitgroup === "head" ? 1.8 : 1.2;
        ctx.lineWidth = baseWidth * mapScale * (stylePreset === "cinematic" ? 1.25 : 1);
        ctx.stroke();
        ctx.restore();
      }
    }
    if (ls.kills) {
      drawKills({ ctx, tick, kills, getPositionsAtTick, project: projectToCanvas, mapScale, isOnActiveLevel });
    }
    if (ls.players) {
      drawPlayers({
        ctx,
        positions: positionsAtTick,
        project: projectToCanvas,
        mapScale,
        getPlayerInfo: (steamId) => playerNameMap.current.get(steamId),
        isOnActiveLevel,
      });
    }

    // Tick counter HUD
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(8, 8, 180, 28);
    ctx.fillStyle = "#ff6b2b";
    ctx.font = "12px monospace";
    ctx.fillText(`TICK ${tick.toString().padStart(7, "0")}`, 14, 26);
    ctx.fillStyle = "#888";
    ctx.fillText(`${(tick / TICK_RATE).toFixed(1)}s`, 130, 26);

    // Round indicator
    if (rounds[currentRound]) {
      const r = rounds[currentRound];
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(cssW - 130, 8, 122, 28);
      ctx.fillStyle = "#aaa";
      ctx.font = "12px monospace";
      ctx.fillText(`ROUND ${r.roundNum}  ${r.tScore}:${r.ctScore}`, cssW - 124, 26);
    }
  }, [mapName, mapCfg, kills, grenadeEvents, damages, getPositionsAtTick, rounds, currentRound, radarLevel, stylePreset]);

  // Animation loop
  useEffect(() => {
    const loop = (realTime: number) => {
      if (playingRef.current) {
        const elapsed = lastRealTimeRef.current ? realTime - lastRealTimeRef.current : 0;
        lastRealTimeRef.current = realTime;
        const tickDelta = Math.round((elapsed / 1000) * TICK_RATE * speedRef.current);
        const next = Math.min(currentTickRef.current + tickDelta, maxTick);
        if (next !== currentTickRef.current) {
          currentTickRef.current = next;
          setCurrentTick(next);
          // Update current round
          const ticksPerRound = maxTick / Math.max(rounds.length, 1);
          const rIdx = Math.min(Math.floor(next / ticksPerRound), rounds.length - 1);
          setCurrentRound(rIdx);
          if (next >= maxTick) setPlaying(false);
        }
      } else {
        lastRealTimeRef.current = 0;
      }
      renderFrame();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [renderFrame, maxTick, rounds.length]);

  const togglePlay = () => {
    if (currentTick >= maxTick) setCurrentTick(0);
    setPlaying((p) => !p);
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTick(Number(e.target.value));
    setPlaying(false);
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Canvas */}
      <div ref={containerRef} className="relative flex-1 rounded-lg overflow-hidden border border-slate-700 bg-[#0a0a0f]">
        <canvas
          ref={canvasRef}
          width={512}
          height={512}
          className="w-full h-full"
          style={{ imageRendering: "auto" }}
        />
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-slate-400 font-mono text-sm">Loading map…</span>
          </div>
        )}
      </div>

      {/* Playback controls */}
      <div className="flex flex-col gap-2 bg-[#12121a] border border-slate-700 rounded-lg p-3">
        {/* Scrubber */}
        <input
          type="range"
          min={0}
          max={maxTick}
          value={currentTick}
          onChange={handleScrub}
          className="w-full accent-orange-500 h-1 cursor-pointer"
        />

        <div className="flex items-center gap-3 flex-wrap">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-4 py-1.5 rounded text-sm font-mono min-w-[72px]"
          >
            {playing ? "⏸ PAUSE" : "▶ PLAY"}
          </button>

          {/* Speed */}
          <div className="flex items-center gap-1">
            {[0.5, 1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 text-xs font-mono rounded border ${
                  speed === s
                    ? "bg-orange-500 border-orange-500 text-black"
                    : "border-slate-600 text-slate-400 hover:border-slate-400"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Radar level */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 text-xs font-mono">RADAR</span>
            {(["auto", "upper", "lower"] as const).map((level) => (
              <button
                key={level}
                onClick={() => setRadarLevel(level)}
                className={`px-2 py-1 text-xs font-mono rounded border ${
                  radarLevel === level
                    ? "bg-orange-500 border-orange-500 text-black"
                    : "border-slate-600 text-slate-400 hover:border-slate-400"
                }`}
              >
                {level.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Style preset */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 text-xs font-mono">STYLE</span>
            {(["classic", "cinematic"] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => setStylePreset(preset)}
                className={`px-2 py-1 text-xs font-mono rounded border ${
                  stylePreset === preset
                    ? "bg-orange-500 border-orange-500 text-black"
                    : "border-slate-600 text-slate-400 hover:border-slate-400"
                }`}
              >
                {preset.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Round selector */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-slate-500 text-xs font-mono">RND</span>
            <div className="flex gap-0.5 flex-wrap max-w-xs">
              {rounds.map((r, i) => (
                <button
                  key={i}
                  onClick={() => goToRound(i)}
                  title={`R${r.roundNum}: ${r.winner} (${r.tScore}:${r.ctScore})`}
                  className={`w-4 h-4 text-[9px] font-mono rounded-sm transition-colors ${
                    currentRound === i
                      ? "bg-orange-500 text-black"
                      : r.winner === "T"
                      ? "bg-orange-900/60 text-orange-400 hover:bg-orange-700/60"
                      : "bg-blue-900/60 text-blue-400 hover:bg-blue-700/60"
                  }`}
                >
                  {r.roundNum}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Layer toggles */}
        <div className="flex gap-2 flex-wrap pt-1 border-t border-slate-700/50">
          {(Object.keys(layers) as Array<keyof typeof layers>).map((layer) => (
            <label key={layer} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={layers[layer]}
                onChange={(e) =>
                  setLayers((prev) => ({ ...prev, [layer]: e.target.checked }))
                }
                className="accent-orange-500 w-3 h-3"
              />
              <span className="text-xs font-mono text-slate-400 uppercase">
                {layer}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
