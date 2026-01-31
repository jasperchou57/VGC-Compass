#!/usr/bin/env node
/**
 * Counter Effectiveness Calculator
 * Calculates counter data from replays
 */

import { Pool } from 'pg';

const FORMAT_ID = 'reg-f';
const MIN_GAMES = 50;

async function calculateCounters() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const timeBucket = new Date().toISOString().slice(0, 7);

        console.log(`Calculating counter effectiveness for ${FORMAT_ID} / ${timeBucket}`);

        // Get top threats
        const threats = await pool.query(`
            SELECT pokemon, usage_rate
            FROM pokemon_usage
            WHERE format_id = $1 AND time_bucket = $2 AND cutoff >= 1760 AND usage_rate >= 10
            ORDER BY usage_rate DESC
        `, [FORMAT_ID, timeBucket]);

        console.log(`Processing ${threats.rows.length} threats`);

        for (const threat of threats.rows) {
            const targetPokemon = threat.pokemon;

            // Get all opponents from replays (simplified)
            const replaysResult = await pool.query(`
                SELECT p1_team, p2_team, winner_side
                FROM replays
                WHERE format_id = $1
                AND (p1_team ? $2 OR p2_team ? $2)
                AND rating_estimate >= 1760
            `, [FORMAT_ID, targetPokemon]);

            const counterStats: Record<string, { wins: number; losses: number }> = {};

            for (const replay of replaysResult.rows) {
                const targetInP1 = replay.p1_team?.includes(targetPokemon);
                const opponentTeam = targetInP1 ? replay.p2_team : replay.p1_team;
                const targetWon = (targetInP1 && replay.winner_side === 1) || (!targetInP1 && replay.winner_side === 2);

                for (const opponent of opponentTeam || []) {
                    if (opponent === targetPokemon) continue;

                    if (!counterStats[opponent]) {
                        counterStats[opponent] = { wins: 0, losses: 0 };
                    }

                    if (targetWon) {
                        counterStats[opponent].wins++;
                    } else {
                        counterStats[opponent].losses++;
                    }
                }
            }

            // Calculate effectiveness scores and insert
            for (const [answer, stats] of Object.entries(counterStats)) {
                const total = stats.wins + stats.losses;
                if (total < MIN_GAMES) continue;

                const lossAppearanceRate = (stats.losses / (stats.losses || 1)) * 100;
                const winAppearanceRate = (stats.wins / (stats.wins || 1)) * 100;
                const effectivenessScore = lossAppearanceRate - winAppearanceRate;

                if (effectivenessScore > 5) {
                    await pool.query(`
                        INSERT INTO counters (
                            format_id, time_bucket, cutoff, target_pokemon, answer_type, answer_key,
                            effectiveness_score, loss_appearance_rate, win_appearance_rate, n_losses, n_wins
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        ON CONFLICT (format_id, time_bucket, target_pokemon, answer_type, answer_key)
                        DO UPDATE SET
                            effectiveness_score = EXCLUDED.effectiveness_score,
                            loss_appearance_rate = EXCLUDED.loss_appearance_rate,
                            win_appearance_rate = EXCLUDED.win_appearance_rate,
                            n_losses = EXCLUDED.n_losses,
                            n_wins = EXCLUDED.n_wins
                    `, [
                        FORMAT_ID,
                        timeBucket,
                        1760,
                        targetPokemon,
                        'pokemon',
                        answer,
                        effectivenessScore,
                        lossAppearanceRate,
                        winAppearanceRate,
                        stats.losses,
                        stats.wins,
                    ]);
                }
            }
        }

        console.log('Counter calculation complete!');
    } finally {
        await pool.end();
    }
}

calculateCounters().catch(console.error);
