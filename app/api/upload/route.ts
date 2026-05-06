import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("demo") as File | null;
  const steamId = formData.get("steamId") as string | null;
  const mockMode = formData.get("mock") === "true";

  if (mockMode) {
    return handleMockUpload(steamId);
  }

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.name.endsWith(".dem")) {
    return NextResponse.json({ error: "File must be a .dem file" }, { status: 400 });
  }

  // Save to disk
  const uploadsDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const fileName = `${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, "_")}`;
  const filePath = path.join(uploadsDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  // Create match record
  const match = await prisma.match.create({
    data: {
      steamId: steamId || null,
      mapName: "unknown",
      status: "uploading",
      filePath,
    },
  });

  // Kick off background parsing (non-blocking)
  parseInBackground(match.id, filePath).catch(console.error);

  return NextResponse.json({ matchId: match.id, status: "uploading" });
}

async function handleMockUpload(steamId: string | null) {
  const { generateMockMatch } = await import("@/lib/mockData");
  const mock = generateMockMatch();

  const match = await prisma.match.create({
    data: {
      steamId: steamId || null,
      mapName: mock.mapName,
      status: "analyzing",
      scoreT: mock.scoreT,
      scoreCt: mock.scoreCt,
    },
  });

  await storeParsedData(match.id, {
    rounds: mock.rounds,
    kills: mock.kills,
    player_positions: mock.playerPositions,
    grenades: mock.grenades,
    player_stats: mock.playerStats,
    players: mock.players,
  });

  await prisma.match.update({
    where: { id: match.id },
    data: { status: "done", mapName: "de_dust2", scoreT: 13, scoreCt: 11, parsedAt: new Date() },
  });

  return NextResponse.json({ matchId: match.id, status: "done" });
}

async function parseInBackground(matchId: string, filePath: string) {
  const parserUrl = process.env.PARSER_SERVICE_URL ?? "http://localhost:8000";

  try {
    await prisma.match.update({ where: { id: matchId }, data: { status: "parsing" } });

    const { readFile } = await import("fs/promises");
    const fileBuffer = await readFile(filePath);
    const formData = new FormData();
    formData.append("file", new Blob([fileBuffer], { type: "application/octet-stream" }), "demo.dem");

    const res = await fetch(`${parserUrl}/parse`, { method: "POST", body: formData });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Parser returned ${res.status}: ${err}`);
    }

    const data = await res.json();

    await prisma.match.update({ where: { id: matchId }, data: { status: "analyzing" } });
    await storeParsedData(matchId, data);

    // Detect map name from file path (best effort)
    const mapName = detectMapFromFilePath(filePath);
    const lastRound = data.rounds?.[data.rounds.length - 1];

    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: "done",
        mapName,
        scoreT: lastRound?.t_score ?? 0,
        scoreCt: lastRound?.ct_score ?? 0,
        parsedAt: new Date(),
      },
    });
  } catch (err) {
    await prisma.match.update({
      where: { id: matchId },
      data: { status: "error", errorMsg: String(err) },
    });
  }
}

function detectMapFromFilePath(filePath: string): string {
  const maps = ["de_dust2", "de_mirage", "de_inferno", "de_nuke", "de_ancient", "de_anubis"];
  for (const m of maps) {
    if (filePath.toLowerCase().includes(m)) return m;
  }
  return "de_dust2";
}

async function storeParsedData(matchId: string, data: Record<string, unknown>) {
  const rounds = (data.rounds as Array<Record<string, unknown>>) ?? [];
  const kills = (data.kills as Array<Record<string, unknown>>) ?? [];
  const positions = (data.player_positions as Array<Record<string, unknown>>) ?? [];
  const grenades = (data.grenades as Array<Record<string, unknown>>) ?? [];
  const damages = (data.damages as Array<Record<string, unknown>>) ?? [];
  const playerStats = (data.player_stats as Record<string, Record<string, unknown>>) ?? {};

  // Batch insert rounds
  if (rounds.length) {
    await prisma.round.createMany({
      data: rounds.map((r) => ({
        matchId,
        roundNum: Number(r.round_num ?? r.roundNum ?? 0),
        winner: String(r.winner ?? "CT"),
        reason: String(r.reason ?? ""),
        tScore: Number(r.t_score ?? r.tScore ?? 0),
        ctScore: Number(r.ct_score ?? r.ctScore ?? 0),
      })),
    });
  }

  // Batch insert kills (chunked to avoid SQLite limits)
  const CHUNK = 500;
  for (let i = 0; i < kills.length; i += CHUNK) {
    await prisma.kill.createMany({
      data: kills.slice(i, i + CHUNK).map((k) => ({
        matchId,
        tick: Number(k.tick ?? 0),
        attackerSteamId: String(k.attacker_steamid ?? k.attackerSteamId ?? ""),
        victimSteamId: String(k.victim_steamid ?? k.victimSteamId ?? ""),
        weapon: String(k.weapon ?? "unknown"),
        headshot: Boolean(k.headshot ?? false),
        x: Number(k.x ?? 0),
        y: Number(k.y ?? 0),
        z: Number(k.z ?? 0),
      })),
    });
  }

  // Batch insert positions (chunked)
  for (let i = 0; i < positions.length; i += CHUNK) {
    await prisma.playerPosition.createMany({
      data: positions.slice(i, i + CHUNK).map((p) => ({
        matchId,
        tick: Number(p.tick ?? 0),
        steamId: String(p.steamid ?? p.steamId ?? ""),
        x: Number(p.x ?? 0),
        y: Number(p.y ?? 0),
        z: Number(p.z ?? 0),
        yaw: Number(p.yaw ?? 0),
      })),
    });
  }

  // Batch insert grenades
  if (grenades.length) {
    await prisma.grenadeEvent.createMany({
      data: grenades.map((g) => ({
        matchId,
        tick: Number(g.tick ?? 0),
        type: String(g.type ?? "smoke"),
        steamId: String(g.steamid ?? g.steamId ?? ""),
        trajectoryJson: JSON.stringify(g.trajectory ?? []),
      })),
    });
  }

  // Batch insert damages
  for (let i = 0; i < damages.length; i += CHUNK) {
    await prisma.damage.createMany({
      data: damages.slice(i, i + CHUNK).map((d) => ({
        matchId,
        tick: Number(d.tick ?? 0),
        attackerSteamId: String(d.attacker_steamid ?? d.attackerSteamId ?? ""),
        victimSteamId: String(d.victim_steamid ?? d.victimSteamId ?? ""),
        damage: Number(d.damage ?? 0),
        hitgroup: String(d.hitgroup ?? "body"),
      })),
    });
  }

  // Insert per-player stats
  for (const [steamId, s] of Object.entries(playerStats)) {
    const stat = s as Record<string, unknown>;
    await prisma.playerMatchStat.upsert({
      where: { id: `${matchId}-${steamId}` },
      update: {},
      create: {
        id: `${matchId}-${steamId}`,
        matchId,
        steamId,
        kills: Number(stat.kills ?? 0),
        deaths: Number(stat.deaths ?? 0),
        assists: Number(stat.assists ?? 0),
        adr: Number(stat.adr ?? 0),
        hsPct: Number(stat.headshot_pct ?? stat.hsPct ?? 0),
        flashAssists: Number(stat.flash_assists ?? stat.flashAssists ?? 0),
        rating: Number(stat.rating ?? 0),
      },
    });
  }

  // Store player names if provided
  const players = (data.players as Array<{ steamId: string; name: string; team: string }>) ?? [];
  for (const p of players) {
    await prisma.playerMatchStat.updateMany({
      where: { matchId, steamId: p.steamId },
      data: { playerName: p.name, team: p.team },
    });
  }
}
