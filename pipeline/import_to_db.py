"""
VGC Meta Compass - Database Importer
Imports JSON data files into PostgreSQL database.

Usage:
  python import_to_db.py --usage pokemon_usage_2026-01.json
  python import_to_db.py --pairs pair_synergy_2026-01.json
  python import_to_db.py --replays replays_20260129.json
"""

import argparse
import json
import os
import sys

# Check for psycopg2
try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    print("Error: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

# Load env if available
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '../.env.local'))
except ImportError:
    pass


def get_db_connection():
    """Get database connection from DATABASE_URL."""
    db_url = os.environ.get('DATABASE_URL')
    
    if not db_url or 'user:password' in db_url:
        print("Error: DATABASE_URL not configured properly.")
        print("Set a valid DATABASE_URL in .env.local")
        return None
    
    try:
        conn = psycopg2.connect(db_url)
        print("✓ Connected to database")
        return conn
    except Exception as e:
        print(f"Error connecting: {e}")
        return None


def import_usage_data(conn, filepath: str):
    """Import pokemon_usage JSON data."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if not data:
        print("No data to import")
        return
    
    cursor = conn.cursor()
    
    # Ensure pokemon_dim entries exist
    for item in data:
        cursor.execute("""
            INSERT INTO pokemon_dim (slug, name)
            VALUES (%s, %s)
            ON CONFLICT (slug) DO NOTHING
        """, (item['pokemon'], item['pokemon'].replace('-', ' ').title()))
    
    # Import usage data
    records = [
        (
            item['format_id'],
            item['time_bucket'],
            item['cutoff'],
            item['pokemon'],
            item['usage_rate'],
            item['rank'],
            json.dumps(item.get('top_moves', [])),
            json.dumps(item.get('top_items', [])),
            json.dumps(item.get('top_abilities', [])),
            json.dumps(item.get('top_tera', [])),
            json.dumps(item.get('top_spreads', [])),
            item.get('sample_size', 0)
        )
        for item in data
    ]
    
    execute_values(cursor, """
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
    """, records)
    
    conn.commit()
    print(f"✓ Imported {len(records)} usage records")


def import_pair_data(conn, filepath: str):
    """Import pair_synergy JSON data."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if not data:
        print("No data to import")
        return
    
    cursor = conn.cursor()
    
    records = [
        (
            item['format_id'],
            item['time_bucket'],
            item['cutoff'],
            item['pokemon_a'],
            item['pokemon_b'],
            item['pair_rate'],
            item.get('pair_sample_size', 0),
            json.dumps(item.get('top_third_partners', [])),
            json.dumps(item.get('top_fourth_partners', [])),
            json.dumps(item.get('common_leads', [])),
            json.dumps(item.get('sample_pastes', []))
        )
        for item in data
    ]
    
    execute_values(cursor, """
        INSERT INTO pair_synergy
        (format_id, time_bucket, cutoff, pokemon_a, pokemon_b, pair_rate,
         pair_sample_size, top_third_partners, top_fourth_partners, common_leads, sample_pastes)
        VALUES %s
        ON CONFLICT (format_id, time_bucket, cutoff, pokemon_a, pokemon_b)
        DO UPDATE SET
            pair_rate = EXCLUDED.pair_rate,
            pair_sample_size = EXCLUDED.pair_sample_size,
            top_third_partners = EXCLUDED.top_third_partners,
            top_fourth_partners = EXCLUDED.top_fourth_partners,
            common_leads = EXCLUDED.common_leads,
            sample_pastes = EXCLUDED.sample_pastes
    """, records)
    
    conn.commit()
    print(f"✓ Imported {len(records)} pair records")


def import_replay_data(conn, filepath: str):
    """Import replays JSON data."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if not data:
        print("No data to import")
        return
    
    cursor = conn.cursor()
    
    records = [
        (
            item['replay_id'],
            item['format_id'],
            item['p1_team'],
            item['p2_team'],
            item.get('winner_side'),
            item.get('rating_estimate'),
            item.get('rating_source'),
            item.get('played_at'),
            item.get('tags', [])
        )
        for item in data
    ]
    
    execute_values(cursor, """
        INSERT INTO replays
        (replay_id, format_id, p1_team, p2_team, winner_side, 
         rating_estimate, rating_source, played_at, tags)
        VALUES %s
        ON CONFLICT (replay_id) DO NOTHING
    """, records)
    
    conn.commit()
    print(f"✓ Imported {len(records)} replays")


def main():
    parser = argparse.ArgumentParser(description='Import data to VGC Meta Compass database')
    parser.add_argument('--usage', help='Path to pokemon_usage JSON file')
    parser.add_argument('--pairs', help='Path to pair_synergy JSON file')
    parser.add_argument('--replays', help='Path to replays JSON file')
    
    args = parser.parse_args()
    
    if not any([args.usage, args.pairs, args.replays]):
        parser.print_help()
        return
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        if args.usage:
            import_usage_data(conn, args.usage)
        if args.pairs:
            import_pair_data(conn, args.pairs)
        if args.replays:
            import_replay_data(conn, args.replays)
    finally:
        conn.close()
    
    print("\n✅ Import complete!")


if __name__ == "__main__":
    main()
