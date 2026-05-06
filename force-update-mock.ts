import { prisma } from "./lib/prisma";
import {
  generateMockRounds,
  generateMockKills,
  generateMockPositions,
  generateMockGrenades,
  generateMockPlayerStats,
  MOCK_PLAYERS,
} from "./lib/mockData";

async function main() {
  const matches = await prisma.match.findMany();
  for (const match of matches) {
    console.log(`Updating match ${match.id}...`);

    // Delete existing records
    await prisma.round.deleteMany({ where: { matchId: match.id } });
    await prisma.kill.deleteMany({ where: { matchId: match.id } });
    await prisma.playerPosition.deleteMany({ where: { matchId: match.id } });
    await prisma.grenadeEvent.deleteMany({ where: { matchId: match.id } });
    await prisma.playerMatchStat.deleteMany({ where: { matchId: match.id } });

    // Generate new mock data
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
    
    // Fix match score
    const lastRound = rounds[rounds.length - 1];
    await prisma.match.update({
      where: { id: match.id },
      data: {
        scoreT: lastRound.tScore,
        scoreCt: lastRound.ctScore,
      }
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
