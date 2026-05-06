"use client";

import { useState } from "react";
import { requestCoachAnalysis } from "@/lib/api/client";
import { Bot, RefreshCw, Check } from "lucide-react";

interface CoachingMistake {
  title: string;
  description: string;
  rounds?: number[];
  severity?: "high" | "medium" | "low";
}

interface CoachingPositive {
  title: string;
  description: string;
}

interface CoachingTip {
  area: string;
  tip: string;
  priority?: "high" | "medium" | "low";
}

interface GrenadeScore {
  score: number;
  max: number;
  assessment: string;
  tip: string;
}

interface PositioningInsight {
  pattern: string;
  details: string;
  fix: string;
}

interface CoachingData {
  mistakes: CoachingMistake[];
  positives: CoachingPositive[];
  tips: CoachingTip[];
  grenade_score: GrenadeScore;
  positioning: PositioningInsight;
}

interface AICoachProps {
  matchId: string;
  steamId?: string;
}

const SEVERITY_COLORS = {
  high: "border-red-500/50 bg-red-900/10",
  medium: "border-yellow-500/50 bg-yellow-900/10",
  low: "border-slate-600 bg-slate-800/10",
};

const PRIORITY_DOT = {
  high: "bg-red-400",
  medium: "bg-yellow-400",
  low: "bg-slate-400",
};

export default function AICoach({ matchId, steamId }: AICoachProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CoachingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"mistakes" | "positives" | "tips" | "positioning">(
    "mistakes"
  );

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await requestCoachAnalysis<CoachingData>({ matchId, steamId });
      setData(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading) {
    return (
      <div className="bg-[#12121a] border border-slate-700 rounded-lg p-6 flex flex-col items-center gap-4">
        <div className="text-center">
          <Bot className="w-8 h-8 text-orange-500 mx-auto mb-2" />
          <h3 className="text-white font-mono font-bold text-sm">AI Coaching Analysis</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-xs">
            Get personalized tactical feedback, mistake detection, and improvement tips powered by
            Claude AI.
          </p>
        </div>
        <button
          onClick={analyze}
          className="bg-orange-500 hover:bg-orange-400 text-black font-bold py-2 px-6 rounded font-mono text-sm transition-colors"
        >
          ANALYZE MATCH
        </button>
        {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-[#12121a] border border-slate-700 rounded-lg p-6 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-mono">Claude is analyzing your match…</p>
      </div>
    );
  }

  if (!data) return null;

  const tabs = [
    { id: "mistakes" as const, label: "MISTAKES", count: data.mistakes?.length },
    { id: "positives" as const, label: "POSITIVES", count: data.positives?.length },
    { id: "tips" as const, label: "TIPS", count: data.tips?.length },
    { id: "positioning" as const, label: "POSITION" },
  ];

  return (
    <div className="bg-[#12121a] border border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/20">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-mono font-bold text-white">AI Coach</span>
          <span className="text-xs text-slate-500 font-mono">claude-sonnet</span>
        </div>
        <button
          onClick={analyze}
          className="text-xs font-mono text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-500 px-2 py-1 rounded transition-colors"
        >
          <RefreshCw className="w-3 h-3 mr-1" /> RE-ANALYZE
        </button>
      </div>

      {/* Grenade score bar */}
      {data.grenade_score && (
        <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-900/30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500">UTIL</span>
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{
                  width: `${(data.grenade_score.score / data.grenade_score.max) * 100}%`,
                }}
              />
            </div>
            <span className="text-xs font-mono text-orange-400 font-bold w-12">
              {data.grenade_score.score}/{data.grenade_score.max}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-1">{data.grenade_score.assessment}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs font-mono transition-colors ${
              activeTab === tab.id
                ? "text-orange-400 border-b-2 border-orange-500"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1 text-slate-600">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {activeTab === "mistakes" && (
          <div className="flex flex-col gap-3">
            {data.mistakes?.map((m, i) => (
              <div
                key={i}
                className={`rounded-lg p-3 border ${
                  SEVERITY_COLORS[m.severity ?? "low"]
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-white text-xs font-mono font-bold">{m.title}</span>
                  {m.severity && (
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 rounded ${
                        m.severity === "high"
                          ? "bg-red-900/50 text-red-400"
                          : m.severity === "medium"
                          ? "bg-yellow-900/50 text-yellow-400"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {m.severity}
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{m.description}</p>
                {m.rounds && m.rounds.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-[10px] font-mono text-slate-600">ROUNDS:</span>
                    {m.rounds.map((r) => (
                      <span
                        key={r}
                        className="text-[10px] font-mono bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "positives" && (
          <div className="flex flex-col gap-3">
            {data.positives?.map((p, i) => (
              <div key={i} className="rounded-lg p-3 border border-green-700/30 bg-green-900/10">
                <span className="text-green-400 text-xs font-mono font-bold block mb-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {p.title}
                </span>
                <p className="text-slate-400 text-xs leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "tips" && (
          <div className="flex flex-col gap-3">
            {data.tips?.map((t, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div
                  className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                    PRIORITY_DOT[t.priority ?? "low"]
                  }`}
                />
                <div>
                  <span className="text-xs font-mono text-slate-500 uppercase">{t.area}</span>
                  <p className="text-slate-300 text-xs leading-relaxed mt-0.5">{t.tip}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "positioning" && data.positioning && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg p-3 border border-yellow-700/30 bg-yellow-900/10">
              <span className="text-yellow-400 text-xs font-mono font-bold block mb-1">
                Pattern Detected
              </span>
              <p className="text-white text-xs font-mono font-bold mb-1">
                {data.positioning.pattern}
              </p>
              <p className="text-slate-400 text-xs leading-relaxed">{data.positioning.details}</p>
            </div>
            <div className="rounded-lg p-3 border border-green-700/30 bg-green-900/10">
              <span className="text-green-400 text-xs font-mono font-bold block mb-1">
                How to Fix
              </span>
              <p className="text-slate-300 text-xs leading-relaxed">{data.positioning.fix}</p>
            </div>
            {data.grenade_score?.tip && (
              <div className="rounded-lg p-3 border border-orange-700/30 bg-orange-900/10">
                <span className="text-orange-400 text-xs font-mono font-bold block mb-1">
                  Utility Tip
                </span>
                <p className="text-slate-300 text-xs leading-relaxed">{data.grenade_score.tip}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
