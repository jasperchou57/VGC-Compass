import os
import requests
import json
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env.local'))

# Configuration
# PRD: VGC 2026 Regulation F (using 2025 Reg H as placeholder until real data available)
# Stats URL pattern: https://www.smogon.com/stats/2025-12/chaos/gen9vgc2025regh-1760.json
BASE_URL = "https://www.smogon.com/stats"
TARGET_FORMAT = "gen9vgc2025regh"  # Use available format for testing
TARGET_CUTOFF = 1760
TARGET_MONTH = "2025-12"  # Latest available month

def get_db_connection():
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("wARNING: DATABASE_URL not set. Skipping DB operations.")
        return None
    try:
        conn = psycopg2.connect(db_url)
        return conn
    except Exception as e:
        print(f"Error connecting to DB: {e}")
        return None

def fetch_chaos_json(month, format_id, cutoff):
    url = f"{BASE_URL}/{month}/chaos/{format_id}-{cutoff}.json"
    print(f"Fetching from: {url}")
    try:
        response = requests.get(url)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Failed to fetch data. Status code: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None

def process_usage_stats(data, conn, month, format_id, cutoff):
    if not conn:
        print("No DB connection, skipping DB write.")
        return

    cursor = conn.cursor()
    
    # 1. Upsert Pokemon Dimensions (Basic) and Usage
    # Using 'info' and 'usage' keys from chaos json
    
    total_battles = data.get('info', {}).get('number of battles', 0)
    print(f"Total battles: {total_battles}")
    
    usage_data = data.get('data', {})
    
    batch_usage = []
    
    for pokemon_name, stats in usage_data.items():
        # Clean slug
        slug = pokemon_name.lower().replace(' ', '-').replace('.', '').replace("'", "")
        
        # Calculate Usage Rate
        # Chaos data 'usage' is raw count usually? Or normalized?
        # Standard chaos json structure: "data": { "Pokemon": { "Usage": 0.123, ... } }
        # Check Smogon Chaos format:
        # "data": { "Flutter Mane": { "Viability Ceiling": [..], "Abilities": {..}, "Items": {..}, "Moves": {..}, "Spreads": {..}, "Teammates": {..}, "Checks and Counters": {..}, "Usage": 0.55 } }
        
        raw_usage = stats.get('Usage', 0)
        # Usage in chaos is typically a fraction (0.55 = 55%)
        usage_rate = raw_usage * 100
        
        # Prepare JSON fields
        top_moves = json.dumps(stats.get('Moves', {}))
        top_items = json.dumps(stats.get('Items', {}))
        top_abilities = json.dumps(stats.get('Abilities', {}))
        top_tera = json.dumps(stats.get('Tera Types', {})) # Using Tera Types if available
        top_spreads = json.dumps(stats.get('Spreads', {}))
        
        # Insert DIM if not exists (Simplified for MVP, ideally detailed data comes from PokeAPI or static file)
        # We perform a safe upsert on dim
        cursor.execute("""
            INSERT INTO pokemon_dim (slug, name) 
            VALUES (%s, %s) 
            ON CONFLICT (slug) DO NOTHING
        """, (slug, pokemon_name))
        
        # Add to batch for Usage
        batch_usage.append((
            format_id, month, cutoff, slug,
            usage_rate,
            top_moves, top_items, top_abilities, top_tera, top_spreads,
            int(total_battles * raw_usage) # Est sample size
        ))
        
        # Process Synergies (Teammates)
        teammates = stats.get('Teammates', {})
        process_synergies(cursor, slug, teammates, format_id, month, cutoff)

    # Bulk Insert Usage
    if batch_usage:
        execute_values(cursor, """
            INSERT INTO pokemon_usage 
            (format_id, time_bucket, cutoff, pokemon, usage_rate, top_moves, top_items, top_abilities, top_tera, top_spreads, sample_size)
            VALUES %s
            ON CONFLICT (format_id, time_bucket, cutoff, pokemon) 
            DO UPDATE SET 
                usage_rate = EXCLUDED.usage_rate,
                top_moves = EXCLUDED.top_moves,
                top_items = EXCLUDED.top_items,
                top_abilities = EXCLUDED.top_abilities,
                top_tera = EXCLUDED.top_tera,
                top_spreads = EXCLUDED.top_spreads,
                sample_size = EXCLUDED.sample_size
        """, batch_usage)
        print(f"Upserted {len(batch_usage)} usage records.")

    conn.commit()

def process_synergies(cursor, pokemon_slug, teammates_data, format_id, month, cutoff):
    # teammates_data is { "Teammate": fraction, ... }
    # e.g., { "Incineroar": 0.35, ... }
    
    for partner_name, fraction in teammates_data.items():
        partner_slug = partner_name.lower().replace(' ', '-').replace('.', '').replace("'", "")
        
        # PRD: Canonical Pair = Alphabetical order
        if pokemon_slug < partner_slug:
            p_a, p_b = pokemon_slug, partner_slug
        else:
            p_a, p_b = partner_slug, pokemon_slug
            
        # We need to calculate 'pair_rate'.
        # 'fraction' in Teammates is P(Partner | Pokemon).
        # Pair Rate usually means P(A and B).
        # We might need the usage of the Pokemon to calculate Intersection.
        # But for now, let's store what we have or defer.
        # Actually, for "Core" page, we want the synergy score.
        # Strict PRD doesn't define formula for 'pair_rate' explicitly here but presumably it's usage of the pair.
        
        # For MVP, we can treat the 'fraction' as a proxy for synergy if we lack full intersection data.
        # OR better: skip detailed calculation in this pass and do it in a second pass if we needed strict P(A ^ B).
        
        # Let's insert into pair_synergy
        # We'll need to aggregate because A->B and B->A give duplicates if we iterate all.
        # But since we enforced A < B check, we can upsert.
        # Wait, A->B data might differ slightly from B->A data in Smogon samples due to rounding?
        # Typically they should be consistent.
        
        # Simplified: We just update the record. 
        # Ideally we collect all and average, but usually Usage(A)*Teammate(B|A) ~= Usage(B)*Teammate(A|B)
        pass 
        # TODO: Implement full pair ingestion. requires accessing the usage map globaly.

def main():
    print(f"Starting import for {TARGET_FORMAT} [{TARGET_MONTH}] cutoff {TARGET_CUTOFF}...")
    
    # 1. Fetch Data
    data = fetch_chaos_json(TARGET_MONTH, TARGET_FORMAT, TARGET_CUTOFF)
    
    if not data:
        print("No data found. Exiting.")
        return

    # 2. Connect DB
    conn = get_db_connection()
    
    # 3. Process
    process_usage_stats(data, conn, TARGET_MONTH, TARGET_FORMAT, TARGET_CUTOFF)

    if conn:
        conn.close()
    print("Done.")

if __name__ == "__main__":
    main()
