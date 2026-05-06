"use client";

import { Bomb, Wrench, Skull, Shield, Timer } from "lucide-react";

interface Round {
  roundNum: number;
  winner: string;
  reason: string;
  tScore: number;
  ctScore: number;
}

interface RoundTimelineProps {
  rounds: Round[];
  playerTeam?: string;
}

const REASON_LABELS: Record<string, React.ReactNode> = {
  bomb_exploded: <Bomb className="w-3 h-3" />,
  bomb_defused: <Wrench className="w-3 h-3" />,
  elimination: <Skull className="w-3 h-3" />,
  ct_win: <Shield className="w-3 h-3" />,
  t_win: <Skull className="w-3 h-3" />,
  time: <Timer className="w-3 h-3" />,
};

export default function RoundTimeline({ rounds, playerTeam }: RoundTimelineProps) {
  if (!rounds.length) return null;

  const lastRound = rounds[rounds.length - 1];

  return (
    <div className="bg-[#12121a] border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest">
          Round Timeline
        </h3>
        <div className="flex gap-4 text-sm font-mono">
          <span className="text-orange-400 font-bold">T {lastRound.tScore}</span>
          <span className="text-slate-500">:</span>
          <span className="text-blue-400 font-bold">{lastRound.ctScore} CT</span>
        </div>
      </div>

      <div className="flex gap-0.5 flex-wrap">
        {rounds.map((r) => {
          const isT = r.winner === "T";
          const isPlayerWin = playerTeam ? r.winner === playerTeam : isT;
          const icon = REASON_LABELS[r.reason] ?? (isT ? "T" : "CT");

          return (
            <div
              key={r.roundNum}
              title={`Round ${r.roundNum}: ${r.winner} wins — ${r.reason}\n${r.tScore}:${r.ctScore}`}
              className={`relative flex items-center justify-center rounded-sm text-[9px] font-mono cursor-default
                transition-transform hover:scale-110 hover:z-10
                ${isT
                  ? "bg-orange-900/70 border border-orange-700/50 text-orange-300"
                  : "bg-blue-900/70 border border-blue-700/50 text-blue-300"
                }
                ${isPlayerWin ? "ring-1 ring-white/20" : "opacity-80"}
              `}
              style={{ width: 22, height: 22 }}
            >
              <span>{icon}</span>
              <span
                className="absolute -bottom-0.5 -right-0.5 text-[7px] text-white/40"
              >
                {r.roundNum}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 pt-3 border-t border-slate-700/50">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-orange-900/70 border border-orange-700/50" />
          <span className="text-xs font-mono text-slate-500">T-side win</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-900/70 border border-blue-700/50" />
          <span className="text-xs font-mono text-slate-500">CT-side win</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          {Object.entries(REASON_LABELS).map(([key, icon]) => (
            <span key={key} title={key} className="text-xs cursor-default">
              {icon}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
