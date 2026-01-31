-- Stats from Smogon are typically lowercase, but names can be mixed case. 
-- We prefer slug-based primary keys where possible or autoincrement IDs.

-- 1. Pokemon Dimension (Static Data)
CREATE TABLE IF NOT EXISTS pokemon_dim (
    slug VARCHAR(50) PRIMARY KEY,        -- 'urshifu-rapid-strike'
    name VARCHAR(100) NOT NULL,           -- 'Urshifu-Rapid-Strike'
    base_species_slug VARCHAR(50),        -- 'urshifu'
    form_slug VARCHAR(50),                -- 'rapid-strike'
    type1 VARCHAR(20),
    type2 VARCHAR(20),
    base_hp INT,
    base_atk INT,
    base_def INT,
    base_spa INT,
    base_spd INT,
    base_spe INT                          -- Important for Archetype Logic
);

-- 2. Pokemon Usage (Smogon Data)
CREATE TABLE IF NOT EXISTS pokemon_usage (
    id SERIAL PRIMARY KEY,
    format_id VARCHAR(20) NOT NULL,       -- 'reg-f'
    time_bucket VARCHAR(10) NOT NULL,     -- '2026-01'
    cutoff INT NOT NULL,                  -- 1760
    pokemon VARCHAR(50) REFERENCES pokemon_dim(slug),
    usage_rate DECIMAL(5,2),
    rank INT,
    top_moves JSONB,                      -- Store as JSON for flexibility
    top_items JSONB,
    top_abilities JSONB,
    top_tera JSONB,
    top_spreads JSONB,
    sample_size INT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(format_id, time_bucket, cutoff, pokemon)
);

-- 3. Pair Synergy (Core Analysis)
CREATE TABLE IF NOT EXISTS pair_synergy (
    id SERIAL PRIMARY KEY,
    format_id VARCHAR(20) NOT NULL,
    time_bucket VARCHAR(10) NOT NULL,
    cutoff INT NOT NULL,
    pokemon_a VARCHAR(50) REFERENCES pokemon_dim(slug),
    pokemon_b VARCHAR(50) REFERENCES pokemon_dim(slug),
    pair_rate DECIMAL(5,2),
    pair_sample_size INT,
    top_third_partners JSONB,
    top_fourth_partners JSONB,
    common_leads JSONB,
    sample_pastes JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(format_id, time_bucket, cutoff, pokemon_a, pokemon_b),
    CHECK (pokemon_a < pokemon_b)         -- Enforce Alphabetical Order
);

-- 4. Counters (Matchup Data)
CREATE TABLE IF NOT EXISTS counters (
    id SERIAL PRIMARY KEY,
    format_id VARCHAR(20) NOT NULL,
    time_bucket VARCHAR(10) NOT NULL,
    cutoff INT NOT NULL,
    target_pokemon VARCHAR(50) REFERENCES pokemon_dim(slug),
    answer_type VARCHAR(20) NOT NULL,     -- 'mechanic', 'pokemon', 'archetype'
    answer_key VARCHAR(100) NOT NULL,
    effectiveness_score DECIMAL(5,2),
    loss_appearance_rate DECIMAL(5,2),
    win_appearance_rate DECIMAL(5,2),
    n_losses INT,
    n_wins INT,
    evidence_replays JSONB,
    suggested_moves JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Replays (Evidence)
CREATE TABLE IF NOT EXISTS replays (
    replay_id VARCHAR(50) PRIMARY KEY,
    format_id VARCHAR(20) NOT NULL,
    rating_estimate INT,                  -- NULL if not provided by source
    rating_source VARCHAR(20),            -- 'official' or NULL
    played_at TIMESTAMP,
    p1_team JSONB NOT NULL,               -- Array of slugs
    p2_team JSONB NOT NULL,
    winner_side INT,                      -- 1 or 2
    tags JSONB,                           -- ["rain", "trick-room", etc.]
    featured_cores JSONB,                 -- [["incineroar", "rillaboom"]]
    indexed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replays_format_rating ON replays(format_id, rating_estimate DESC);
CREATE INDEX IF NOT EXISTS idx_replays_tags ON replays USING GIN(tags);

-- 6. Archetypes (Meta-Teams)
CREATE TABLE IF NOT EXISTS archetypes (
    id SERIAL PRIMARY KEY,
    format_id VARCHAR(20) NOT NULL,
    time_bucket VARCHAR(10) NOT NULL,
    archetype_slug VARCHAR(50) NOT NULL,  -- 'rain', 'sun', etc.
    name VARCHAR(100) NOT NULL,
    description TEXT,
    key_pokemon JSONB,
    flex_pokemon JSONB,
    strengths JSONB,
    weaknesses JSONB,
    usage_estimate DECIMAL(5,2),
    sample_pastes JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(format_id, time_bucket, archetype_slug)
);
