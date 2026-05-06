"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchUploadStatus, uploadDemo, uploadMockMatch } from "@/lib/api/client";
import { Gamepad2, Check, Zap } from "lucide-react";

const STAGES = ["uploading", "parsing", "analyzing", "done"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_LABELS: Record<Stage, string> = {
  uploading: "Uploading demo…",
  parsing: "Parsing events…",
  analyzing: "Analyzing data…",
  done: "Complete!",
};

export default function UploadZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<Stage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setMatchId] = useState<string | null>(null);

  const pollStatus = useCallback(
    async (id: string) => {
      const poll = async () => {
        try {
          const data = await fetchUploadStatus(id);
          if (data.status === "done") {
            setStage("done");
            setTimeout(() => router.push(`/match/${id}`), 800);
          } else if (data.status === "error") {
            setError(data.errorMsg ?? "Parser error");
            setStage(null);
          } else {
            setStage((data.status as Stage) ?? "uploading");
            setTimeout(poll, 1500);
          }
        } catch {
          setTimeout(poll, 2000);
        }
      };
      poll();
    },
    [router]
  );

  const upload = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".dem")) {
        setError("Please upload a .dem file");
        return;
      }
      setError(null);
      setStage("uploading");

      try {
        const data = await uploadDemo(file);
        setMatchId(data.matchId);
        setStage("parsing");
        pollStatus(data.matchId);
      } catch (e) {
        setError(String(e));
        setStage(null);
      }
    },
    [pollStatus]
  );

  const handleMockLoad = async () => {
    setError(null);
    setStage("uploading");
    try {
      const data = await uploadMockMatch();
      setStage("done");
      setTimeout(() => router.push(`/match/${data.matchId}`), 600);
    } catch (e) {
      setError(String(e));
      setStage(null);
    }
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) upload(file);
    },
    [upload]
  );

  const stageIdx = stage ? STAGES.indexOf(stage) : -1;

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !stage && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 transition-all cursor-pointer
          ${dragging
            ? "border-orange-500 bg-orange-500/5 scale-[1.01]"
            : stage
            ? "border-slate-600 bg-slate-900/30 cursor-default"
            : "border-slate-600 hover:border-orange-500/70 hover:bg-orange-500/5 bg-slate-900/20"
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".dem"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />

        {!stage ? (
          <>
            <Gamepad2 className="w-12 h-12 text-orange-500" />
            <div className="text-center">
              <p className="text-white font-mono font-bold">Drop your .dem file here</p>
              <p className="text-slate-500 text-sm mt-1">CS2 demo files only</p>
            </div>
            <span className="text-xs font-mono text-slate-600 border border-slate-700 px-3 py-1.5 rounded">
              CLICK TO BROWSE
            </span>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-mono text-sm">
              {stage === "done" ? <><Check className="w-4 h-4 mr-1 inline" /> Done! Redirecting…</> : STAGE_LABELS[stage]}
            </p>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${((stageIdx + 1) / STAGES.length) * 100}%` }}
              />
            </div>

            <div className="flex gap-2">
              {STAGES.map((s, i) => (
                <span
                  key={s}
                  className={`text-xs font-mono px-2 py-0.5 rounded ${
                    i <= stageIdx
                      ? "bg-orange-900/40 text-orange-400"
                      : "bg-slate-800 text-slate-600"
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
          <p className="text-red-400 text-sm font-mono">{error}</p>
        </div>
      )}

      {/* Mock mode */}
      {!stage && (
        <button
          onClick={handleMockLoad}
          className="text-xs font-mono text-slate-500 hover:text-orange-400 border border-slate-700 hover:border-orange-500/50 rounded-lg py-2 px-4 transition-colors"
        >
          <Zap className="w-3 h-3 mr-1" /> Load sample match (no .dem needed)
        </button>
      )}
    </div>
  );
}
