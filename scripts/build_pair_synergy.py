#!/usr/bin/env python3
"""
Build pair synergy from replays and upsert to database.
Per GPT Task P2.1
"""

import os
import psycopg2
from datetime import datetime

DATABASE_URL = os.environ.get('DATABASE_URL')
FORMAT_ID = os.environ.get('FORMAT_ID', 'reg-f')
MIN_RATING = int(os.environ.get('MIN_RATING', '1760'))

def get_time_bucket():
    """Get current YYYY-MM time bucket."""
    return datetime.now().strftime('%Y-%m')

def build_pair_synergy():
    """Build pair synergy from replays."""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    time_bucket = get_time_bucket()
    print(f"Building pair synergy for {FORMAT_ID} / {time_bucket} (min rating: {MIN_RATING})")
    
    # Execute the pair synergy aggregation query
    cur.execute("""
        WITH teams AS (
          SELECT format_id, played_at, rating_estimate, p1_team AS team
          FROM replays
          WHERE format_id = %s AND rating_estimate >= %s
          UNION ALL
          SELECT format_id, played_at, rating_estimate, p2_team AS team
          FROM replays
          WHERE format_id = %s AND rating_estimate >= %s
        ),
        mons AS (
          SELECT format_id, team, jsonb_array_elements_text(team) AS mon
          FROM teams
        ),
        pairs AS (
          SELECT
            m1.format_id,
            LEAST(m1.mon, m2.mon) AS a,
            GREATEST(m1.mon, m2.mon) AS b,
            COUNT(*) AS team_count
          FROM mons m1
          JOIN mons m2
            ON m1.format_id = m2.format_id
           AND m1.team = m2.team
           AND m1.mon < m2.mon
          GROUP BY 1,2,3
        )
        SELECT a, b, team_count FROM pairs
        WHERE team_count >= 3
        ORDER BY team_count DESC
        LIMIT 200
    """, (FORMAT_ID, MIN_RATING, FORMAT_ID, MIN_RATING))
    
    pairs = cur.fetchall()
    print(f"Found {len(pairs)} pairs")
    
    # Upsert each pair
    for pokemon_a, pokemon_b, pair_count in pairs:
        # Estimate pair rate from count
        pair_rate = min(pair_count * 2.0, 50.0)  # Rough estimate
        
        cur.execute("""
            INSERT INTO pair_synergy (
                format_id, time_bucket, cutoff, pokemon_a, pokemon_b,
                pair_rate, pair_sample_size
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (format_id, time_bucket, pokemon_a, pokemon_b)
            DO UPDATE SET
                pair_rate = EXCLUDED.pair_rate,
                pair_sample_size = EXCLUDED.pair_sample_size
        """, (FORMAT_ID, time_bucket, MIN_RATING, pokemon_a, pokemon_b, pair_rate, pair_count))
    
    conn.commit()
    print(f"Upserted {len(pairs)} pair synergy records")
    
    cur.close()
    conn.close()

if __name__ == '__main__':
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not set")
        exit(1)
    build_pair_synergy()
