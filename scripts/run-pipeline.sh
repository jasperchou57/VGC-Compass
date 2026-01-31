#!/bin/bash
# Run all data pipeline scripts
# Requires: DATABASE_URL environment variable
# Python dependencies: pip install -r scripts/requirements.txt

set -e

echo "🔄 VGC Meta Compass - Data Pipeline"
echo "=================================="

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set. Please set it in .env.local or export it"
    exit 1
fi

# Optional: Install Python dependencies
if [ "$1" == "--install" ]; then
    echo "📦 Installing Python dependencies..."
    pip install -r scripts/requirements.txt
fi

echo ""
echo "📊 Step 1: Fetch Smogon Stats (Python)"
python3 scripts/fetch_smogon_stats.py --format reg-f --cutoff 1760

echo ""
echo "🎬 Step 2: Fetch Replays (Python)"
python3 scripts/fetch_replays.py --format reg-f --min-rating 1700 --limit 300

echo ""
echo "📈 Step 3: Import/Process Stats (TypeScript)"
npx tsx scripts/import-showdown-stats.ts

echo ""
echo "🔗 Step 4: Calculate Pair Synergy"
npx tsx scripts/calculate-pair-synergy.ts

echo ""
echo "🛡️ Step 5: Calculate Counters"
npx tsx scripts/calculate-counters.ts

echo ""
echo "✅ Pipeline complete!"

