import MatchCard from "@/components/MatchCard";
import Link from "next/link";
import { MAP_CONFIGS } from "@/lib/mapConfig";
import { listMatches } from "@/lib/server/matches";
import { Gamepad2 } from "lucide-react";

interface Props {
  searchParams: Promise<{
    map?: string;
    result?: string;
    from?: string;
    to?: string;
  }>;
}

async function getMatches(filters: {
  steamId?: string;
  map?: string;
  result?: string;
  from?: string;
  to?: string;
}) {
  return listMatches(
    {
      steamId: filters.steamId,
      mapName: filters.map,
      result: filters.result,
      from: filters.from,
      to: filters.to,
    },
    100
  );
}

export default async function HistoryPage({ searchParams }: Props) {
  const filters = await searchParams;
  const matches = await getMatches(filters);

  const maps = Object.values(MAP_CONFIGS);

  return (
    <div className="max-w-screen-lg mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-mono font-bold text-white">Match History</h1>
          <p className="text-slate-500 text-xs font-mono mt-1">
            {matches.length} match{matches.length !== 1 ? "es" : ""} found
          </p>
        </div>
        <Link
          href="/"
          className="text-xs font-mono text-orange-500 hover:text-orange-400 border border-orange-500/30 hover:border-orange-500 px-3 py-1.5 rounded transition-colors"
        >
          + Upload Demo
        </Link>
      </div>

      {/* Filters */}
      <form className="flex gap-3 flex-wrap mb-6 bg-[#12121a] border border-slate-700 rounded-lg p-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-slate-500 uppercase">Map</label>
          <select
            name="map"
            defaultValue={filters.map ?? ""}
            className="bg-slate-800 border border-slate-600 text-slate-300 text-xs font-mono rounded px-2 py-1.5 focus:outline-none focus:border-orange-500"
          >
            <option value="">All Maps</option>
            {maps.map((m) => (
              <option key={m.name} value={m.name}>
                {m.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-slate-500 uppercase">Result</label>
          <select
            name="result"
            defaultValue={filters.result ?? ""}
            className="bg-slate-800 border border-slate-600 text-slate-300 text-xs font-mono rounded px-2 py-1.5 focus:outline-none focus:border-orange-500"
          >
            <option value="">All</option>
            <option value="win">Wins</option>
            <option value="loss">Losses</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-slate-500 uppercase">From</label>
          <input
            type="date"
            name="from"
            defaultValue={filters.from ?? ""}
            className="bg-slate-800 border border-slate-600 text-slate-300 text-xs font-mono rounded px-2 py-1.5 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-slate-500 uppercase">To</label>
          <input
            type="date"
            name="to"
            defaultValue={filters.to ?? ""}
            className="bg-slate-800 border border-slate-600 text-slate-300 text-xs font-mono rounded px-2 py-1.5 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="bg-orange-500 hover:bg-orange-400 text-black font-mono text-xs font-bold px-4 py-1.5 rounded transition-colors"
          >
            FILTER
          </button>
          <Link
            href="/history"
            className="border border-slate-600 hover:border-slate-400 text-slate-400 hover:text-slate-200 font-mono text-xs px-4 py-1.5 rounded transition-colors"
          >
            RESET
          </Link>
        </div>
      </form>

      {/* Match list */}
      {matches.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <Gamepad2 className="w-10 h-10 text-slate-600" />
          <p className="text-slate-400 font-mono text-sm">No matches found.</p>
          <Link href="/" className="text-orange-500 hover:text-orange-400 text-xs font-mono">
            Upload your first demo →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {matches.map((m) => (
            <MatchCard
              key={m.id}
              id={m.id}
              mapName={m.mapName}
              scoreT={m.scoreT}
              scoreCt={m.scoreCt}
              date={m.date}
              status={m.status}
              playerStats={m.playerStats}
            />
          ))}
        </div>
      )}
    </div>
  );
}
