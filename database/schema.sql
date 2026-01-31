-- ============================================================
-- VGC Meta Compass - Database Schema
-- Version: 2.0 (Versioned JSONB Contracts)
-- PostgreSQL / Supabase
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Dimension Table: Pokemon
-- ============================================================
CREATE TABLE IF NOT EXISTS pokemon_dim (
    slug VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    base_species_slug VARCHAR(100),
    form_slug VARCHAR(100),
    type1 VARCHAR(20),
    type2 VARCHAR(20),
    base_hp INTEGER NOT NULL DEFAULT 0,
    base_atk INTEGER NOT NULL DEFAULT 0,
    base_def INTEGER NOT NULL DEFAULT 0,
    base_spa INTEGER NOT NULL DEFAULT 0,
    base_spd INTEGER NOT NULL DEFAULT 0,
    base_spe INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- Pokemon Usage Stats (monthly snapshots)
-- ============================================================
CREATE TABLE IF NOT EXISTS pokemon_usage (
    id SERIAL PRIMARY KEY,
    format_id VARCHAR(50) NOT NULL,
    time_bucket VARCHAR(7) NOT NULL, -- 'YYYY-MM'
    cutoff INTEGER NOT NULL DEFAULT 1760,
    pokemon VARCHAR(100) NOT NULL REFERENCES pokemon_dim(slug),
    usage_rate DECIMAL(5, 2) NOT NULL,
    rank INTEGER,
    -- JSONB fields use VersionedWrapper<RankedPctList@v1>
    -- Contract: { "_v": 1, "_source": "smogon", "_format_id": "...", "_time_bucket": "...", "_cutoff": 1760, "data": [...] }
    top_moves JSONB DEFAULT '{"_v":1,"data":[]}'::jsonb,
    top_items JSONB DEFAULT '{"_v":1,"data":[]}'::jsonb,
    top_abilities JSONB DEFAULT '{"_v":1,"data":[]}'::jsonb,
    top_tera JSONB DEFAULT '{"_v":1,"data":[]}'::jsonb,
    top_spreads JSONB DEFAULT '{"_v":1,"data":[]}'::jsonb,
    sample_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(format_id, time_bucket, cutoff, pokemon)
);

COMMENT ON COLUMN pokemon_usage.top_moves IS 'RankedPctList@v1: { "_v": 1, "data": [{ "key": "...", "pct": 62.31, "n": 5123, "rank": 1 }] }';
COMMENT ON COLUMN pokemon_usage.top_items IS 'RankedPctList@v1';
COMMENT ON COLUMN pokemon_usage.top_abilities IS 'RankedPctList@v1';
COMMENT ON COLUMN pokemon_usage.top_tera IS 'RankedPctList@v1';
COMMENT ON COLUMN pokemon_usage.top_spreads IS 'RankedPctList@v1';

CREATE INDEX IF NOT EXISTS idx_usage_format_time ON pokemon_usage(format_id, time_bucket);
CREATE INDEX IF NOT EXISTS idx_usage_pokemon ON pokemon_usage(pokemon);

-- ============================================================
-- Pair Synergy (Core data)
-- ============================================================
CREATE TABLE IF NOT EXISTS pair_synergy (
    id SERIAL PRIMARY KEY,
    format_id VARCHAR(50) NOT NULL,
    time_bucket VARCHAR(7) NOT NULL,
    cutoff INTEGER NOT NULL DEFAULT 1760,
    pokemon_a VARCHAR(100) NOT NULL REFERENCES pokemon_dim(slug),
    pokemon_b VARCHAR(100) NOT NULL REFERENCES pokemon_dim(slug),
    -- pair_rate is now explicitly pair_team_rate (team-based)
    pair_rate DECIMAL(5, 2) NOT NULL,
    pair_sample_size INTEGER NOT NULL,     -- Teams containing both A and B
    battle_sample_size INTEGER,            -- Battles containing both A and B (for leads/replays)
    -- JSONB fields use versioned contracts
    top_third_partners JSONB DEFAULT '{"_v":1,"data":[]}'::jsonb,  -- PartnerList@v1
    top_fourth_partners JSONB DEFAULT '{"_v":1,"data":[]}'::jsonb, -- PartnerList@v1
    common_leads JSONB DEFAULT '{"_v":1,"data":[]}'::jsonb,        -- LeadList@v1
    sample_pastes JSONB DEFAULT '{"_v":1,"data":[]}'::jsonb,       -- PasteBundle@v1
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(format_id, time_bucket, cutoff, pokemon_a, pokemon_b),
    CONSTRAINT pair_order CHECK (pokemon_a < pokemon_b)
);

COMMENT ON COLUMN pair_synergy.pair_rate IS 'pair_team_rate: teams containing both A and B / total teams';
COMMENT ON COLUMN pair_synergy.pair_sample_size IS 'Number of teams containing both A and B';
COMMENT ON COLUMN pair_synergy.battle_sample_size IS 'Number of battles containing both A and B';
COMMENT ON COLUMN pair_synergy.top_third_partners IS 'PartnerList@v1: { "_v": 1, "data": [{ "pokemon": "...", "pct": 25.7, "n": 813, "rank": 1, "ci": [24.2, 27.3] }] }';
COMMENT ON COLUMN pair_synergy.common_leads IS 'LeadList@v1: { "_v": 1, "data": [{ "lead": ["a", "b"], "pct": 15.2, "n": 482, "rank": 1 }] }';
COMMENT ON COLUMN pair_synergy.sample_pastes IS 'PasteBundle@v1';

CREATE INDEX IF NOT EXISTS idx_synergy_pair ON pair_synergy(pokemon_a, pokemon_b);
CREATE INDEX IF NOT EXISTS idx_synergy_format_time ON pair_synergy(format_id, time_bucket);

-- ============================================================
-- Counter Data
-- ============================================================
CREATE TABLE IF NOT EXISTS counters (
    id SERIAL PRIMARY KEY,
    format_id VARCHAR(50) NOT NULL,
    time_bucket VARCHAR(7) NOT NULL,
    cutoff INTEGER NOT NULL DEFAULT 1760,
    target_pokemon VARCHAR(100) NOT NULL REFERENCES pokemon_dim(slug),
    answer_type VARCHAR(20) NOT NULL CHECK (answer_type IN ('pokemon', 'mechanic', 'archetype')),
    answer_key VARCHAR(100) NOT NULL,
    -- Effectiveness calculation
    effectiveness_score DECIMAL(5, 2),     -- loss_appearance_rate - win_appearance_rate
    loss_appearance_rate DECIMAL(5, 2),    -- % of losses where answer appeared
    win_appearance_rate DECIMAL(5, 2),     -- % of wins where answer appeared
    n_losses INTEGER,                      -- Total battles where target lost
    n_wins INTEGER,                        -- Total battles where target won
    -- Transparency fields (new in v2)
    answer_in_losses INTEGER,              -- Battles where answer appeared in target's losses
    answer_in_wins INTEGER,                -- Battles where answer appeared in target's wins
    -- Evidence
    evidence_replays JSONB DEFAULT '{"_v":1,"data":[]}'::jsonb, -- ReplayRefList@v1
    suggested_moves TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(format_id, time_bucket, target_pokemon, answer_type, answer_key)
);

COMMENT ON COLUMN counters.effectiveness_score IS 'loss_appearance_rate - win_appearance_rate. Positive = effective counter.';
COMMENT ON COLUMN counters.loss_appearance_rate IS 'Denominator: n_losses. Numerator: answer_in_losses.';
COMMENT ON COLUMN counters.win_appearance_rate IS 'Denominator: n_wins. Numerator: answer_in_wins.';
COMMENT ON COLUMN counters.evidence_replays IS 'ReplayRefList@v1: { "_v": 1, "data": [{ "replay_id": "...", "played_at": "...", "rating": 1900, "rating_source": "official" }] }';

CREATE INDEX IF NOT EXISTS idx_counters_target ON counters(target_pokemon);
CREATE INDEX IF NOT EXISTS idx_counters_format_time ON counters(format_id, time_bucket);

-- ============================================================
-- Replays
-- ============================================================
CREATE TABLE IF NOT EXISTS replays (
    replay_id VARCHAR(100) PRIMARY KEY,
    format_id VARCHAR(50) NOT NULL,
    rating_estimate INTEGER,
    rating_source VARCHAR(20) CHECK (rating_source IN ('official', 'estimated', 'unknown')),
    played_at TIMESTAMP WITH TIME ZONE,
    p1_team JSONB NOT NULL,
    p2_team JSONB NOT NULL,
    winner_side SMALLINT CHECK (winner_side IN (1, 2)),
    tags JSONB DEFAULT '[]'::jsonb,
    featured_cores JSONB DEFAULT '[]'::jsonb,
    indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON COLUMN replays.rating_source IS 'official: parsed from replay page. estimated: derived via rules. unknown: NULL.';

-- Basic filters
CREATE INDEX IF NOT EXISTS idx_replays_format ON replays(format_id);
CREATE INDEX IF NOT EXISTS idx_replays_rating ON replays(rating_estimate DESC);

-- Composite index for common query pattern (P4 per GPT)
CREATE INDEX IF NOT EXISTS replays_format_rating_played_idx
  ON replays (format_id, rating_estimate DESC, played_at DESC);

-- JSONB containment queries (p1_team ? 'xxx')
CREATE INDEX IF NOT EXISTS idx_replays_p1_team ON replays USING GIN (p1_team jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_replays_p2_team ON replays USING GIN (p2_team jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_replays_tags ON replays USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_replays_cores ON replays USING GIN (featured_cores);

-- Unique index on replay_id (P4 per GPT)
CREATE UNIQUE INDEX IF NOT EXISTS replays_battle_id_uidx ON replays (replay_id);

-- Additional composite indexes for fast lookups (GPT review requirement)
CREATE INDEX IF NOT EXISTS idx_pair_synergy_lookup ON pair_synergy(format_id, time_bucket, pokemon_a, pokemon_b);
CREATE INDEX IF NOT EXISTS idx_counters_lookup ON counters(format_id, time_bucket, target_pokemon);

-- ============================================================
-- Archetypes
-- ============================================================
CREATE TABLE IF NOT EXISTS archetypes (
    id SERIAL PRIMARY KEY,
    format_id VARCHAR(50) NOT NULL,
    time_bucket VARCHAR(7) NOT NULL,
    archetype_slug VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    key_pokemon TEXT[] DEFAULT '{}',
    flex_pokemon TEXT[] DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',
    weaknesses TEXT[] DEFAULT '{}',
    usage_estimate DECIMAL(5, 2),
    team_sample_size INTEGER,              -- Teams classified under this archetype
    sample_pastes JSONB DEFAULT '{"_v":1,"data":[]}'::jsonb, -- PasteBundle@v1
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(format_id, time_bucket, archetype_slug)
);

COMMENT ON COLUMN archetypes.team_sample_size IS 'Number of teams classified under this archetype';
COMMENT ON COLUMN archetypes.sample_pastes IS 'PasteBundle@v1';

-- ============================================================
-- RLS Policies (if using Supabase)
-- ============================================================
ALTER TABLE pokemon_dim ENABLE ROW LEVEL SECURITY;
ALTER TABLE pokemon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE pair_synergy ENABLE ROW LEVEL SECURITY;
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE archetypes ENABLE ROW LEVEL SECURITY;

-- Read-only public access
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access' AND tablename = 'pokemon_dim') THEN
        CREATE POLICY "Public read access" ON pokemon_dim FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access' AND tablename = 'pokemon_usage') THEN
        CREATE POLICY "Public read access" ON pokemon_usage FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access' AND tablename = 'pair_synergy') THEN
        CREATE POLICY "Public read access" ON pair_synergy FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access' AND tablename = 'counters') THEN
        CREATE POLICY "Public read access" ON counters FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access' AND tablename = 'replays') THEN
        CREATE POLICY "Public read access" ON replays FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access' AND tablename = 'archetypes') THEN
        CREATE POLICY "Public read access" ON archetypes FOR SELECT USING (true);
    END IF;
END $$;
