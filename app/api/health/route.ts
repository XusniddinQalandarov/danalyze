import { NextResponse } from "next/server";
import { prisma, hasDatabase } from "@/lib/prisma";

export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json({
      ok: true,
      service: "danalyze-api",
      db: "demo",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    await prisma!.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      service: "danalyze-api",
      db: "up",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "danalyze-api",
        db: "down",
        error: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
