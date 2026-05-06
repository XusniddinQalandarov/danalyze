import type { MatchListItemDTO, MatchViewerDTO } from "@/lib/contracts/match";

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchMatches(query?: {
  steamId?: string;
  mapName?: string;
  result?: string;
  from?: string;
  to?: string;
}): Promise<MatchListItemDTO[]> {
  const params = new URLSearchParams();
  if (query?.steamId) params.set("steamId", query.steamId);
  if (query?.mapName) params.set("mapName", query.mapName);
  if (query?.result) params.set("result", query.result);
  if (query?.from) params.set("from", query.from);
  if (query?.to) params.set("to", query.to);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/matches${suffix}`);
  return parseJson<MatchListItemDTO[]>(res);
}

export async function fetchMatchById(id: string): Promise<MatchViewerDTO> {
  const res = await fetch(`/api/matches/${id}`);
  return parseJson<MatchViewerDTO>(res);
}

export async function uploadDemo(file: File): Promise<{ matchId: string; status: string }> {
  const form = new FormData();
  form.append("demo", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  return parseJson<{ matchId: string; status: string }>(res);
}

export async function uploadMockMatch(): Promise<{ matchId: string; status: string }> {
  const form = new FormData();
  form.append("mock", "true");
  const res = await fetch("/api/upload", { method: "POST", body: form });
  return parseJson<{ matchId: string; status: string }>(res);
}

export async function fetchUploadStatus(matchId: string): Promise<{
  id: string;
  status: string;
  errorMsg: string | null;
  mapName: string;
}> {
  const res = await fetch(`/api/upload/status?matchId=${matchId}`);
  return parseJson<{ id: string; status: string; errorMsg: string | null; mapName: string }>(res);
}

export async function requestCoachAnalysis<T>(body: {
  matchId: string;
  steamId?: string;
}): Promise<T> {
  const res = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson<T>(res);
}
