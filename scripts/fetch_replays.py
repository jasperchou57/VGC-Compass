#!/usr/bin/env python3
"""
Showdown Replay Fetcher
Fetches replays from Pokemon Showdown and extracts team data.

Usage:
    python fetch_replays.py --format gen9vgc2024regf --min-rating 1700 --limit 500
    
Writes to: replays table
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime
from typing import Optional
from urllib.request import urlopen, Request
from urllib.error import HTTPError

import psycopg2
from psycopg2.extras import execute_values

# Showdown API endpoints
SHOWDOWN_REPLAY_SEARCH = "https://replay.pokemonshowdown.com/search.json"
SHOWDOWN_REPLAY_BASE = "https://replay.pokemonshowdown.com"

# Format mapping
FORMAT_MAP = {
    "reg-f": "gen9vgc2024regf",
    "reg-g": "gen9vgc2024regg",
    "reg-h": "gen9vgc2024regh",
}

def get_db_connection():
    """Create database connection from environment variable."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL environment variable not set")
    return psycopg2.connect(db_url)

def fetch_url(url: str, retries: int = 3) -> str:
    """Fetch URL content with retries."""
    req = Request(url, headers={"User-Agent": "VGCMetaCompass/1.0"})
    
    for attempt in range(retries):
        try:
            with urlopen(req, timeout=30) as response:
                return response.read().decode("utf-8")
        except HTTPError as e:
            if e.code == 404:
                raise
            if attempt < retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
                continue
            raise
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise
    
    raise RuntimeError(f"Failed to fetch {url} after {retries} retries")

def search_replays(format_name: str, page: int = 1) -> list[dict]:
    """Search for replays of a specific format."""
    url = f"{SHOWDOWN_REPLAY_SEARCH}?format={format_name}&page={page}"
    
    try:
        content = fetch_url(url)
        data = json.loads(content)
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, HTTPError):
        return []

def fetch_replay_data(replay_id: str) -> Optional[dict]:
    """Fetch detailed replay data."""
    url = f"{SHOWDOWN_REPLAY_BASE}/{replay_id}.json"
    
    try:
        content = fetch_url(url)
        return json.loads(content)
    except (json.JSONDecodeError, HTTPError):
        return None

def extract_team_from_log(log: str, player: int) -> list[str]:
    """Extract team Pokemon from replay log."""
    team = []
    player_prefix = f"|poke|p{player}|"
    
    for line in log.split("\n"):
        if line.startswith(player_prefix):
            # Format: |poke|p1|Pokemon, F|item
            parts = line.split("|")
            if len(parts) >= 4:
                pokemon_part = parts[3]
                # Remove gender and item info
                pokemon_name = pokemon_part.split(",")[0].strip()
                slug = slugify(pokemon_name)
                if slug and slug not in team:
                    team.append(slug)
    
    return team[:6]  # Max 6 Pokemon per team

def extract_winner(log: str) -> Optional[int]:
    """Extract winner side from replay log."""
    for line in log.split("\n"):
        if line.startswith("|win|"):
            winner_name = line.split("|")[2]
            # Check if winner is p1 or p2
            for check_line in log.split("\n"):
                if check_line.startswith("|player|p1|") and winner_name in check_line:
                    return 1
                if check_line.startswith("|player|p2|") and winner_name in check_line:
                    return 2
    return None

def estimate_rating(replay_data: dict) -> tuple[Optional[int], str]:
    """Estimate rating from replay data."""
    # Try official rating first
    rating = replay_data.get("rating")
    if rating and isinstance(rating, (int, float)) and rating > 1000:
        return int(rating), "official"
    
    # Try to extract from player info
    p1_rating = replay_data.get("p1rating", {}).get("elo")
    p2_rating = replay_data.get("p2rating", {}).get("elo")
    
    if p1_rating and p2_rating:
        avg_rating = (p1_rating + p2_rating) / 2
        return int(avg_rating), "estimated"
    
    if p1_rating:
        return int(p1_rating), "estimated"
    if p2_rating:
        return int(p2_rating), "estimated"
    
    return None, "unknown"

def slugify(name: str) -> str:
    """Convert Pokemon name to slug."""
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9\-]", "", slug.replace(" ", "-").replace("'", ""))
    
    # Handle common form names
    form_mappings = {
        "urshifu-rapid-strike-style": "urshifu-rapid-strike",
        "urshifu-single-strike-style": "urshifu-single-strike",
        "landorus-therian-forme": "landorus-therian",
        "tornadus-incarnate-forme": "tornadus",
        "indeedee-f": "indeedee-f",
    }
    
    for pattern, replacement in form_mappings.items():
        if pattern in slug:
            slug = replacement
            break
    
    return slug

def identify_featured_cores(team1: list[str], team2: list[str]) -> list[str]:
    """Identify notable cores present in the teams."""
    known_cores = [
        ("incineroar", "rillaboom"),
        ("flutter-mane", "incineroar"),
        ("pelipper", "urshifu-rapid-strike"),
        ("chien-pao", "flutter-mane"),
        ("iron-hands", "tornadus"),
        ("torkoal", "venusaur"),
        ("pelipper", "kingdra"),
        ("indeedee-f", "hatterene"),
    ]
    
    featured = []
    for team in [team1, team2]:
        team_set = set(team)
        for a, b in known_cores:
            if a in team_set and b in team_set:
                core_key = f"{min(a, b)}-{max(a, b)}"
                if core_key not in featured:
                    featured.append(core_key)
    
    return featured

def identify_tags(team1: list[str], team2: list[str], log: str) -> list[str]:
    """Identify archetype tags from teams."""
    tags = []
    all_pokemon = set(team1 + team2)
    
    # Rain
    if "pelipper" in all_pokemon or "politoed" in all_pokemon:
        tags.append("rain")
    
    # Sun
    if "torkoal" in all_pokemon or "koraidon" in all_pokemon:
        tags.append("sun")
    
    # Trick Room
    trick_room_setters = {"hatterene", "dusclops", "porygon2", "gothitelle", "farigiraf", "oranguru"}
    if any(p in all_pokemon for p in trick_room_setters):
        tags.append("trick-room")
    
    # Tailwind
    tailwind_users = {"tornadus", "whimsicott", "murkrow", "talonflame"}
    if any(p in all_pokemon for p in tailwind_users):
        tags.append("tailwind")
    
    return tags

def upsert_replays(conn, format_id: str, replays: list[dict]):
    """Upsert replay data to database."""
    cursor = conn.cursor()
    
    rows = []
    for r in replays:
        rows.append((
            r["replay_id"],
            format_id,
            r.get("rating"),
            r.get("rating_source"),
            r.get("played_at"),
            json.dumps(r["p1_team"]),
            json.dumps(r["p2_team"]),
            r.get("winner_side"),
            json.dumps(r.get("tags", [])),
            json.dumps(r.get("featured_cores", [])),
        ))
    
    execute_values(
        cursor,
        """
        INSERT INTO replays 
            (replay_id, format_id, rating_estimate, rating_source, played_at,
             p1_team, p2_team, winner_side, tags, featured_cores)
        VALUES %s
        ON CONFLICT (replay_id) DO UPDATE SET
            rating_estimate = EXCLUDED.rating_estimate,
            rating_source = EXCLUDED.rating_source,
            tags = EXCLUDED.tags,
            featured_cores = EXCLUDED.featured_cores
        """,
        rows
    )
    
    conn.commit()
    print(f"Upserted {len(rows)} replays")

def main():
    parser = argparse.ArgumentParser(description="Fetch Showdown Replays")
    parser.add_argument("--format", default="reg-f", help="Format ID (e.g., reg-f)")
    parser.add_argument("--min-rating", type=int, default=1700, help="Minimum rating filter")
    parser.add_argument("--limit", type=int, default=500, help="Maximum replays to fetch")
    parser.add_argument("--dry-run", action="store_true", help="Print data without writing")
    args = parser.parse_args()
    
    # Get Showdown format name
    showdown_format = FORMAT_MAP.get(args.format, args.format)
    
    print(f"Searching replays for format: {showdown_format}")
    
    all_replays = []
    page = 1
    
    while len(all_replays) < args.limit:
        print(f"  Page {page}...")
        search_results = search_replays(showdown_format, page)
        
        if not search_results:
            print("  No more results")
            break
        
        for result in search_results:
            if len(all_replays) >= args.limit:
                break
            
            replay_id = result.get("id")
            if not replay_id:
                continue
            
            # Fetch full replay data
            print(f"    Fetching {replay_id}...", end=" ")
            replay_data = fetch_replay_data(replay_id)
            
            if not replay_data:
                print("failed")
                continue
            
            # Extract data
            log = replay_data.get("log", "")
            p1_team = extract_team_from_log(log, 1)
            p2_team = extract_team_from_log(log, 2)
            rating, rating_source = estimate_rating(replay_data)
            winner = extract_winner(log)
            
            # Filter by rating
            if rating and rating < args.min_rating:
                print(f"low rating ({rating})")
                continue
            
            # Parse timestamp
            upload_time = replay_data.get("uploadtime")
            played_at = None
            if upload_time:
                try:
                    played_at = datetime.fromtimestamp(upload_time)
                except (ValueError, TypeError):
                    pass
            
            replay_record = {
                "replay_id": replay_id,
                "rating": rating,
                "rating_source": rating_source,
                "played_at": played_at,
                "p1_team": p1_team,
                "p2_team": p2_team,
                "winner_side": winner,
                "tags": identify_tags(p1_team, p2_team, log),
                "featured_cores": identify_featured_cores(p1_team, p2_team),
            }
            
            all_replays.append(replay_record)
            print(f"OK (rating: {rating}, {len(p1_team)}v{len(p2_team)})")
            
            # Rate limiting
            time.sleep(0.5)
        
        page += 1
        time.sleep(1)
    
    print(f"\nFetched {len(all_replays)} replays")
    
    if args.dry_run:
        print("\n--- DRY RUN ---")
        for r in all_replays[:5]:
            print(f"  {r['replay_id']}: {r['rating']} ({r['rating_source']}) | {r['p1_team']}")
        return
    
    # Write to database
    conn = get_db_connection()
    try:
        upsert_replays(conn, args.format, all_replays)
        print("Done!")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
