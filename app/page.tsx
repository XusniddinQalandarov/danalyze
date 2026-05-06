import UploadZone from "@/components/UploadZone";
import MatchCard from "@/components/MatchCard";
import { listMatches } from "@/lib/server/matches";
import { Target, BarChart3, Flame, Bot } from "lucide-react";

async function getRecentMatches() {
  try {
    return await listMatches({}, 5);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const recentMatches = await getRecentMatches();

  return (
    <div className="max-w-screen-lg mx-auto px-4 py-16 flex flex-col items-center gap-16">
      {/* Hero */}
      <div className="text-center flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-orange-500" />
          <span className="text-xs font-mono text-orange-500 uppercase tracking-[0.3em]">
            CS2 Demo Analysis
          </span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-orange-500" />
        </div>

        <h1 className="text-5xl font-black font-mono tracking-tight">
          <span className="text-orange-500">DAnalyze</span>
        </h1>

        <p className="text-slate-400 text-sm max-w-md leading-relaxed">
          Upload your CS2 demo. Get a full 2D replay viewer, per-player stats,
          kill heatmaps, and AI coaching feedback — all in your browser.
        </p>

        <div className="flex gap-6 text-xs font-mono text-slate-600">
          {["2D MAP VIEWER", "AI COACHING", "KILL HEATMAPS", "ROUND TIMELINE"].map((f) => (
            <span key={f} className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-orange-500" />
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Upload zone */}
      <UploadZone />

      {/* Recent matches */}
      {recentMatches.length > 0 && (
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest">
              Recent Matches
            </h2>
            <a href="/history" className="text-xs font-mono text-orange-500 hover:text-orange-400">
              View all →
            </a>
          </div>
          <div className="flex flex-col gap-2">
            {recentMatches.map((m) => (
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
        </div>
      )}

      {/* Feature grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
        {[
          { icon: Target, title: "2D Replay", desc: "Top-down map viewer with player tracking" },
          { icon: BarChart3, title: "Stats", desc: "K/D/A, ADR, HLTV rating per player" },
          { icon: Flame, title: "Heatmaps", desc: "Kill/death position overlays" },
          { icon: Bot, title: "AI Coach", desc: "Tactical analysis by Claude AI" },
        ].map((f) => (
          <div
            key={f.title}
            className="bg-[#12121a] border border-slate-800 rounded-lg p-4 flex flex-col gap-2"
          >
            <f.icon className="w-6 h-6 text-orange-500" />
            <span className="text-white font-mono text-xs font-bold">{f.title}</span>
            <span className="text-slate-500 text-xs leading-relaxed">{f.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
