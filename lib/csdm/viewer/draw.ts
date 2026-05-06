import type { MapConfig } from "@/lib/mapConfig";

type ProjectFn = (worldX: number, worldY: number) => { x: number; y: number };

interface Kill {
  tick: number;
  attackerSteamId: string;
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

interface GrenadePoint {
  x: number;
  y: number;
  z: number;
}

interface GrenadeEvent {
  tick: number;
  type: string;
  trajectory: GrenadePoint[];
}

const GRENADE_COLORS: Record<string, string> = {
  smoke: "#888eaa",
  flash: "#ffffa0",
  molotov: "#ff6b2b",
  he: "#66ff66",
};

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function interpolatePath(path: { x: number; y: number }[], t: number) {
  if (path.length === 1) return path[0];
  if (t <= 0) return path[0];
  if (t >= 1) return path[path.length - 1];
  const segments = path.length - 1;
  const rawIdx = t * segments;
  const idx = Math.floor(rawIdx);
  const frac = rawIdx - idx;
  if (idx >= segments) return path[path.length - 1];
  const p1 = path[idx];
  const p2 = path[idx + 1];
  return { x: p1.x + (p2.x - p1.x) * frac, y: p1.y + (p2.y - p1.y) * frac };
}

export function drawRadar({
  ctx,
  mapName,
  activeMapImage,
  cssW,
  cssH,
  drawOffsetX,
  drawOffsetY,
  drawSize,
}: {
  ctx: CanvasRenderingContext2D;
  mapName: string;
  activeMapImage: HTMLImageElement | null;
  cssW: number;
  cssH: number;
  drawOffsetX: number;
  drawOffsetY: number;
  drawSize: number;
}) {
  if (activeMapImage) {
    ctx.drawImage(activeMapImage, drawOffsetX, drawOffsetY, drawSize, drawSize);
    return;
  }

  ctx.strokeStyle = "#1a1a2e";
  ctx.lineWidth = 1;
  for (let x = drawOffsetX; x < drawOffsetX + drawSize; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, drawOffsetY);
    ctx.lineTo(x, drawOffsetY + drawSize);
    ctx.stroke();
  }
  for (let y = drawOffsetY; y < drawOffsetY + drawSize; y += 32) {
    ctx.beginPath();
    ctx.moveTo(drawOffsetX, y);
    ctx.lineTo(drawOffsetX + drawSize, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#1a1a2e44";
  ctx.fillRect(drawOffsetX, drawOffsetY, drawSize, drawSize);
  ctx.fillStyle = "#444";
  ctx.font = "14px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${mapName} — map image not found`, cssW / 2, cssH / 2);
  ctx.fillText(`Place ${mapName}.png in /public/maps/`, cssW / 2, cssH / 2 + 20);
  ctx.textAlign = "left";
}

export function drawGrenades({
  ctx,
  tick,
  grenadeEvents,
  project,
  mapScale,
  isOnActiveLevel,
  effectScale = 1,
}: {
  ctx: CanvasRenderingContext2D;
  tick: number;
  grenadeEvents: GrenadeEvent[];
  project: ProjectFn;
  mapScale: number;
  isOnActiveLevel: (z: number) => boolean;
  effectScale?: number;
}) {
  const GRENADE_WINDOW = 128 * 3;
  const FLY_WINDOW = 64;

  for (const g of grenadeEvents) {
    const age = tick - g.tick;
    if (age < -FLY_WINDOW || age > GRENADE_WINDOW) continue;
    const traj = g.trajectory;
    if (!traj || traj.length < 2) continue;
    const detonationZ = traj[traj.length - 1]?.z ?? 0;
    if (!isOnActiveLevel(detonationZ)) continue;
    const color = GRENADE_COLORS[g.type] ?? "#ffffff";
    const alpha = age >= 0 ? Math.max(0, 1 - age / GRENADE_WINDOW) : 1;

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < traj.length; i++) {
      const projected = project(traj[i].x, traj[i].y);
      if (i === 0) ctx.moveTo(projected.x, projected.y);
      else ctx.lineTo(projected.x, projected.y);
    }
    ctx.stroke();

    if (age < 0) {
      const progress = 1 - Math.abs(age) / FLY_WINDOW;
      const currentPos = interpolatePath(traj, progress);
      const { x, y } = project(currentPos.x, currentPos.y);
      ctx.beginPath();
      ctx.arc(x, y, 3 * mapScale, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.stroke();
    } else {
      const end = traj[traj.length - 1];
      const { x, y } = project(end.x, end.y);
      const rgb = hexToRgb(color);
      const phase = age / 8;

      if (g.type === "smoke") {
        const radius = 24 * mapScale * effectScale;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.28 * alpha})`;
        ctx.fill();
        // subtle animated ring
        ctx.beginPath();
        ctx.arc(x, y, (18 + Math.sin(phase) * 2) * mapScale * effectScale, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(210,220,240,${0.55 * alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (g.type === "molotov") {
        const radius = (14 + Math.sin(phase * 2) * 1.8) * mapScale * effectScale;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.30 * alpha})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, (9 + Math.cos(phase * 2.4) * 1.2) * mapScale * effectScale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,170,70,${0.25 * alpha})`;
        ctx.fill();
      } else if (g.type === "flash") {
        // Flashbang quick pop
        const pop = Math.max(0, 1 - age / 16);
        const radius = (6 + (1 - pop) * 22) * mapScale * effectScale;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,220,${0.55 * pop})`;
        ctx.fill();
      } else {
        // HE
        const shock = Math.max(0, 1 - age / 20);
        const radius = (6 + (1 - shock) * 16) * mapScale * effectScale;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.35 * shock})`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, 6 * mapScale, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

export function drawKills({
  ctx,
  tick,
  kills,
  getPositionsAtTick,
  project,
  mapScale,
  isOnActiveLevel,
}: {
  ctx: CanvasRenderingContext2D;
  tick: number;
  kills: Kill[];
  getPositionsAtTick: (tick: number) => PlayerPosition[];
  project: ProjectFn;
  mapScale: number;
  isOnActiveLevel: (z: number) => boolean;
}) {
  const KILL_WINDOW = 128 * 2;
  for (const k of kills) {
    const age = tick - k.tick;
    if (age < 0 || age > KILL_WINDOW) continue;
    if (!isOnActiveLevel(k.z ?? 0)) continue;

    const { x: px, y: py } = project(k.x, k.y);
    const alpha = 1 - age / KILL_WINDOW;
    ctx.globalAlpha = alpha;

    const attackerId = k.attackerSteamId;
    if (attackerId) {
      const attackerPos = getPositionsAtTick(k.tick).find((p) => p.steamId === attackerId);
      if (attackerPos && isOnActiveLevel(attackerPos.z ?? 0)) {
        const { x: ax, y: ay } = project(attackerPos.x, attackerPos.y);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(px, py);
        const tracerGrad = ctx.createLinearGradient(ax, ay, px, py);
        tracerGrad.addColorStop(0, "rgba(255, 200, 50, 0)");
        tracerGrad.addColorStop(1, `rgba(255, 200, 50, ${alpha})`);
        ctx.strokeStyle = tracerGrad;
        ctx.lineWidth = 1.5 * mapScale;
        ctx.stroke();
      }
    }

    const burstR = (age / KILL_WINDOW) * 20 * mapScale;
    const grad = ctx.createRadialGradient(px, py, 0, px, py, burstR);
    grad.addColorStop(0, "rgba(255,255,100,0.6)");
    grad.addColorStop(1, "rgba(255,100,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, burstR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff4444";
    ctx.font = `${Math.max(11, 12 * mapScale)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(k.headshot ? "☠" : "✕", px, py);
    ctx.globalAlpha = 1;
  }
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
}

export function drawPlayers({
  ctx,
  positions,
  project,
  mapScale,
  getPlayerInfo,
  isOnActiveLevel,
}: {
  ctx: CanvasRenderingContext2D;
  positions: PlayerPosition[];
  project: ProjectFn;
  mapScale: number;
  getPlayerInfo: (steamId: string) => { name: string; team: string } | undefined;
  isOnActiveLevel: (z: number) => boolean;
}) {
  for (const pos of positions) {
    if (!isOnActiveLevel(pos.z ?? 0)) continue;
    const sid = pos.steamId;
    const playerInfo = getPlayerInfo(sid);
    const isT = playerInfo?.team === "T";
    const name = playerInfo?.name ?? sid.slice(-4);
    const { x: px, y: py } = project(pos.x, pos.y);
    const playerRadius = 8 * mapScale;

    ctx.save();
    ctx.translate(px, py);
    ctx.beginPath();
    ctx.arc(0, 0, playerRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2 * mapScale;
    ctx.fillStyle = isT ? "#f0c941" : "#5ab8f4";
    ctx.fill();
    ctx.stroke();

    const playerAngle = -(pos.yaw * Math.PI) / 180;
    ctx.beginPath();
    ctx.lineWidth = 2 * mapScale;
    const lineLength = 10 * mapScale;
    ctx.moveTo(0, 0);
    ctx.lineTo(lineLength * Math.cos(playerAngle), lineLength * Math.sin(playerAngle));
    ctx.strokeStyle = "white";
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#ffffff";
    ctx.font = `${Math.max(12, 10 * mapScale)}px Inter, sans-serif`;
    ctx.textAlign = "center";
    const playerNameOffset = 20 * mapScale;
    ctx.fillText(name, px, py + playerNameOffset);
    ctx.textAlign = "left";
  }
}

export function drawHeatmap({
  ctx,
  kills,
  project,
  mapScale,
  isOnActiveLevel,
}: {
  ctx: CanvasRenderingContext2D;
  kills: Kill[];
  project: ProjectFn;
  mapScale: number;
  isOnActiveLevel: (z: number) => boolean;
}) {
  for (const k of kills) {
    if (!isOnActiveLevel(k.z ?? 0)) continue;
    const { x: px, y: py } = project(k.x, k.y);
    const grad = ctx.createRadialGradient(px, py, 0, px, py, 20 * mapScale);
    grad.addColorStop(0, "rgba(255,60,60,0.4)");
    grad.addColorStop(1, "rgba(255,60,60,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, 20 * mapScale, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function resolveActiveLowerLevel({
  cfg,
  positionsAtTick,
  hasLowerRadar,
  radarLevel,
}: {
  cfg: MapConfig;
  positionsAtTick: PlayerPosition[];
  hasLowerRadar: boolean;
  radarLevel: "auto" | "upper" | "lower";
}) {
  const thresholdZ = cfg.thresholdZ ?? 0;
  const lowerPlayers = positionsAtTick.filter((p) => (p.z ?? 0) < thresholdZ).length;
  const autoLowerLevel = hasLowerRadar && positionsAtTick.length > 0 && lowerPlayers >= positionsAtTick.length / 2;
  return radarLevel === "auto" ? autoLowerLevel : radarLevel === "lower" && hasLowerRadar;
}
