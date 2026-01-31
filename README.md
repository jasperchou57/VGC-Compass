# VGC Compass

> VGC decision engine with counter guides, core analysis, team archetypes, and replay evidence.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server (demo mode)
npm run dev
```

Visit http://localhost:3000

## 📦 Full Setup (with Database)

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy the connection string from Settings → Database → Connection string (URI)

### 2. One-Click Setup

```bash
# Set your database URL
export DATABASE_URL="postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"

# Run setup (creates tables + fetches initial data)
./scripts/setup.sh
```

### 3. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

### 4. Run Development Server

```bash
npm run dev
```

## Features

- **Format Hub** - Top risers, fallers, threats, and cores
- **Core Guides** - Analyze Pokémon pairings with synergy data
- **Counter Guides** - How to beat top threats with effectiveness scores
- **Archetype Guides** - Rain, Sun, Trick Room, Tailwind, Balance teams

## Project Structure

```
vgc-meta-compass/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   └── vgc/[format_id]/ # Dynamic routes
│   ├── components/          # React components
│   └── lib/                 # Utilities and types
├── database/                # SQL schema
├── scripts/                 # Data pipeline scripts
│   ├── fetch_smogon_stats.py    # Python: Smogon usage data
│   ├── fetch_replays.py         # Python: Showdown replays
│   ├── calculate-pair-synergy.ts # TS: Core calculations
│   ├── calculate-counters.ts     # TS: Counter calculations
│   └── setup.sh                  # One-click setup
├── .github/workflows/       # GitHub Actions
│   └── data-pipeline.yml    # Scheduled data updates
└── public/                  # Static assets
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_SITE_URL` | Yes | Production domain for SEO |
| `OPENAI_API_KEY` | No | For AI summary features |

## Data Pipeline

### Manual Run

```bash
./scripts/run-pipeline.sh
```

### Scheduled (GitHub Actions)

- **Smogon Stats**: 3rd of each month
- **Replays**: Weekly on Sundays

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL / Supabase
- **Deployment**: Vercel

## Data Sources

- Pokémon Showdown Usage Stats (1760+ cutoff)
- Official Tournament Replays (Rating ≥1700)

## License

MIT
