#!/usr/bin/env python3
"""
Build counters from replays and upsert to database.
Per GPT Task P2.2
"""

import os
import psycopg2
from datetime import datetime

DATABASE_URL = os.environ.get('DATABASE_URL')
FORMAT_ID = os.environ.get('FORMAT_ID', 'reg-f')
MIN_RATING = int(os.environ.get('MIN_RATING', '1760'))
MIN_SAMPLE = int(os.environ.get('MIN_SAMPLE', '20'))

def get_time_bucket():
    """Get current YYYY-MM time bucket."""
    return datetime.now().strftime('%Y-%m')

def build_counters():
    """Build counters from replays for top threats."""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    time_bucket = get_time_bucket()
    print(f"Building counters for {FORMAT_ID} / {time_bucket} (min rating: {MIN_RATING})")
    
    # Get top threats (usage >= 10%)
    cur.execute("""
        SELECT pokemon FROM pokemon_usage
        WHERE format_id = %s AND time_bucket = %s AND cutoff >= 1760 AND usage_rate >= 10
        ORDER BY usage_rate DESC
        LIMIT 30
    """, (FORMAT_ID, time_bucket))
    
    threats = [row[0] for row in cur.fetchall()]
    print(f"Found {len(threats)} threats to analyze")
    
    for target in threats:
        print(f"  Processing {target}...")
        
        # Execute counter calculation query
        cur.execute("""
            WITH base AS (
              SELECT
                replay_id AS battle_id, format_id, played_at, rating_estimate,
                p1_team, p2_team, winner_side
              FROM replays
              WHERE format_id = %s
                AND rating_estimate >= %s
                AND winner_side IS NOT NULL
            ),
            target_matches AS (
              SELECT
                battle_id, format_id,
                CASE
                  WHEN p1_team ? %s THEN 'p1'
                  WHEN p2_team ? %s THEN 'p2'
                  ELSE NULL
                END AS side,
                p1_team, p2_team, 
                CASE winner_side WHEN 1 THEN 'p1' WHEN 2 THEN 'p2' END AS winner
              FROM base
              WHERE (p1_team ? %s OR p2_team ? %s)
            ),
            totals AS (
              SELECT
                COUNT(*) FILTER (WHERE winner = side) AS n_wins,
                COUNT(*) FILTER (WHERE winner <> side) AS n_losses
              FROM target_matches
            ),
            opp AS (
              SELECT DISTINCT
                tm.battle_id,
                jsonb_array_elements_text(
                  CASE WHEN tm.side='p1' THEN tm.p2_team ELSE tm.p1_team END
                ) AS answer,
                (tm.winner = tm.side) AS target_won
              FROM target_matches tm
            ),
            agg AS (
              SELECT
                answer,
                COUNT(*) FILTER (WHERE target_won) AS win_appear,
                COUNT(*) FILTER (WHERE NOT target_won) AS loss_appear
              FROM opp
              GROUP BY 1
            )
            SELECT
              a.answer,
              a.win_appear,
              a.loss_appear,
              t.n_wins,
              t.n_losses,
              (a.loss_appear::float / NULLIF(t.n_losses,0)) AS loss_appearance_rate,
              (a.win_appear::float / NULLIF(t.n_wins,0)) AS win_appearance_rate,
              ((a.loss_appear::float / NULLIF(t.n_losses,0)) - (a.win_appear::float / NULLIF(t.n_wins,0))) AS effectiveness_score
            FROM agg a
            CROSS JOIN totals t
            WHERE (a.win_appear + a.loss_appear) >= %s
            ORDER BY effectiveness_score DESC
            LIMIT 15
        """, (FORMAT_ID, MIN_RATING, target, target, target, target, MIN_SAMPLE))
        
        counters = cur.fetchall()
        
        for answer, win_appear, loss_appear, n_wins, n_losses, loss_rate, win_rate, eff_score in counters:
            if answer == target:
                continue  # Skip self
            
            cur.execute("""
                INSERT INTO counters (
                    format_id, time_bucket, cutoff, target_pokemon,
                    answer_type, answer_key,
                    effectiveness_score, loss_appearance_rate, win_appearance_rate,
                    n_wins, n_losses, answer_in_wins, answer_in_losses
                ) VALUES (%s, %s, %s, %s, 'pokemon', %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (format_id, time_bucket, target_pokemon, answer_type, answer_key)
                DO UPDATE SET
                    effectiveness_score = EXCLUDED.effectiveness_score,
                    loss_appearance_rate = EXCLUDED.loss_appearance_rate,
                    win_appearance_rate = EXCLUDED.win_appearance_rate,
                    n_wins = EXCLUDED.n_wins,
                    n_losses = EXCLUDED.n_losses,
                    answer_in_wins = EXCLUDED.answer_in_wins,
                    answer_in_losses = EXCLUDED.answer_in_losses
            """, (FORMAT_ID, time_bucket, MIN_RATING, target, answer,
                  eff_score, loss_rate, win_rate, n_wins, n_losses, win_appear, loss_appear))
        
        print(f"    -> {len(counters)} counters")
    
    conn.commit()
    print("Done!")
    
    cur.close()
    conn.close()

if __name__ == '__main__':
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not set")
        exit(1)
    build_counters()
