"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import StatsPanel from "@/components/StatsPanel";
import RoundTimeline from "@/components/RoundTimeline";
import AICoach from "@/components/AICoach";
import type { MatchViewerDTO } from "@/lib/contracts/match";
import { BarChart3, Bot } from "lucide-react";

// MapViewer requires canvas — load client-side only
const MapViewer = dynamic(() => import("@/components/MapViewer"), { ssr: false });

interface MatchClientViewProps {
  match: MatchViewerDTO;
}

type SidebarTab = "stats" | "coach";

export default function MatchClientView({ match }: MatchClientViewProps) {
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("stats");
  const viewerStats = match.playerStats.map((s) => ({ steamId: s.steamId, playerName: s.playerName, team: s.team }));

  const maxTick =
    match.playerPositions.length > 0
      ? Math.max(...match.playerPositions.map((p) => p.tick))
      : 150000;

  const lastRound = match.rounds[match.rounds.length - 1];

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-slate-800 bg-[#0d0d14] flex-shrink-0">
        <span className="text-xs font-mono text-orange-500 font-bold uppercase">
          {match.mapName.replace("de_", "")}
        </span>
        <span className="text-slate-600 text-xs">|</span>
        {lastRound && (
          <span className="text-xs font-mono text-slate-300">
            <span className="text-orange-400 font-bold">{match.scoreT}</span>
            <span className="text-slate-600 mx-1">:</span>
            <span className="text-blue-400 font-bold">{match.scoreCt}</span>
          </span>
        )}
        <span className="text-slate-600 text-xs">|</span>
        <span className="text-xs font-mono text-slate-500">
          {new Date(match.date).toLocaleDateString()}
        </span>
        <span className="text-slate-600 text-xs">|</span>
        <span className="text-xs font-mono text-slate-500">
          {match.rounds.length} rounds
        </span>
        <span className="text-slate-600 text-xs">|</span>
        <span className="text-xs font-mono text-slate-500">
          {match.kills.length} kills
        </span>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map viewer — takes the bulk of the space */}
        <div className="flex-1 p-3 min-w-0 flex flex-col">
          <MapViewer
            mapName={match.mapName}
            kills={match.kills}
            playerPositions={match.playerPositions}
            grenadeEvents={match.grenadeEvents}
            damages={match.damages}
            rounds={match.rounds}
            playerStats={viewerStats}
            totalTicks={maxTick}
          />
        </div>

        {/* Right sidebar */}
        <div className="w-[420px] flex-shrink-0 border-l border-slate-800 flex flex-col overflow-hidden">
          {/* Sidebar tabs */}
          <div className="flex border-b border-slate-800 flex-shrink-0">
            {(["stats", "coach"] as SidebarTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setSidebarTab(tab)}
                className={`flex-1 py-2.5 text-xs font-mono uppercase tracking-widest transition-colors ${
                  sidebarTab === tab
                    ? "text-orange-400 border-b-2 border-orange-500 bg-orange-900/10"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab === "stats" ? <><BarChart3 className="w-3 h-3 mr-1 inline" /> Stats</> : <><Bot className="w-3 h-3 mr-1 inline" /> Coach</>}
              </button>
            ))}
          </div>

          {/* Sidebar content */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {sidebarTab === "stats" ? (
              <>
                <RoundTimeline rounds={match.rounds} />
                <StatsPanel
                  playerStats={match.playerStats}
                  kills={match.kills.map((k) => ({ ...k, weapon: k.weapon }))}
                  rounds={match.rounds}
                  mapName={match.mapName}
                />
              </>
            ) : (
              <AICoach matchId={match.id} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
