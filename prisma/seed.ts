/**
 * Seed script: inserts a full mock match into the database.
 * Run: npx ts-node --project tsconfig.json prisma/seed.ts
 * Or:  npm run seed
 */

import { prisma } from "../lib/prisma";
import {
  generateMockRounds,
  generateMockKills,
  generateMockPositions,
  generateMockGrenades,
  generateMockPlayerStats,
  MOCK_PLAYERS,
} from "../lib/mockData";

async function main() {
  console.log("🌱 Seeding mock match data…");

  // Clean up old mock data
  await prisma.match.deleteMany({ where: { id: { startsWith: "mock-" } } });

  const match = await prisma.match.create({
    data: {
      id: "mock-dust2-001",
      mapName: "de_dust2",
      status: "done",
      scoreT: 13,
      scoreCt: 11,
      parsedAt: new Date(),
    },
  });

  const rounds = generateMockRounds();
  await prisma.round.createMany({
    data: rounds.map((r) => ({
      matchId: match.id,
      roundNum: r.roundNum,
      winner: r.winner,
      reason: r.reason,
      tScore: r.tScore,
      ctScore: r.ctScore,
    })),
  });

  const kills = generateMockKills();
  const CHUNK = 500;
  for (let i = 0; i < kills.length; i += CHUNK) {
    await prisma.kill.createMany({
      data: kills.slice(i, i + CHUNK).map((k) => ({
        matchId: match.id,
        tick: k.tick,
        attackerSteamId: k.attacker_steamid,
        victimSteamId: k.victim_steamid,
        weapon: k.weapon,
        headshot: k.headshot,
        x: k.x,
        y: k.y,
        z: k.z,
      })),
    });
  }

  const positions = generateMockPositions();
  for (let i = 0; i < positions.length; i += CHUNK) {
    await prisma.playerPosition.createMany({
      data: positions.slice(i, i + CHUNK).map((p) => ({
        matchId: match.id,
        tick: p.tick,
        steamId: p.steamid,
        x: p.x,
        y: p.y,
        z: p.z ?? 0,
        yaw: p.yaw,
      })),
    });
  }

  const grenades = generateMockGrenades();
  if (grenades.length) {
    await prisma.grenadeEvent.createMany({
      data: grenades.map((g) => ({
        matchId: match.id,
        tick: g.tick,
        type: g.type,
        steamId: g.steamid,
        trajectoryJson: JSON.stringify(g.trajectory),
      })),
    });
  }

  const stats = generateMockPlayerStats();
  for (const [steamId, s] of Object.entries(stats)) {
    const player = MOCK_PLAYERS.find((p) => p.steamId === steamId);
    await prisma.playerMatchStat.create({
      data: {
        id: `${match.id}-${steamId}`,
        matchId: match.id,
        steamId,
        playerName: player?.name ?? steamId.slice(-4),
        team: player?.team ?? "T",
        kills: s.kills,
        deaths: s.deaths,
        assists: s.assists,
        adr: s.adr,
        hsPct: s.headshot_pct,
        flashAssists: s.flash_assists,
        utilDamage: s.util_damage,
        rating: s.rating,
      },
    });
  }

  console.log(`✅ Seeded match: ${match.id}`);
  console.log(`   Rounds: ${rounds.length}`);
  console.log(`   Kills: ${kills.length}`);
  console.log(`   Positions: ${positions.length}`);
  console.log(`   Grenades: ${grenades.length}`);
  console.log(`   Players: ${Object.keys(stats).length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
