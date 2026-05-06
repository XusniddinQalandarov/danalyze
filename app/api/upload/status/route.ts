import { NextRequest, NextResponse } from "next/server";
import { prisma, hasDatabase } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

  if (!hasDatabase()) {
    return NextResponse.json({ id: matchId, status: "done", mapName: "de_dust2" });
  }

  const match = await prisma!.match.findUnique({
    where: { id: matchId },
    select: { id: true, status: true, errorMsg: true, mapName: true },
  });

  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(match);
}
