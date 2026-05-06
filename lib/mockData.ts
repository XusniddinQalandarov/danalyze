/**
 * Mock match data for UI development / testing without a real .dem file.
 * Generates plausible CS2 data for de_dust2.
 */

export interface MockPlayer {
  steamId: string;
  name: string;
  team: "T" | "CT";
}

export const MOCK_PLAYERS: MockPlayer[] = [
  { steamId: "76561198000000001", name: "s1mple", team: "CT" },
  { steamId: "76561198000000002", name: "NiKo", team: "CT" },
  { steamId: "76561198000000003", name: "ZywOo", team: "CT" },
  { steamId: "76561198000000004", name: "device", team: "CT" },
  { steamId: "76561198000000005", name: "karrigan", team: "CT" },
  { steamId: "76561198000000006", name: "sh1ro", team: "T" },
  { steamId: "76561198000000007", name: "electroNic", team: "T" },
  { steamId: "76561198000000008", name: "Perfecto", team: "T" },
  { steamId: "76561198000000009", name: "Buster", team: "T" },
  { steamId: "76561198000000010", name: "b1t", team: "T" },
];

// Dust2 real world-space player spawn areas
const CT_SPAWN_POSITIONS = [
  { x: -200, y: -300 }, { x: -150, y: -250 }, { x: -250, y: -350 },
  { x: -100, y: -300 }, { x: -300, y: -250 },
];
const T_SPAWN_POSITIONS = [
  { x: -1300, y: 2600 }, { x: -1250, y: 2550 }, { x: -1350, y: 2650 },
  { x: -1400, y: 2600 }, { x: -1200, y: 2650 },
];

// Keep generated mock entities inside practical Dust2 playable extents.
const DUST2_BOUNDS = {
  minX: -1850,
  maxX: 1100,
  minY: -400,
  maxY: 2700,
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function interpolatePath(path: {x: number, y: number}[], t: number) {
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
  return {
    x: lerp(p1.x, p2.x, frac),
    y: lerp(p1.y, p2.y, frac)
  };
}

function jitter(v: number, amount = 50) {
  return v + (Math.random() - 0.5) * amount * 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampPoint(p: { x: number; y: number }) {
  return {
    x: clamp(p.x, DUST2_BOUNDS.minX, DUST2_BOUNDS.maxX),
    y: clamp(p.y, DUST2_BOUNDS.minY, DUST2_BOUNDS.maxY),
  };
}

/** Generate 30 rounds of mock round data */
export function generateMockRounds() {
  const rounds = [];
  let tScore = 0;
  let ctScore = 0;
  for (let i = 1; i <= 30; i++) {
    const tWins = Math.random() > 0.45;
    if (tWins) tScore++;
    else ctScore++;
    rounds.push({
      roundNum: i,
      winner: tWins ? "T" : "CT",
      reason: tWins
        ? ["bomb_exploded", "elimination"][Math.floor(Math.random() * 2)]
        : ["ct_win", "bomb_defused"][Math.floor(Math.random() * 2)],
      tScore,
      ctScore,
    });
  }
  return rounds;
}

/** Generate mock kills (tick-based, with world coords) */
export function generateMockKills(numRounds = 24) {
  const kills = [];
  const weapons = [
    "ak47", "m4a1", "awp", "deagle", "p250", "mp5sd", "sg553", "aug",
  ];
  for (let r = 0; r < numRounds; r++) {
    const roundKills = 3 + Math.floor(Math.random() * 8);
    for (let k = 0; k < roundKills; k++) {
      const tick = r * 6400 + 1000 + k * 200 + Math.floor(Math.random() * 300);
      const attackerIdx = Math.floor(Math.random() * MOCK_PLAYERS.length);
      let victimIdx = Math.floor(Math.random() * MOCK_PLAYERS.length);
      while (victimIdx === attackerIdx) {
        victimIdx = Math.floor(Math.random() * MOCK_PLAYERS.length);
      }
      kills.push({
        tick,
        attacker_steamid: MOCK_PLAYERS[attackerIdx].steamId,
        victim_steamid: MOCK_PLAYERS[victimIdx].steamId,
        weapon: weapons[Math.floor(Math.random() * weapons.length)],
        headshot: Math.random() > 0.6,
        x: clamp(jitter(-350, 850), DUST2_BOUNDS.minX, DUST2_BOUNDS.maxX),
        y: clamp(jitter(1200, 900), DUST2_BOUNDS.minY, DUST2_BOUNDS.maxY),
        z: 0,
      });
    }
  }
  return kills.sort((a, b) => a.tick - b.tick);
}

/** Generate mock player positions for smooth animation */
export function generateMockPositions(numRounds = 24) {
  const positions: Array<{ tick: number; steamid: string; x: number; y: number; z: number; yaw: number }> = [];
  const players = MOCK_PLAYERS;

  for (let r = 0; r < numRounds; r++) {
    const roundStart = r * 6400;
    const roundEnd = roundStart + 6000;

    players.forEach((player, idx) => {
      const isT = player.team === "T";
      const spawnList = isT ? T_SPAWN_POSITIONS : CT_SPAWN_POSITIONS;
      const pIdx = isT ? idx - 5 : idx;
      const spawn = spawnList[Math.max(0, pIdx) % spawnList.length];
      const laneOffset = (pIdx - 2) * 42;

      // Give each player a distinct path to navigate the map properly
      const pathsT = [
        // To B Site via Tunnels
        [spawn, {x: -1800, y: 2200 + laneOffset}, {x: -1600, y: 1000 + laneOffset * 0.3}, {x: -1500, y: -200 + laneOffset * 0.2}],
        // To Lower Tunnels / Mid
        [spawn, {x: -1200, y: 2200 + laneOffset}, {x: -800, y: 1200 + laneOffset * 0.2}, {x: -1000, y: 600 + laneOffset * 0.2}],
        // To Catwalk / Short A
        [spawn, {x: -800, y: 1200 + laneOffset * 0.2}, {x: -200, y: 1200 + laneOffset * 0.2}, {x: 200, y: 1000 + laneOffset * 0.2}, {x: 800, y: 1000 + laneOffset * 0.2}],
        // To Long A
        [spawn, {x: 0, y: 2600 + laneOffset * 0.2}, {x: 800, y: 2000 + laneOffset * 0.2}, {x: 1000, y: 1500 + laneOffset * 0.2}, {x: 800, y: 1000 + laneOffset * 0.2}],
        // Hold Top Mid
        [spawn, {x: -1000, y: 2000 + laneOffset * 0.25}, {x: -600, y: 1500 + laneOffset * 0.2}],
      ];
      
      const pathsCT = [
        // To B Site
        [spawn, {x: -1000, y: -200 + laneOffset * 0.2}, {x: -1500, y: -200 + laneOffset * 0.2}],
        // To Mid Doors
        [spawn, {x: -200, y: 600 + laneOffset * 0.2}],
        // To A Site
        [spawn, {x: 400, y: -300 + laneOffset * 0.2}, {x: 800, y: 1000 + laneOffset * 0.2}],
        // To Long A
        [spawn, {x: 800, y: 1000 + laneOffset * 0.2}, {x: 1000, y: 1500 + laneOffset * 0.2}],
        // To Short A
        [spawn, {x: 400, y: -300 + laneOffset * 0.2}, {x: 600, y: 1000 + laneOffset * 0.2}, {x: 200, y: 1000 + laneOffset * 0.2}],
      ];
      
      const pathList = isT ? pathsT : pathsCT;
      const path = pathList[Math.max(0, pIdx) % pathList.length].map(clampPoint);

      // They reach their target in ~10 to 22 seconds (640 to 1400 ticks)
      const reachTick = roundStart + 640 + Math.random() * 800;

      let lastPos = spawn;

      for (let tick = roundStart; tick < roundEnd; tick += 16) {
        let t = (tick - roundStart) / (reachTick - roundStart);
        if (t > 1) t = 1;
        
        // ease-out cubic for fast sprint then slowing down
        const smoothT = 1 - Math.pow(1 - t, 3);
        
        const idealPos = interpolatePath(path, smoothT);
        
        // Jitter is small while moving, larger when holding a site
        const currentJitter = t >= 1 ? 18 : 3;
        
        const x = clamp(jitter(idealPos.x, currentJitter), DUST2_BOUNDS.minX, DUST2_BOUNDS.maxX);
        const y = clamp(jitter(idealPos.y, currentJitter), DUST2_BOUNDS.minY, DUST2_BOUNDS.maxY);
        
        // Calculate yaw based on movement direction
        const dx = x - lastPos.x;
        const dy = y - lastPos.y;
        const moving = Math.abs(dx) > 1 || Math.abs(dy) > 1;
        
        const yaw = moving 
          ? (Math.atan2(dy, dx) * 180) / Math.PI 
          : (Math.atan2(idealPos.y - spawn.y, idealPos.x - spawn.x) * 180) / Math.PI + jitter(0, 15);

        positions.push({
          tick,
          steamid: player.steamId,
          x,
          y,
          z: 0,
          yaw,
        });
        
        lastPos = { x, y };
      }
    });
  }
  return positions.sort((a, b) => a.tick - b.tick);
}

/** Generate mock grenade events */
export function generateMockGrenades() {
  const grenades = [];
  const types = ["smoke", "flash", "he", "molotov"] as const;
  for (let r = 0; r < 24; r++) {
    const count = 1 + Math.floor(Math.random() * 4);
    for (let g = 0; g < count; g++) {
      const player = MOCK_PLAYERS[Math.floor(Math.random() * MOCK_PLAYERS.length)];
      const startX = clamp(jitter(-300, 400), DUST2_BOUNDS.minX, DUST2_BOUNDS.maxX);
      const startY = clamp(jitter(1400, 900), DUST2_BOUNDS.minY, DUST2_BOUNDS.maxY);
      const endX = clamp(startX + jitter(200, 150), DUST2_BOUNDS.minX, DUST2_BOUNDS.maxX);
      const endY = clamp(startY + jitter(200, 150), DUST2_BOUNDS.minY, DUST2_BOUNDS.maxY);
      grenades.push({
        tick: r * 6400 + 500 + Math.floor(Math.random() * 2000),
        type: types[Math.floor(Math.random() * types.length)],
        steamid: player.steamId,
        trajectory: [
          { x: startX, y: startY, z: 0 },
          { x: (startX + endX) / 2, y: (startY + endY) / 2, z: 150 },
          { x: endX, y: endY, z: 0 },
        ],
      });
    }
  }
  return grenades;
}

/** Generate mock player stats */
export function generateMockPlayerStats() {
  const stats: Record<string, {
    kills: number; deaths: number; assists: number; adr: number;
    headshot_pct: number; flash_assists: number; rating: number;
    util_damage: number;
  }> = {};

  MOCK_PLAYERS.forEach((p) => {
    const k = 10 + Math.floor(Math.random() * 20);
    const d = 8 + Math.floor(Math.random() * 15);
    const a = Math.floor(Math.random() * 6);
    const adr = 60 + Math.random() * 60;
    const hsPct = 20 + Math.random() * 50;
    const rating = Math.max(0.5, (k / d) * 0.7 + (adr / 100) * 0.3 + Math.random() * 0.3);
    stats[p.steamId] = {
      kills: k,
      deaths: d,
      assists: a,
      adr: Math.round(adr * 10) / 10,
      headshot_pct: Math.round(hsPct * 10) / 10,
      flash_assists: Math.floor(Math.random() * 4),
      util_damage: Math.round(Math.random() * 200 * 10) / 10,
      rating: Math.round(rating * 100) / 100,
    };
  });

  return stats;
}

/** Returns a full mock match payload ready to store */
export function generateMockMatch(id?: string) {
  return {
    id: id ?? "mock-match-001",
    mapName: "de_dust2",
    scoreT: 13,
    scoreCt: 11,
    rounds: generateMockRounds(),
    kills: generateMockKills(),
    playerPositions: generateMockPositions(),
    grenades: generateMockGrenades(),
    playerStats: generateMockPlayerStats(),
    players: MOCK_PLAYERS,
  };
}

export function getMockMatches() {
  return [
    {
      id: "demo-match-001",
      mapName: "de_dust2",
      scoreT: 13,
      scoreCt: 11,
      status: "done",
      date: new Date().toISOString(),
      playerStats: MOCK_PLAYERS.map((p) => ({
        steamId: p.steamId,
        playerName: p.name,
        team: p.team,
        kills: 15 + Math.floor(Math.random() * 10),
        deaths: 10 + Math.floor(Math.random() * 8),
        assists: Math.floor(Math.random() * 5),
        rating: 0.8 + Math.random() * 0.5,
      })),
    },
    {
      id: "demo-match-002",
      mapName: "de_mirage",
      scoreT: 16,
      scoreCt: 14,
      status: "done",
      date: new Date(Date.now() - 86400000).toISOString(),
      playerStats: MOCK_PLAYERS.map((p) => ({
        steamId: p.steamId,
        playerName: p.name,
        team: p.team,
        kills: 12 + Math.floor(Math.random() * 12),
        deaths: 8 + Math.floor(Math.random() * 10),
        assists: Math.floor(Math.random() * 4),
        rating: 0.9 + Math.random() * 0.4,
      })),
    },
  ];
}

export function getMockMatchById(id: string) {
  const mock = generateMockMatch(id);
  return {
    id: mock.id,
    mapName: mock.mapName,
    scoreT: mock.scoreT,
    scoreCt: mock.scoreCt,
    status: "done",
    date: new Date().toISOString(),
    rounds: mock.rounds.map((r, i) => ({
      id: `r-${i}`,
      roundNum: r.roundNum,
      winner: r.winner,
      reason: r.reason,
      tScore: r.tScore,
      ctScore: r.ctScore,
    })),
    kills: mock.kills.map((k, i) => ({
      id: `k-${i}`,
      tick: k.tick,
      attackerSteamId: k.attacker_steamid,
      victimSteamId: k.victim_steamid,
      weapon: k.weapon,
      headshot: k.headshot,
      x: k.x,
      y: k.y,
      z: k.z,
    })),
    playerPositions: mock.playerPositions.map((p, i) => ({
      id: `p-${i}`,
      tick: p.tick,
      steamId: p.steamid,
      x: p.x,
      y: p.y,
      z: p.z,
      yaw: p.yaw,
    })),
    grenadeEvents: mock.grenades.map((g, i) => ({
      id: `g-${i}`,
      tick: g.tick,
      type: g.type,
      steamId: g.steamid,
      trajectory: g.trajectory,
    })),
    damages: [],
    playerStats: MOCK_PLAYERS.map((p, i) => {
      const stats = mock.playerStats[p.steamId];
      return {
        id: `ps-${i}`,
        steamId: p.steamId,
        playerName: p.name,
        team: p.team,
        kills: stats.kills,
        deaths: stats.deaths,
        assists: stats.assists,
        adr: stats.adr,
        hsPct: stats.headshot_pct,
        flashAssists: stats.flash_assists,
        utilDamage: stats.util_damage,
        rating: stats.rating,
      };
    }),
  };
}
