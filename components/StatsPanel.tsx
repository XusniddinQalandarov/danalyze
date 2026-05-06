"use client";

interface PlayerStat {
  steamId: string;
  playerName: string;
  team: string;
  kills: number;
  deaths: number;
  assists: number;
  adr: number;
  hsPct: number;
  flashAssists: number;
  utilDamage: number;
  rating: number;
}

interface Kill {
  weapon: string;
  attackerSteamId?: string;
  attacker_steamid?: string;
}

interface Round { roundNum: number; winner: string; tScore: number; ctScore: number }

interface StatsPanelProps {
  playerStats: PlayerStat[];
  kills: Kill[];
  rounds: Round[];
  mapName: string;
}

function ratingColor(r: number) {
  if (r >= 1.3) return "text-green-400";
  if (r >= 1.0) return "text-yellow-400";
  if (r >= 0.8) return "text-orange-400";
  return "text-red-400";
}

function performanceBadge(rating: number, kd: number): { label: string; color: string } {
  const score = (rating + kd) / 2;
  if (score >= 2.0) return { label: "S", color: "text-yellow-300 border-yellow-300" };
  if (score >= 1.5) return { label: "A", color: "text-green-400 border-green-400" };
  if (score >= 1.1) return { label: "B", color: "text-blue-400 border-blue-400" };
  if (score >= 0.8) return { label: "C", color: "text-slate-400 border-slate-400" };
  return { label: "D", color: "text-red-400 border-red-400" };
}

export default function StatsPanel({ playerStats, kills, rounds, mapName }: StatsPanelProps) {
  // Weapon breakdown
  const weaponKills: Record<string, number> = {};
  for (const k of kills) {
    const w = k.weapon ?? "unknown";
    weaponKills[w] = (weaponKills[w] ?? 0) + 1;
  }
  const topWeapons = Object.entries(weaponKills)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);
  const maxWeaponKills = topWeapons[0]?.[1] ?? 1;

  // Best player (MVP)
  const mvp = [...playerStats].sort((a, b) => b.rating - a.rating)[0];

  const lastRound = rounds[rounds.length - 1];
  const tWon = lastRound ? lastRound.tScore > lastRound.ctScore : false;

  const tPlayers = playerStats.filter((p) => p.team === "T").sort((a, b) => b.rating - a.rating);
  const ctPlayers = playerStats.filter((p) => p.team === "CT").sort((a, b) => b.rating - a.rating);
  const unknownPlayers = playerStats.filter((p) => !p.team || (p.team !== "T" && p.team !== "CT"));

  return (
    <div className="flex flex-col gap-4">
      {/* Match overview */}
      <div className="bg-[#12121a] border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
            {mapName.replace("de_", "").toUpperCase()}
          </span>
          {mvp && (
            <span className="text-xs font-mono text-yellow-400">
              ★ MVP: {mvp.playerName || mvp.steamId.slice(-4)} ({mvp.rating.toFixed(2)})
            </span>
          )}
        </div>
        {lastRound && (
          <div className="flex items-center gap-4">
            <span className={`text-3xl font-mono font-bold ${tWon ? "text-orange-400" : "text-slate-400"}`}>
              {lastRound.tScore}
            </span>
            <span className="text-slate-600 text-xl">:</span>
            <span className={`text-3xl font-mono font-bold ${!tWon ? "text-blue-400" : "text-slate-400"}`}>
              {lastRound.ctScore}
            </span>
            <div className="flex gap-2 ml-2">
              <span className={`text-xs font-mono px-2 py-0.5 rounded border ${tWon ? "border-orange-500 text-orange-400" : "border-blue-500 text-blue-400"}`}>
                {tWon ? "T WIN" : "CT WIN"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Player stat cards */}
      {[
        { label: "T SIDE", players: tPlayers, accent: "orange" },
        { label: "CT SIDE", players: ctPlayers, accent: "blue" },
        ...(unknownPlayers.length ? [{ label: "PLAYERS", players: unknownPlayers, accent: "slate" }] : []),
      ].map(({ label, players, accent }) =>
        players.length > 0 ? (
          <div key={label} className="bg-[#12121a] border border-slate-700 rounded-lg overflow-hidden">
            <div className={`px-4 py-2 border-b border-slate-700 bg-${accent}-900/20`}>
              <span className={`text-xs font-mono text-${accent}-400 uppercase tracking-widest font-bold`}>
                {label}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-700/50">
                    <th className="text-left px-4 py-2">PLAYER</th>
                    <th className="text-center px-2 py-2">K</th>
                    <th className="text-center px-2 py-2">D</th>
                    <th className="text-center px-2 py-2">A</th>
                    <th className="text-center px-2 py-2">K/D</th>
                    <th className="text-center px-2 py-2">ADR</th>
                    <th className="text-center px-2 py-2">HS%</th>
                    <th className="text-center px-2 py-2">RATING</th>
                    <th className="text-center px-2 py-2">GRADE</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => {
                    const kd = p.deaths > 0 ? p.kills / p.deaths : p.kills;
                    const badge = performanceBadge(p.rating, kd);
                    return (
                      <tr
                        key={p.steamId}
                        className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-2 text-white">
                          {p.playerName || p.steamId.slice(-8)}
                        </td>
                        <td className="text-center px-2 py-2 text-green-400">{p.kills}</td>
                        <td className="text-center px-2 py-2 text-red-400">{p.deaths}</td>
                        <td className="text-center px-2 py-2 text-slate-400">{p.assists}</td>
                        <td className="text-center px-2 py-2 text-slate-300">
                          {kd.toFixed(2)}
                        </td>
                        <td className="text-center px-2 py-2 text-slate-300">
                          {p.adr.toFixed(1)}
                        </td>
                        <td className="text-center px-2 py-2 text-slate-300">
                          {p.hsPct.toFixed(0)}%
                        </td>
                        <td className={`text-center px-2 py-2 font-bold ${ratingColor(p.rating)}`}>
                          {p.rating.toFixed(2)}
                        </td>
                        <td className="text-center px-2 py-2">
                          <span className={`border rounded px-1.5 py-0.5 font-bold text-xs ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null
      )}

      {/* Weapon breakdown */}
      {topWeapons.length > 0 && (
        <div className="bg-[#12121a] border border-slate-700 rounded-lg p-4">
          <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-3">
            Weapon Breakdown
          </h3>
          <div className="flex flex-col gap-2">
            {topWeapons.map(([weapon, count]) => (
              <div key={weapon} className="flex items-center gap-3">
                <span className="text-slate-400 font-mono text-xs w-20 truncate">{weapon}</span>
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all"
                    style={{ width: `${(count / maxWeaponKills) * 100}%` }}
                  />
                </div>
                <span className="text-slate-300 font-mono text-xs w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
