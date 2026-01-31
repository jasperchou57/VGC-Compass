#!/bin/bash
# VGC Meta Compass - Quick Setup Script
# Run this after creating your Supabase project

set -e

echo "🚀 VGC Meta Compass - Setup"
echo "==========================="
echo ""

# Check for required tools
command -v psql >/dev/null 2>&1 || { echo "❌ psql required but not installed. Install PostgreSQL client first."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ python3 required but not installed."; exit 1; }

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set."
    echo ""
    echo "Please set it first:"
    echo "  export DATABASE_URL=\"postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres\""
    exit 1
fi

echo "✅ DATABASE_URL detected"
echo ""

# Step 1: Run schema
echo "📦 Step 1: Creating database schema..."
psql "$DATABASE_URL" -f database/schema.sql
echo "✅ Schema created"
echo ""

# Step 2: Install Python deps
echo "📦 Step 2: Installing Python dependencies..."
pip3 install -r scripts/requirements.txt --quiet
echo "✅ Dependencies installed"
echo ""

# Step 3: Fetch initial data
echo "📊 Step 3: Fetching Smogon stats (this may take a minute)..."
python3 scripts/fetch_smogon_stats.py --format reg-f --cutoff 1760

echo ""
echo "🎬 Step 4: Fetching replays (limited to 100 for quick setup)..."
python3 scripts/fetch_replays.py --format reg-f --min-rating 1700 --limit 100

echo ""
echo "🔗 Step 5: Calculating pair synergy..."
npx tsx scripts/calculate-pair-synergy.ts

echo ""
echo "🛡️ Step 6: Calculating counters..."
npx tsx scripts/calculate-counters.ts

echo ""
echo "========================================="
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Copy .env.example to .env.local"
echo "  2. Update NEXT_PUBLIC_SITE_URL"
echo "  3. Run: npm run dev"
echo "  4. Deploy to Vercel when ready"
echo "========================================="
