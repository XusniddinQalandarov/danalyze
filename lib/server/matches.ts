import { prisma } from "@/lib/prisma";
import type { MatchListItemDTO, MatchViewerDTO } from "@/lib/contracts/match";

interface MatchFilters {
  steamId?: string;
  mapName?: string;
  result?: string;
  from?: string;
  to?: string;
}

export async function getMatchViewerById(id: string): Promise<MatchViewerDTO | null> {
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      rounds: { orderBy: { roundNum: "asc" } },
      kills: { orderBy: { tick: "asc" } },
      playerPositions: { orderBy: { tick: "asc" } },
      grenadeEvents: { orderBy: { tick: "asc" } },
      damages: { orderBy: { tick: "asc" } },
      playerStats: true,
    },
  });

  if (!match) return null;

  return {
    id: match.id,
    mapName: match.mapName,
    scoreT: match.scoreT,
    scoreCt: match.scoreCt,
    status: match.status,
    date: match.date.toISOString(),
    rounds: match.rounds,
    kills: match.kills,
    playerPositions: match.playerPositions.map((p) => ({
      ...p,
      z: (p as { z?: number }).z ?? 0,
    })),
    grenadeEvents: match.grenadeEvents.map((g) => ({
      id: g.id,
      tick: g.tick,
      type: g.type,
      steamId: g.steamId,
      trajectory: (() => {
        try {
          return JSON.parse(g.trajectoryJson || "[]") as Array<{ x: number; y: number; z: number }>;
        } catch {
          return [];
        }
      })(),
    })),
    damages: match.damages,
    playerStats: match.playerStats,
  };
}

export async function listMatches(filters: MatchFilters, take = 50): Promise<MatchListItemDTO[]> {
  const where: Record<string, unknown> = { status: "done" };
  if (filters.steamId) where.steamId = filters.steamId;
  if (filters.mapName) where.mapName = filters.mapName;
  if (filters.from || filters.to) {
    where.date = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
  }

  const matches = await prisma.match.findMany({
    where,
    include: { playerStats: true, rounds: true },
    orderBy: { date: "desc" },
    take,
  });

  const resultFiltered =
    filters.result && filters.steamId
      ? matches.filter((m) => {
          const lastRound = m.rounds[m.rounds.length - 1];
          if (!lastRound) return true;
          const playerStat = m.playerStats.find((s) => s.steamId === filters.steamId);
          const isT = playerStat?.team === "T";
          const won = isT ? lastRound.tScore > lastRound.ctScore : lastRound.ctScore > lastRound.tScore;
          return filters.result === "win" ? won : !won;
        })
      : filters.result
      ? matches.filter((m) => {
          const lastRound = m.rounds[m.rounds.length - 1];
          if (!lastRound) return true;
          const won = lastRound.tScore > lastRound.ctScore;
          return filters.result === "win" ? won : !won;
        })
      : matches;

  return resultFiltered.map((m) => ({
    id: m.id,
    mapName: m.mapName,
    scoreT: m.scoreT,
    scoreCt: m.scoreCt,
    status: m.status,
    date: m.date.toISOString(),
    playerStats: m.playerStats.map((s) => ({
      steamId: s.steamId,
      playerName: s.playerName,
      team: s.team,
      kills: s.kills,
      deaths: s.deaths,
      assists: s.assists,
      rating: s.rating,
    })),
  }));
}
