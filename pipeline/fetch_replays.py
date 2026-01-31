import os
import requests
import psycopg2
from psycopg2.extras import execute_values
import json
import time
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env.local'))

# Strict PRD Rules (Appendix D):
# Replays: Public rated; format=reg-f; rating>=1700; No Move Parsing.
# Rating Source: Official Only (or NULL). 

REPLAY_LIST_URL = "https://replay.pokemonshowdown.com/api/replays"
REPLAY_DATA_URL = "https://replay.pokemonshowdown.com/{id}.json"
TARGET_FORMAT = "gen9vgc2026regf" # PRD Target
RATING_THRESHOLD = 1700

def get_db_connection():
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("wARNING: DATABASE_URL not set.")
        return None
    try:
        conn = psycopg2.connect(db_url)
        return conn
    except Exception as e:
        print(f"Error connecting to DB: {e}")
        return None

def fetch_recent_replays(format_id):
    # Fetch list of recent-replays
    params = {
        'format': format_id,
        'page': 1 # MVP: Just fetch page 1 for now, loop later
    }
    try:
        resp = requests.get(REPLAY_LIST_URL, params=params)
        if resp.status_code == 200:
            return resp.json() # List of replay objects
        return []
    except Exception as e:
        print(f"Error fetching list: {e}")
        return []

def fetch_replay_details(replay_id):
    url = REPLAY_DATA_URL.format(id=replay_id)
    try:
        resp = requests.get(url)
        if resp.status_code == 200:
            return resp.json()
        return None
    except Exception as e:
        print(f"Error fetching detail {replay_id}: {e}")
        return None

def parse_teams_and_rating(log_text):
    # Very basic parsing for MVP.
    # In a real log: 
    # |player|p1|Player One|Avatar|1750
    # |player|p2|Player Two|Avatar|1780
    
    # We need to extract the rating if available.
    p1_rating = None
    p2_rating = None
    
    # Simple line iteration
    for line in log_text.split('\n'):
        parts = line.split('|')
        if len(parts) >= 6 and parts[1] == 'player':
            # |player|p1|name|avatar|rating
            side = parts[2]
            rating_str = parts[5] if len(parts) > 5 else None
            if rating_str and rating_str.isdigit():
                if side == 'p1':
                    p1_rating = int(rating_str)
                elif side == 'p2':
                    p2_rating = int(rating_str)
                    
    # The actual rating of the match is usually the average or the min?
    # PRD says "rating>=1700". Usually this implies the average or the lowest player?
    # Let's take the AVERAGE of the two players as the 'match rating'
    
    if p1_rating and p2_rating:
        avg = (p1_rating + p2_rating) // 2
        return avg
    elif p1_rating:
        return p1_rating
    elif p2_rating:
        return p2_rating
    
    return None

def parse_pokemon(log_text):
    # Extract teams from |poke|p1|Pokemon,... lines
    p1_team = []
    p2_team = []
    
    for line in log_text.split('\n'):
        parts = line.split('|')
        if len(parts) >= 4 and parts[1] == 'poke':
            # |poke|p1|Flutter Mane, L50|item
            side = parts[2]
            poke_str = parts[3].split(',')[0] # Remove ", L50"
            slug = poke_str.lower().replace(' ', '-').replace('.', '').replace("'", "")
            
            if side == 'p1':
                p1_team.append(slug)
            elif side == 'p2':
                p2_team.append(slug)
                
    return p1_team, p2_team

def process_replays(conn, format_id):
    replays_list = fetch_recent_replays(format_id)
    print(f"Found {len(replays_list)} recent replays.")
    
    cursor = conn.cursor()
    batch_replays = []
    
    for r in replays_list:
        rid = r.get('id')
        # Check if already indexed
        cursor.execute("SELECT 1 FROM replays WHERE replay_id = %s", (rid,))
        if cursor.fetchone():
            continue
            
        details = fetch_replay_details(rid)
        if not details:
            continue
            
        log = details.get('log', '')
        rating = parse_teams_and_rating(log)
        
        # FILTER: Rating >= 1700 (Appendix D)
        if rating is None or rating < RATING_THRESHOLD:
            # Skip
            continue
            
        p1_team, p2_team = parse_pokemon(log)
        
        # Store
        batch_replays.append((
            rid, format_id, rating, 'official',
            datetime.fromtimestamp(details.get('uploadtime', time.time())),
            json.dumps(p1_team),
            json.dumps(p2_team),
            None, # Winner side parsing requires more log logic, skipping for skeleton
            json.dumps([]), # Tags
            json.dumps([]) # Featured cores
        ))
        
    if batch_replays:
        execute_values(cursor, """
            INSERT INTO replays 
            (replay_id, format_id, rating_estimate, rating_source, played_at, p1_team, p2_team, winner_side, tags, featured_cores)
            VALUES %s
        """, batch_replays)
        conn.commit()
    
    print(f"Inserted {len(batch_replays)} valid replays.")

def main():
    conn = get_db_connection()
    if conn:
        process_replays(conn, TARGET_FORMAT)
        conn.close()

if __name__ == "__main__":
    main()
