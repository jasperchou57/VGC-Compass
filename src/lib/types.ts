// ============================================================
// Type Definitions for VGC Meta Compass
// ============================================================

// Database Types
export interface PokemonDim {
    slug: string;
    name: string;
    base_species_slug: string | null;
    form_slug: string | null;
    type1: string | null;
    type2: string | null;
    base_hp: number;
    base_atk: number;
    base_def: number;
    base_spa: number;
    base_spd: number;
    base_spe: number;
}

export interface PokemonUsage {
    id: number;
    format_id: string;
    time_bucket: string;
    cutoff: number;
    pokemon: string;
    usage_rate: number;
    rank: number;
    top_moves: TopMoveItem[];
    top_items: TopItem[];
    top_abilities: TopAbility[];
    top_tera: TopTera[];
    top_spreads: TopSpread[];
    sample_size: number;
    created_at: Date;
}

export interface TopMoveItem {
    name: string;
    usage: number;
}

export interface TopItem {
    name: string;
    usage: number;
}

export interface TopAbility {
    name: string;
    usage: number;
}

export interface TopTera {
    type: string;
    usage: number;
}

export interface TopSpread {
    nature: string;
    evs: string;
    usage: number;
}

export interface PairSynergy {
    id: number;
    format_id: string;
    time_bucket: string;
    cutoff: number;
    pokemon_a: string;
    pokemon_b: string;
    pair_rate: number;
    pair_sample_size: number;
    synergy_score?: number;
    top_third_partners?: PartnerInfo[];
    top_fourth_partners?: PartnerInfo[];
    common_partners?: string[];
    common_archetypes?: string[];
    common_leads?: LeadInfo[];
    sample_pastes?: SamplePaste[];
    sample_teams?: SampleTeam[];
    created_at: Date;
}

export interface PartnerInfo {
    pokemon: string;
    rate: number;
}

export interface LeadInfo {
    pokemon_a: string;
    pokemon_b: string;
    rate: number;
}

export interface SamplePaste {
    title: string;
    paste: string;
    source?: string;
}

export interface Counter {
    id: number;
    format_id: string;
    time_bucket: string;
    cutoff: number;
    target_pokemon: string;
    answer_type: 'mechanic' | 'pokemon' | 'archetype';
    answer_key: string;
    effectiveness_score: number | null;
    loss_appearance_rate: number;
    win_appearance_rate: number;
    n_losses: number;
    n_wins: number;
    evidence_replays: string[];
    suggested_moves: string[];
    notes: string | null;
    created_at: Date;
}

export interface Replay {
    replay_id: string;
    format_id: string;
    rating_estimate: number | null;
    rating_source: 'official' | null;
    played_at: Date | null;
    p1_team: string[];
    p2_team: string[];
    winner_side: 1 | 2 | null;
    tags: string[];
    featured_cores: string[][];
    indexed_at: Date;
}

export interface Archetype {
    id: number;
    format_id: string;
    time_bucket: string;
    archetype_slug: string;
    name: string;
    description: string | null;
    icon?: string;
    key_pokemon: string[];
    flex_pokemon?: string[];
    strengths: string[];
    weaknesses: string[];
    usage_estimate?: number;
    meta_share?: number;
    sample_pastes?: SamplePaste[];
    sample_teams?: SampleTeam[];
    created_at: Date;
}

export interface SampleTeam {
    pokemon: string[];
    paste: string;
    usage_count?: number;
}

// Page Eligibility Types
export type PageStatus = 'full' | 'degraded' | '404';

export interface EligibilityResult {
    status: PageStatus;
    reason: string;
}

// API Response Types
export interface CorePageData {
    pairSynergy: PairSynergy;
    pokemonA: PokemonDim;
    pokemonB: PokemonDim;
    usageA: PokemonUsage | null;
    usageB: PokemonUsage | null;
    replays: Replay[];
    status: PageStatus;
    aiSummary: string | null;
}

export interface CounterPageData {
    target: PokemonDim;
    usage: PokemonUsage;
    counters: Counter[];
    replays: Replay[];
    status: PageStatus;
    aiSummary: string | null;
}

export interface ArchetypePageData {
    archetype: Archetype;
    replays: Replay[];
    status: PageStatus;
    aiSummary: string | null;
}

export interface FormatHubData {
    topRisers: PokemonUsage[];
    topFallers: PokemonUsage[];
    topCores: PairSynergy[];
    topThreats: PokemonUsage[];
    archetypes: Archetype[];
}
