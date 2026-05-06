"""
FRAG.GG — CS2 Demo Parser Microservice
FastAPI service that accepts .dem files and returns structured match data.
Run: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import tempfile
import traceback
from typing import Any

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

try:
    from demoparser2 import DemoParser
    DEMOPARSER_AVAILABLE = True
except ImportError:
    DEMOPARSER_AVAILABLE = False

app = FastAPI(title="FRAG.GG Parser", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def safe_val(v: Any) -> Any:
    """Convert Polars / numpy types to plain Python for JSON serialization."""
    try:
        import math
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            return 0.0
        if hasattr(v, "item"):          # numpy scalar
            return v.item()
    except Exception:
        pass
    if v is None:
        return None
    return v


def rows_to_dicts(df) -> list[dict]:
    """Convert a Polars DataFrame to a list of plain Python dicts."""
    return [
        {k: safe_val(v) for k, v in row.items()}
        for row in df.to_dicts()
    ]


@app.get("/health")
def health():
    return {"status": "ok", "demoparser_available": DEMOPARSER_AVAILABLE}


@app.post("/parse")
async def parse_demo(file: UploadFile = File(...)):
    if not DEMOPARSER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="demoparser2 is not installed. Run: pip install demoparser2"
        )

    if not file.filename or not file.filename.endswith(".dem"):
        raise HTTPException(status_code=400, detail="File must be a .dem file")

    content = await file.read()
    if len(content) < 1024:
        raise HTTPException(status_code=400, detail="File too small to be a valid demo")

    # Write to temp file (demoparser2 requires a file path)
    with tempfile.NamedTemporaryFile(suffix=".dem", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        parser = DemoParser(tmp_path)
        result = _extract_all(parser)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {str(e)}\n{traceback.format_exc()}")
    finally:
        os.unlink(tmp_path)


def _extract_all(parser: "DemoParser") -> dict:
    rounds = _extract_rounds(parser)
    kills = _extract_kills(parser)
    positions = _extract_positions(parser)
    grenades = _extract_grenades(parser)
    damages = _extract_damages(parser)
    player_stats = _compute_player_stats(kills, damages)

    return {
        "rounds": rounds,
        "kills": kills,
        "player_positions": positions,
        "grenades": grenades,
        "damages": damages,
        "player_stats": player_stats,
    }


def _extract_rounds(parser) -> list[dict]:
    try:
        df = parser.parse_event("round_end", player=[], other=["winner", "reason", "t_score", "ct_score"])
        rounds = []
        for i, row in enumerate(df.to_dicts()):
            rounds.append({
                "round_num": i + 1,
                "winner": "CT" if safe_val(row.get("winner")) == 3 else "T",
                "reason": str(safe_val(row.get("reason", ""))),
                "t_score": safe_val(row.get("t_score", 0)) or 0,
                "ct_score": safe_val(row.get("ct_score", 0)) or 0,
            })
        return rounds
    except Exception:
        return []


def _extract_kills(parser) -> list[dict]:
    try:
        df = parser.parse_event(
            "player_death",
            player=["X", "Y", "Z"],
            other=["attacker_steamid", "user_steamid", "weapon", "headshot"],
        )
        kills = []
        for row in df.to_dicts():
            kills.append({
                "tick": safe_val(row.get("tick", 0)),
                "attacker_steamid": str(safe_val(row.get("attacker_steamid", ""))),
                "victim_steamid": str(safe_val(row.get("user_steamid", ""))),
                "weapon": str(safe_val(row.get("weapon", "unknown"))),
                "headshot": bool(safe_val(row.get("headshot", False))),
                "x": float(safe_val(row.get("X", 0)) or 0),
                "y": float(safe_val(row.get("Y", 0)) or 0),
                "z": float(safe_val(row.get("Z", 0)) or 0),
            })
        return kills
    except Exception:
        return []


def _extract_positions(parser) -> list[dict]:
    """Sample player positions every 16 ticks."""
    try:
        df = parser.parse_ticks(["X", "Y", "Z", "yaw", "steamid"], every_n_ticks=16)
        positions = []
        for row in df.to_dicts():
            positions.append({
                "tick": safe_val(row.get("tick", 0)),
                "steamid": str(safe_val(row.get("steamid", ""))),
                "x": float(safe_val(row.get("X", 0)) or 0),
                "y": float(safe_val(row.get("Y", 0)) or 0),
                "z": float(safe_val(row.get("Z", 0)) or 0),
                "yaw": float(safe_val(row.get("yaw", 0)) or 0),
            })
        return positions
    except Exception:
        return []


def _extract_grenades(parser) -> list[dict]:
    grenades = []
    grenade_events = {
        "smokegrenade_detonate": "smoke",
        "flashbang_detonate": "flash",
        "molotov_detonate": "molotov",
        "hegrenade_detonate": "he",
    }
    for event_name, grenade_type in grenade_events.items():
        try:
            df = parser.parse_event(
                event_name,
                player=["X", "Y", "Z"],
                other=["user_steamid"],
            )
            for row in df.to_dicts():
                grenades.append({
                    "tick": safe_val(row.get("tick", 0)),
                    "type": grenade_type,
                    "steamid": str(safe_val(row.get("user_steamid", ""))),
                    "trajectory": [{"x": float(safe_val(row.get("X", 0)) or 0),
                                    "y": float(safe_val(row.get("Y", 0)) or 0),
                                    "z": float(safe_val(row.get("Z", 0)) or 0)}],
                })
        except Exception:
            continue
    return grenades


def _extract_damages(parser) -> list[dict]:
    try:
        df = parser.parse_event(
            "player_hurt",
            player=[],
            other=["attacker_steamid", "user_steamid", "dmg_health", "hitgroup"],
        )
        damages = []
        for row in df.to_dicts():
            damages.append({
                "tick": safe_val(row.get("tick", 0)),
                "attacker_steamid": str(safe_val(row.get("attacker_steamid", ""))),
                "victim_steamid": str(safe_val(row.get("user_steamid", ""))),
                "damage": float(safe_val(row.get("dmg_health", 0)) or 0),
                "hitgroup": str(safe_val(row.get("hitgroup", "body"))),
            })
        return damages
    except Exception:
        return []


def _compute_player_stats(kills: list[dict], damages: list[dict]) -> dict:
    """Compute per-player stats from kills and damage events."""
    stats: dict[str, dict] = {}

    def ensure(steamid: str):
        if steamid not in stats:
            stats[steamid] = {
                "kills": 0,
                "deaths": 0,
                "assists": 0,
                "total_damage": 0.0,
                "rounds_with_damage": set(),
                "hs_kills": 0,
                "flash_assists": 0,
            }

    for k in kills:
        a = k.get("attacker_steamid", "")
        v = k.get("victim_steamid", "")
        if a:
            ensure(a)
            stats[a]["kills"] += 1
            if k.get("headshot"):
                stats[a]["hs_kills"] += 1
        if v:
            ensure(v)
            stats[v]["deaths"] += 1

    for d in damages:
        a = d.get("attacker_steamid", "")
        if a:
            ensure(a)
            stats[a]["total_damage"] += d.get("damage", 0)

    # Compute derived metrics
    result = {}
    for steamid, s in stats.items():
        k = s["kills"]
        d = s["deaths"] or 1
        total_dmg = s["total_damage"]
        # Rough round estimate for ADR (assume ~24 rounds avg)
        estimated_rounds = max(len(damages) // max(len(stats), 1) // 10, 1)
        adr = round(total_dmg / estimated_rounds, 2)
        hs_pct = round((s["hs_kills"] / k * 100) if k > 0 else 0, 1)
        # HLTV 2.0 approximation: (KPR * 0.73 + (deaths/round) * -0.37 + impact + 0.1*adr/100)
        kpr = k / estimated_rounds
        dpr = s["deaths"] / estimated_rounds
        rating = round(max(0, (kpr * 0.73 + dpr * (-0.37) + kpr * 0.5 + 0.1 * (adr / 100) + 0.27)), 2)
        result[steamid] = {
            "kills": k,
            "deaths": s["deaths"],
            "assists": s["assists"],
            "adr": adr,
            "headshot_pct": hs_pct,
            "flash_assists": s["flash_assists"],
            "rating": rating,
        }

    return result
