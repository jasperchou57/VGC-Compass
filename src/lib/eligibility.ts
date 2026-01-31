import { query } from './db';
import {
    CORE_MIN_SAMPLE_SIZE,
    COUNTER_MIN_USAGE_RATE,
    COUNTER_MIN_WINS,
    COUNTER_MIN_LOSSES,
    REPLAY_FULL_THRESHOLD,
    REPLAY_DEGRADED_THRESHOLD,
    REPLAY_SSR_CUTOFF,
    REPLAY_FETCH_CUTOFF,
    ARCHETYPE_WHITELIST,
} from './constants';
import type { EligibilityResult, PageStatus, PairSynergy, PokemonUsage, Replay } from './types';

// ============================================================
// Page Eligibility Logic (Per FROZEN_SPEC Appendix C)
// ============================================================

/**
 * Check Core page eligibility
 * Gate A: pair_sample_size >= 200
 * Gate B: replays(1760+, official) >= 10
 * Gate C: replays(1700+) >= 20
 */
export async function checkCoreEligibility(
    formatId: string,
    timeBucket: string,
    pokemonA: string,
    pokemonB: string
): Promise<EligibilityResult> {
    // Ensure alphabetical order
    const [a, b] = [pokemonA, pokemonB].sort();

    // Check Gate A: Sample Size
    const pairData = await query<PairSynergy>(
        `SELECT pair_sample_size FROM pair_synergy 
     WHERE format_id = $1 AND time_bucket = $2 AND pokemon_a = $3 AND pokemon_b = $4`,
        [formatId, timeBucket, a, b]
    );

    if (pairData.length === 0 || pairData[0].pair_sample_size < CORE_MIN_SAMPLE_SIZE) {
        return { status: '404', reason: `Sample size < ${CORE_MIN_SAMPLE_SIZE}` };
    }

    // Check Gate B: High-rated official replays
    const officialReplays = await countReplaysForCore(formatId, a, b, REPLAY_SSR_CUTOFF, true);
    if (officialReplays >= REPLAY_FULL_THRESHOLD) {
        return { status: 'full', reason: 'Meets all criteria' };
    }

    // Check Gate C: Any 1700+ replays
    const anyReplays = await countReplaysForCore(formatId, a, b, REPLAY_FETCH_CUTOFF, false);
    if (anyReplays >= REPLAY_DEGRADED_THRESHOLD) {
        return { status: 'degraded', reason: 'Limited high-rated samples' };
    }

    return { status: '404', reason: 'Insufficient replay evidence' };
}

/**
 * Check Counter page eligibility
 * Gate A: usage_rate >= 2%
 * Gate B: n_wins >= 300 AND n_losses >= 300
 * Gate C: replay threshold same as Core
 */
export async function checkCounterEligibility(
    formatId: string,
    timeBucket: string,
    targetPokemon: string
): Promise<EligibilityResult> {
    // Check Gate A: Usage Rate
    const usageData = await query<PokemonUsage>(
        `SELECT usage_rate FROM pokemon_usage 
     WHERE format_id = $1 AND time_bucket = $2 AND pokemon = $3 AND cutoff >= 1760`,
        [formatId, timeBucket, targetPokemon]
    );

    if (usageData.length === 0 || usageData[0].usage_rate < COUNTER_MIN_USAGE_RATE) {
        return { status: '404', reason: `Usage rate < ${COUNTER_MIN_USAGE_RATE}%` };
    }

    // Check Gate B: Win/Loss sample sizes
    const counterStats = await query<{ total_wins: number; total_losses: number }>(
        `SELECT SUM(n_wins) as total_wins, SUM(n_losses) as total_losses 
     FROM counters 
     WHERE format_id = $1 AND time_bucket = $2 AND target_pokemon = $3`,
        [formatId, timeBucket, targetPokemon]
    );

    const hasEnoughSamples =
        counterStats.length > 0 &&
        counterStats[0].total_wins >= COUNTER_MIN_WINS &&
        counterStats[0].total_losses >= COUNTER_MIN_LOSSES;

    // Check Gate C: Replays
    const officialReplays = await countReplaysForPokemon(formatId, targetPokemon, REPLAY_SSR_CUTOFF, true);

    if (hasEnoughSamples && officialReplays >= REPLAY_FULL_THRESHOLD) {
        return { status: 'full', reason: 'Meets all criteria' };
    }

    const anyReplays = await countReplaysForPokemon(formatId, targetPokemon, REPLAY_FETCH_CUTOFF, false);

    if (anyReplays >= REPLAY_DEGRADED_THRESHOLD) {
        return {
            status: 'degraded',
            reason: hasEnoughSamples ? 'Limited high-rated samples' : 'Insufficient win/loss samples'
        };
    }

    return { status: '404', reason: 'Insufficient data' };
}

/**
 * Check Archetype page eligibility
 * Gate A: slug in whitelist
 * Gate B: sample_size >= 200 (optional for degraded)
 */
export function checkArchetypeEligibility(slug: string): EligibilityResult {
    if (!ARCHETYPE_WHITELIST.includes(slug as typeof ARCHETYPE_WHITELIST[number])) {
        return { status: '404', reason: 'Not in whitelist' };
    }
    return { status: 'full', reason: 'In whitelist' };
}

// ============================================================
// Helper Functions
// ============================================================

async function countReplaysForCore(
    formatId: string,
    pokemonA: string,
    pokemonB: string,
    minRating: number,
    requireOfficial: boolean
): Promise<number> {
    const result = await query<{ count: number }>(
        `SELECT COUNT(*) as count FROM replays 
     WHERE format_id = $1 
     AND (
       (p1_team ? $2 AND p1_team ? $3) OR 
       (p2_team ? $2 AND p2_team ? $3)
     )
     AND rating_estimate >= $4
     ${requireOfficial ? "AND rating_source = 'official'" : ''}`,
        [formatId, pokemonA, pokemonB, minRating]
    );
    return result[0]?.count ?? 0;
}

async function countReplaysForPokemon(
    formatId: string,
    pokemon: string,
    minRating: number,
    requireOfficial: boolean
): Promise<number> {
    const result = await query<{ count: number }>(
        `SELECT COUNT(*) as count FROM replays 
     WHERE format_id = $1 
     AND (p1_team ? $2 OR p2_team ? $2)
     AND rating_estimate >= $3
     ${requireOfficial ? "AND rating_source = 'official'" : ''}`,
        [formatId, pokemon, minRating]
    );
    return result[0]?.count ?? 0;
}

/**
 * Get canonical pair slug (alphabetical order)
 */
export function getCanonicalPairSlug(a: string, b: string): string {
    const sorted = [a, b].sort();
    return `${sorted[0]}-${sorted[1]}`;
}

/**
 * Parse pair slug back to individual pokemon
 */
export function parsePairSlug(slug: string): [string, string] | null {
    // This needs to handle multi-word pokemon names like "urshifu-rapid-strike"
    // We'll need to look up valid pokemon to properly split
    const parts = slug.split('-');
    if (parts.length < 2) return null;

    // For now, simple split at middle - proper implementation needs pokemon lookup
    // This is a placeholder that will be enhanced when we have the pokemon_dim data
    return [parts[0], parts.slice(1).join('-')] as [string, string];
}
