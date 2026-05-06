"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

interface MatchCardProps {
  id: string;
  mapName: string;
  scoreT: number;
  scoreCt: number;
  date: string;
  status: string;
  playerStats?: Array<{
    steamId: string;
    playerName: string;
    team: string;
    kills: number;
    deaths: number;
    assists: number;
    rating: number;
  }>;
  steamId?: string;
}

function getBadge(rating: number, kd: number) {
  const score = (rating + kd) / 2;
  if (score >= 2.0) return { label: "S", color: "text-yellow-300 border-yellow-300/50 bg-yellow-900/20" };
  if (score >= 1.5) return { label: "A", color: "text-green-400 border-green-400/50 bg-green-900/20" };
  if (score >= 1.1) return { label: "B", color: "text-blue-400 border-blue-400/50 bg-blue-900/20" };
  if (score >= 0.8) return { label: "C", color: "text-slate-400 border-slate-400/50 bg-slate-900/20" };
  return { label: "D", color: "text-red-400 border-red-400/50 bg-red-900/20" };
}

export default function MatchCard({
  id,
  mapName,
  scoreT,
  scoreCt,
  date,
  status,
  playerStats = [],
  steamId,
}: MatchCardProps) {
  const mapDisplay = mapName.replace("de_", "").toUpperCase();
  const won = scoreT > scoreCt;
  const processing = status !== "done" && status !== "error";

  // Find player-specific stat
  const playerStat = steamId
    ? playerStats.find((s) => s.steamId === steamId)
    : playerStats.sort((a, b) => b.rating - a.rating)[0];

  const kd = playerStat && playerStat.deaths > 0
    ? playerStat.kills / playerStat.deaths
    : playerStat?.kills ?? 0;
  const badge = playerStat ? getBadge(playerStat.rating, kd) : null;

  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <Link href={`/match/${id}`}>
      <div className="group bg-[#12121a] border border-slate-700 hover:border-orange-500/50 rounded-lg overflow-hidden transition-all duration-200 hover:bg-slate-800/50 cursor-pointer">
        <div className="flex items-stretch">
          {/* Map thumbnail */}
          <div className="relative w-24 flex-shrink-0 bg-slate-900 overflow-hidden">
            <img
              src={`/maps/${mapName}.png`}
              alt={mapDisplay}
              className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-mono text-xs font-bold bg-black/60 px-1.5 py-0.5 rounded">
                {mapDisplay}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-3 flex items-center gap-4">
            {/* Score */}
            <div className="flex items-center gap-2 min-w-[80px]">
              {processing ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-orange-500 border-t-transparent animate-spin" />
                  <span className="text-xs font-mono text-slate-500 capitalize">{status}</span>
                </div>
              ) : status === "error" ? (
                <span className="text-xs font-mono text-red-400">ERROR</span>
              ) : (
                <>
                  <span
                    className={`text-xl font-mono font-bold ${
                      won ? "text-orange-400" : "text-slate-400"
                    }`}
                  >
                    {scoreT}
                  </span>
                  <span className="text-slate-600">:</span>
                  <span
                    className={`text-xl font-mono font-bold ${
                      !won ? "text-blue-400" : "text-slate-400"
                    }`}
                  >
                    {scoreCt}
                  </span>
                </>
              )}
            </div>

            {/* W/L pill */}
            {!processing && status !== "error" && (
              <span
                className={`text-xs font-mono px-2 py-0.5 rounded border ${
                  won
                    ? "text-orange-400 border-orange-500/50 bg-orange-900/20"
                    : "text-blue-400 border-blue-500/50 bg-blue-900/20"
                }`}
              >
                {won ? "WIN" : "LOSS"}
              </span>
            )}

            {/* Player K/D */}
            {playerStat && (
              <span className="text-sm font-mono text-slate-300">
                {playerStat.kills}/{playerStat.deaths}/{playerStat.assists}
              </span>
            )}

            {/* Date */}
            <span className="text-xs font-mono text-slate-600 ml-auto">{formattedDate}</span>

            {/* Badge */}
            {badge && (
              <span
                className={`text-sm font-mono font-bold border rounded px-2 py-0.5 ${badge.color}`}
              >
                {badge.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
