# FRAG.GG — CS2 Match Analysis Platform

A full-stack CS2 demo analysis platform with a 2D replay viewer, per-player stats, kill heatmaps, round timeline, and AI coaching powered by Claude.

---

## Architecture

```
frag.gg/          — Next.js 14 frontend + backend API routes (port 3000)
parser/           — Python FastAPI demo parser service (port 8000)
prisma/           — SQLite database schema & migrations
public/maps/      — Radar images used by 2D viewer
```

---

## Quick Start

### 1. Prerequisites

- **Node.js 18+**
- **Python 3.10+**
- **pip**

### 2. Install Node dependencies

```bash
cd frag.gg
npm install
```

### 3. Set up environment variables

Edit `.env` and fill in your keys:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="change-me-in-production"
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY="sk-ant-..."   # Required for AI coaching
STEAM_API_KEY=""                 # Optional: for Steam auto-fetch
PARSER_SERVICE_URL="http://localhost:8000"
```

### 4. Initialize the database

```bash
npx prisma migrate dev
npx prisma generate
```

### 5. Add radar map images

Download CS2 radar images (PNG, 1024x1024) and place them in `public/maps/`:

```
public/maps/de_dust2.png
public/maps/de_mirage.png
public/maps/de_inferno.png
public/maps/de_nuke.png
public/maps/de_ancient.png
public/maps/de_anubis.png
```

Source: https://github.com/boltgolt/boltobserv — grab the files from `src/images/maps/` in that repo.
The viewer works without map images (falls back to a grid), so this step is optional for testing.

### 6. Set up the Python parser

```bash
cd parser
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 7. Start the Next.js app

In a separate terminal, from the `frag.gg/` root:

```bash
npm run dev
```

Open http://localhost:3000

---

## Testing Without a .dem File

The app ships with a full mock data mode — no demo file needed:

**Option A — Web UI:** On the home page, click **"Load sample match"**. This inserts a full mock match (Dust II, 24 rounds, 10 players) and redirects to the analysis view.

**Option B — Seed script:** Insert a persistent mock match into the database:

```bash
npx ts-node --project tsconfig.json prisma/seed.ts
```

Then navigate to http://localhost:3000/history and click the seeded match.

---

## Features

| Feature | Description |
|---|---|
| Demo Upload | Drag-and-drop .dem file with background parsing pipeline |
| 2D Replay Viewer | HTML5 Canvas top-down map with player dots, direction, grenades, kills |
| Playback Controls | Play/pause, scrubber, 0.5x/1x/2x/4x speed, round selector |
| Layer Toggles | Show/hide players, grenades, kill events, death heatmap |
| Stats Dashboard | K/D/A, ADR, HLTV rating 2.0 approx, HS%, per-team table |
| Weapon Breakdown | Horizontal bar chart of kills per weapon |
| Round Timeline | Color-coded round bars with win reason icons |
| Performance Badge | S/A/B/C/D grade per player |
| AI Coaching | 3 mistakes + 3 positives + tips + grenade score via Claude API |
| Match History | Filterable list by map, result, and date range |

---

## Map Coordinate Transforms

Each CS2 map has a world-space origin that must be translated to radar image pixel space:

```
x_pixel = (world_x - offset_x) / scale
y_pixel = (offset_y - world_y) / scale   (Y axis is flipped)
```

Configured in `lib/mapConfig.ts`. Adjust `posX`, `posY`, and `scale` per map if positions appear misaligned.

---

## Backend APIs

### Next.js API

| Method | Path | Description |
|---|---|---|
| GET | /api/health | App + DB health check |
| GET | /api/matches | Match list endpoint |
| GET | /api/matches/:id | Match viewer payload endpoint |
| POST | /api/upload | Upload demo / mock match |
| GET | /api/upload/status | Upload parse status polling |
| POST | /api/coach | AI coaching analysis |

### Python Parser API

| Method | Path | Description |
|---|---|---|
| GET | /health | Health check |
| POST | /parse | Accepts a .dem file, returns JSON |

---

## Project Structure

```
app/
  page.tsx                   — Landing + upload
  history/page.tsx           — Match history with filters
  match/[id]/page.tsx        — Server component: fetches match data
  match/[id]/MatchClientView.tsx — Client layout: viewer + sidebar
  api/upload/route.ts        — File upload + background parsing trigger
  api/upload/status/route.ts — Polling endpoint for parse status
  api/matches/route.ts       — List/delete matches
  api/matches/[id]/route.ts  — Single match fetch
  api/coach/route.ts         — Claude AI coaching analysis
components/
  MapViewer.tsx              — Canvas 2D replay viewer
  StatsPanel.tsx             — Per-player stat table + weapon chart
  AICoach.tsx                — AI coaching panel
  RoundTimeline.tsx          — Round-by-round timeline bar
  MatchCard.tsx              — Match list card
  UploadZone.tsx             — Drag-and-drop upload with progress
lib/
  prisma.ts                  — PrismaClient singleton
  mapConfig.ts               — Per-map coordinate transforms
  mockData.ts                — Mock match data generator
parser/
  main.py                    — FastAPI parser service
  requirements.txt
prisma/
  schema.prisma              — Database schema
  seed.ts                    — Mock data seed script
public/
  maps/                      — Radar images (add manually)
```

---

## Troubleshooting

**Parser not connecting:** Make sure uvicorn is running on port 8000 before uploading. The upload route returns an error if the parser is unavailable; demo status will show "error".

**Map images not showing:** The viewer falls back to a labeled grid overlay. Add PNG radar images to `public/maps/` for the full experience.

**AI coaching not working:** Set `ANTHROPIC_API_KEY` in `.env`. Without a key, the coach route returns detailed mock coaching data so the UI still works.

**Positions look offset on map:** Adjust `posX`, `posY`, and `scale` in `lib/mapConfig.ts` for the affected map.

**Database errors after schema change:** Run `npx prisma migrate dev` to apply pending migrations.
