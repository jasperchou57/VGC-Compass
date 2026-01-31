#!/usr/bin/env python3
"""
Smogon Stats Fetcher
Downloads and parses monthly usage data from Smogon Stats.

Usage:
    python fetch_smogon_stats.py --format gen9vgc2024regf --cutoff 1760 --month 2026-01
    
Writes to: pokemon_usage, pokemon_dim tables
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from typing import Optional
from urllib.request import urlopen, Request
from urllib.error import HTTPError

import psycopg2
from psycopg2.extras import execute_values

# Smogon Stats base URL
SMOGON_STATS_BASE = "https://www.smogon.com/stats"

# Format mapping: our format_id -> Smogon format name
FORMAT_MAP = {
    "reg-f": "gen9vgc2026regf",
    "reg-g": "gen9vgc2025regg",
    "reg-h": "gen9vgc2025regh",
}

def get_db_connection():
    """Create database connection from environment variable."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL environment variable not set")
    return psycopg2.connect(db_url)

def fetch_url(url: str) -> str:
    """Fetch URL content with proper headers."""
    req = Request(url, headers={"User-Agent": "VGCMetaCompass/1.0"})
    try:
        with urlopen(req, timeout=30) as response:
            return response.read().decode("utf-8")
    except HTTPError as e:
        print(f"HTTP Error {e.code} for {url}")
        raise

def parse_usage_file(content: str) -> list[dict]:
    """Parse Smogon usage text file into structured data."""
    pokemon_data = []
    lines = content.strip().split("\n")
    
    # Skip header lines - data lines start with | and a number
    for line in lines:
        # Format: " | 1    | Flutter Mane       | 49.73725% | ... |"
        if not line.strip().startswith("|"):
            continue
        parts = [p.strip() for p in line.split("|") if p.strip()]
        if len(parts) >= 3:
            try:
                rank = int(parts[0])
                name = parts[1].strip()
                usage_str = parts[2].replace("%", "").strip()
                usage_rate = float(usage_str)
                
                # Convert name to slug
                slug = name.lower().replace(" ", "-").replace("'", "")
                
                pokemon_data.append({
                    "rank": rank,
                    "name": name,
                    "slug": slug,
                    "usage_rate": usage_rate,
                })
            except (ValueError, IndexError):
                continue
    
    return pokemon_data

def parse_moveset_file(content: str) -> dict[str, dict]:
    """Parse Smogon moveset/chaos file for detailed Pokemon data."""
    pokemon_details = {}
    
    # Try parsing as JSON first (chaos format)
    try:
        data = json.loads(content)
        for pokemon_name, info in data.get("data", {}).items():
            slug = pokemon_name.lower().replace(" ", "-").replace("'", "")
            pokemon_details[slug] = {
                "top_moves": extract_top_items(info.get("Moves", {})),
                "top_items": extract_top_items(info.get("Items", {})),
                "top_abilities": extract_top_items(info.get("Abilities", {})),
                "top_tera": extract_top_items(info.get("Tera Types", {})),
                "top_spreads": extract_top_items(info.get("Spreads", {}), limit=5),
                "sample_size": info.get("Raw count", 0),
            }
        return pokemon_details
    except json.JSONDecodeError:
        pass
    
    # Fallback: parse text format
    # TODO: Implement text format parsing if needed
    return pokemon_details

def extract_top_items(data: dict, limit: int = 10) -> list[dict]:
    """Extract top items from usage data, sorted by percentage."""
    if not data:
        return []
    
    items = []
    total = sum(data.values())
    
    for key, count in sorted(data.items(), key=lambda x: -x[1])[:limit]:
        pct = (count / total * 100) if total > 0 else 0
        items.append({
            "key": key,
            "pct": round(pct, 2),
            "n": count,
            "rank": len(items) + 1,
        })
    
    return items

def ensure_pokemon_dim(conn, pokemon_list: list[dict]):
    """Ensure all Pokemon exist in pokemon_dim table."""
    cursor = conn.cursor()
    
    # Get existing slugs
    cursor.execute("SELECT slug FROM pokemon_dim")
    existing = {row[0] for row in cursor.fetchall()}
    
    # Insert new Pokemon
    new_pokemon = [(p["slug"], p["name"]) for p in pokemon_list if p["slug"] not in existing]
    
    if new_pokemon:
        execute_values(
            cursor,
            "INSERT INTO pokemon_dim (slug, name) VALUES %s ON CONFLICT (slug) DO NOTHING",
            new_pokemon
        )
        print(f"Added {len(new_pokemon)} new Pokemon to pokemon_dim")
    
    conn.commit()

def upsert_usage_data(conn, format_id: str, time_bucket: str, cutoff: int, 
                      usage_data: list[dict], details: dict[str, dict]):
    """Upsert usage data into pokemon_usage table."""
    cursor = conn.cursor()
    
    rows = []
    for p in usage_data:
        slug = p["slug"]
        detail = details.get(slug, {})
        
        # Create versioned JSONB wrappers
        def wrap_v1(data):
            return json.dumps({"_v": 1, "data": data})
        
        rows.append((
            format_id,
            time_bucket,
            cutoff,
            slug,
            p["usage_rate"],
            p["rank"],
            wrap_v1(detail.get("top_moves", [])),
            wrap_v1(detail.get("top_items", [])),
            wrap_v1(detail.get("top_abilities", [])),
            wrap_v1(detail.get("top_tera", [])),
            wrap_v1(detail.get("top_spreads", [])),
            detail.get("sample_size"),
        ))
    
    execute_values(
        cursor,
        """
        INSERT INTO pokemon_usage 
            (format_id, time_bucket, cutoff, pokemon, usage_rate, rank,
             top_moves, top_items, top_abilities, top_tera, top_spreads, sample_size)
        VALUES %s
        ON CONFLICT (format_id, time_bucket, cutoff, pokemon) 
        DO UPDATE SET
            usage_rate = EXCLUDED.usage_rate,
            rank = EXCLUDED.rank,
            top_moves = EXCLUDED.top_moves,
            top_items = EXCLUDED.top_items,
            top_abilities = EXCLUDED.top_abilities,
            top_tera = EXCLUDED.top_tera,
            top_spreads = EXCLUDED.top_spreads,
            sample_size = EXCLUDED.sample_size
        """,
        rows
    )
    
    conn.commit()
    print(f"Upserted {len(rows)} Pokemon usage records")

def get_latest_month() -> str:
    """Get the latest available month on Smogon Stats."""
    # Check current and previous month
    now = datetime.now()
    for offset in range(3):
        year = now.year
        month = now.month - offset
        if month <= 0:
            month += 12
            year -= 1
        
        month_str = f"{year}-{month:02d}"
        url = f"{SMOGON_STATS_BASE}/{year}-{month:02d}/"
        
        try:
            fetch_url(url)
            return month_str
        except HTTPError:
            continue
    
    raise RuntimeError("Could not find any available month on Smogon Stats")

def main():
    parser = argparse.ArgumentParser(description="Fetch Smogon Stats")
    parser.add_argument("--format", default="reg-f", help="Format ID (e.g., reg-f)")
    parser.add_argument("--cutoff", type=int, default=1760, help="Rating cutoff")
    parser.add_argument("--month", help="Month in YYYY-MM format (default: latest)")
    parser.add_argument("--dry-run", action="store_true", help="Print data without writing")
    args = parser.parse_args()
    
    # Determine month
    if args.month:
        time_bucket = args.month
    else:
        time_bucket = get_latest_month()
        print(f"Using latest month: {time_bucket}")
    
    # Get Smogon format name
    smogon_format = FORMAT_MAP.get(args.format, args.format)
    
    # Build URLs
    year_month = time_bucket.replace("-", "-")  # Already in YYYY-MM format
    usage_url = f"{SMOGON_STATS_BASE}/{year_month}/{smogon_format}-{args.cutoff}.txt"
    chaos_url = f"{SMOGON_STATS_BASE}/{year_month}/chaos/{smogon_format}-{args.cutoff}.json"
    
    print(f"Fetching usage data from: {usage_url}")
    usage_content = fetch_url(usage_url)
    usage_data = parse_usage_file(usage_content)
    print(f"Parsed {len(usage_data)} Pokemon from usage file")
    
    print(f"Fetching moveset data from: {chaos_url}")
    try:
        chaos_content = fetch_url(chaos_url)
        details = parse_moveset_file(chaos_content)
        print(f"Parsed detailed data for {len(details)} Pokemon")
    except HTTPError:
        print("Chaos file not available, using basic data only")
        details = {}
    
    if args.dry_run:
        print("\n--- DRY RUN ---")
        for p in usage_data[:10]:
            detail = details.get(p["slug"], {})
            print(f"{p['rank']:3d}. {p['name']:25s} {p['usage_rate']:6.2f}% | moves: {len(detail.get('top_moves', []))}")
        return
    
    # Write to database
    conn = get_db_connection()
    try:
        ensure_pokemon_dim(conn, usage_data)
        upsert_usage_data(conn, args.format, time_bucket, args.cutoff, usage_data, details)
        print("Done!")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
