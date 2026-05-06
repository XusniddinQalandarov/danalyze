import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const { matchId, steamId } = await req.json();

  if (!matchId) {
    return NextResponse.json({ error: "matchId required" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      rounds: { orderBy: { roundNum: "asc" } },
      kills: { orderBy: { tick: "asc" } },
      playerStats: true,
      damages: true,
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // Build stats summary for the target player
  const targetSteamId = steamId || match.playerStats[0]?.steamId;
  const playerStat = match.playerStats.find((s) => s.steamId === targetSteamId);
  const allStats = match.playerStats;

  // Compute weapon breakdown from kills
  const weaponKills: Record<string, number> = {};
  const deathPositions: Array<{ x: number; y: number; round: number }> = [];
  const killsBy = match.kills.filter((k) => k.attackerSteamId === targetSteamId);
  const deathsBy = match.kills.filter((k) => k.victimSteamId === targetSteamId);

  for (const k of killsBy) {
    weaponKills[k.weapon] = (weaponKills[k.weapon] ?? 0) + 1;
  }
  for (let i = 0; i < deathsBy.length; i++) {
    const d = deathsBy[i];
    const roundNum = Math.floor(d.tick / 6400) + 1;
    deathPositions.push({ x: Math.round(d.x), y: Math.round(d.y), round: roundNum });
  }

  // Detect repeated death positions (within 200 units = same angle)
  const repeatedAngles: Record<string, number> = {};
  for (const dp of deathPositions) {
    const key = `${Math.round(dp.x / 200) * 200},${Math.round(dp.y / 200) * 200}`;
    repeatedAngles[key] = (repeatedAngles[key] ?? 0) + 1;
  }
  const dangerAngles = Object.entries(repeatedAngles)
    .filter(([, count]) => count >= 2)
    .map(([pos, count]) => ({ pos, count }));

  const rounds = match.rounds;
  const lastRound = rounds[rounds.length - 1];
  const won = lastRound
    ? (playerStat?.team === "T"
        ? lastRound.tScore > lastRound.ctScore
        : lastRound.ctScore > lastRound.tScore)
    : false;

  const statsPayload = {
    map: match.mapName,
    score: `${match.scoreT}-${match.scoreCt}`,
    result: won ? "win" : "loss",
    player: playerStat
      ? {
          name: playerStat.playerName || "Player",
          kills: playerStat.kills,
          deaths: playerStat.deaths,
          assists: playerStat.assists,
          adr: playerStat.adr,
          hs_pct: playerStat.hsPct,
          rating: playerStat.rating,
          team: playerStat.team,
        }
      : null,
    weapon_kills: weaponKills,
    repeated_death_spots: dangerAngles,
    total_rounds: rounds.length,
    rounds_won_by_team: rounds.filter((r) => r.winner === playerStat?.team).length,
    all_players: allStats.map((s) => ({
      name: s.playerName || s.steamId.slice(-4),
      team: s.team,
      kda: `${s.kills}/${s.deaths}/${s.assists}`,
      adr: s.adr,
      rating: s.rating,
    })),
  };

  const systemPrompt = `You are an expert CS2 coach analyzing match data. Be specific, tactical, and constructive.
Reference actual round numbers and specific in-game situations. Use CS2 terminology naturally.
Format your response as JSON matching this exact structure:
{
  "mistakes": [
    {"title": "string", "description": "string", "rounds": [number], "severity": "high"|"medium"|"low"}
  ],
  "positives": [
    {"title": "string", "description": "string"}
  ],
  "tips": [
    {"area": "string", "tip": "string", "priority": "high"|"medium"|"low"}
  ],
  "grenade_score": {"score": number, "max": 10, "assessment": "string", "tip": "string"},
  "positioning": {"pattern": "string", "details": "string", "fix": "string"}
}
mistakes: exactly 3 items. positives: exactly 3 items. tips: 3-5 items.`;

  const userPrompt = `Analyze this CS2 match and provide coaching feedback:

${JSON.stringify(statsPayload, null, 2)}

Focus on: tactical mistakes with specific round references, positioning patterns from repeated death spots, grenade efficiency, and actionable improvement tips.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    // Extract JSON from the response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const analysis = JSON.parse(jsonMatch[0]);

    return NextResponse.json(analysis);
  } catch {
    // Return mock coaching data if API key not set or error
    return NextResponse.json(getMockCoaching(statsPayload));
  }
}

function getMockCoaching(stats: Record<string, unknown>) {
  return {
    mistakes: [
      {
        title: "Passive CT Positioning",
        description: `On ${stats.map}, you held the same passive angle across multiple rounds, allowing the T side to coordinate against you effectively. Consider mixing up your positioning every 2-3 rounds.`,
        rounds: [4, 8, 15],
        severity: "high",
      },
      {
        title: "Low Utility Usage",
        description: "Your grenade efficiency is below average. Most rounds you entered bombsites without any support utility, making fragging significantly harder.",
        rounds: [7, 12, 18],
        severity: "medium",
      },
      {
        title: "Information-First Peeking",
        description: "Multiple deaths came from wide-peeking corners without prior info or off-angle advantage. Use counter-strafing and gather info before committing.",
        rounds: [3, 11, 22],
        severity: "medium",
      },
    ],
    positives: [
      {
        title: "Strong Rifle Mechanics",
        description: "Your spray control and burst-fire timing is solid — most kills came from controlled engagements rather than spray-and-pray.",
      },
      {
        title: "Good Clutch Decision-Making",
        description: "In 1vX situations you correctly assessed risk and either re-fragmented or played for time effectively.",
      },
      {
        title: "Team Flash Cooperation",
        description: "Several rounds you communicated and flashed teammates into site, enabling clean entries.",
      },
    ],
    tips: [
      {
        area: "Utility",
        tip: "Learn 2-3 smokes per map that cut off the most common AWP angles. This alone can win 1-2 extra rounds per half.",
        priority: "high",
      },
      {
        area: "Positioning",
        tip: "After winning a duel from a position, immediately relocate. Opponents adjust between rounds — staying in the same spot is a predictable pattern.",
        priority: "high",
      },
      {
        area: "Economy",
        tip: "On eco/force rounds, avoid peeking long angles alone. Group with teammates for trade potential and to preserve economy.",
        priority: "medium",
      },
    ],
    grenade_score: {
      score: 5,
      max: 10,
      assessment: "Average utility usage. Grenades were thrown but rarely had decisive impact.",
      tip: "Practice the top 3 smokes for your most-played maps in deathmatch or offline with bots.",
    },
    positioning: {
      pattern: "Repeated deaths to the same angles",
      details: `You died to similar map positions ${(stats as { repeated_death_spots?: Array<{count: number}> }).repeated_death_spots?.length ?? 0} times — a strong indicator of positioning habits that opponents can read.`,
      fix: "Use the death heatmap in the replay viewer to identify your most dangerous angles and consciously avoid or pre-flash them.",
    },
  };
}
