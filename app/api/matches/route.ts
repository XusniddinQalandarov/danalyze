import { NextRequest, NextResponse } from "next/server";
import { prisma, hasDatabase } from "@/lib/prisma";
import { listMatches } from "@/lib/server/matches";
import { getMockMatches } from "@/lib/mockData";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const steamId = searchParams.get("steamId");
  const mapName = searchParams.get("mapName");
  const result = searchParams.get("result"); // win | loss
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!hasDatabase()) {
    const mockMatches = getMockMatches();
    return NextResponse.json(mockMatches.slice(0, 5));
  }

  const matches = await listMatches({ steamId: steamId ?? undefined, mapName: mapName ?? undefined, result: result ?? undefined, from: from ?? undefined, to: to ?? undefined }, 50);
  return NextResponse.json(matches);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (!hasDatabase()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  await prisma!.match.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
