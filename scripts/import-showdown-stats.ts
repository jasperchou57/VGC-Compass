#!/usr/bin/env node
/**
 * Showdown Usage Stats Importer
 * Fetches and processes usage data from Pokemon Showdown
 */

import { Pool } from 'pg';

const FORMAT_ID = 'reg-f';
const CUTOFF = 1760;
const SHOWDOWN_STATS_URL = 'https://www.smogon.com/stats';

interface UsageData {
    pokemon: string;
    usage: number;
    rank: number;
    moves: Record<string, number>;
    items: Record<string, number>;
    abilities: Record<string, number>;
    spreads: Record<string, number>;
    teammates: Record<string, number>;
}

function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

async function fetchShowdownStats(): Promise<UsageData[]> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth()).padStart(2, '0'); // Previous month

    const url = `${SHOWDOWN_STATS_URL}/${year}-${month}/gen9vgc2024regf-${CUTOFF}.json`;

    console.log(`Fetching: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
    }

    const data = await response.json();
    const pokemon = data.data;

    // Convert to our format
    const results: UsageData[] = [];
    let rank = 0;

    for (const [name, stats] of Object.entries(pokemon) as [string, any][]) {
        rank++;
        results.push({
            pokemon: slugify(name),
            usage: stats.usage * 100,
            rank,
            moves: stats.Moves || {},
            items: stats.Items || {},
            abilities: stats.Abilities || {},
            spreads: stats.Spreads || {},
            teammates: stats.Teammates || {},
        });
    }

    return results.sort((a, b) => b.usage - a.usage);
}

function convertToTopItems(data: Record<string, number>, limit = 5): { name: string; usage: number }[] {
    return Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, usage]) => ({ name, usage: Math.round(usage * 100) / 100 }));
}

function convertToTopTera(data: Record<string, number>, limit = 4): { type: string; usage: number }[] {
    return Object.entries(data)
        .filter(([name]) => name.startsWith('Tera:'))
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, usage]) => ({ type: name.replace('Tera:', '').trim(), usage: Math.round(usage * 100) / 100 }));
}

async function importStats() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const usageData = await fetchShowdownStats();
        const timeBucket = new Date().toISOString().slice(0, 7);

        console.log(`Importing ${usageData.length} Pokemon to ${FORMAT_ID} / ${timeBucket}`);

        for (const data of usageData) {
            // Ensure pokemon exists in dim table
            await pool.query(`
                INSERT INTO pokemon_dim (slug, name)
                VALUES ($1, $2)
                ON CONFLICT (slug) DO NOTHING
            `, [data.pokemon, data.pokemon]);

            // Upsert usage data
            await pool.query(`
                INSERT INTO pokemon_usage (
                    format_id, time_bucket, cutoff, pokemon, usage_rate, rank,
                    top_moves, top_items, top_abilities, top_tera, sample_size
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (format_id, time_bucket, cutoff, pokemon)
                DO UPDATE SET
                    usage_rate = EXCLUDED.usage_rate,
                    rank = EXCLUDED.rank,
                    top_moves = EXCLUDED.top_moves,
                    top_items = EXCLUDED.top_items,
                    top_abilities = EXCLUDED.top_abilities,
                    top_tera = EXCLUDED.top_tera,
                    sample_size = EXCLUDED.sample_size
            `, [
                FORMAT_ID,
                timeBucket,
                CUTOFF,
                data.pokemon,
                data.usage,
                data.rank,
                JSON.stringify(convertToTopItems(data.moves, 8)),
                JSON.stringify(convertToTopItems(data.items, 5)),
                JSON.stringify(convertToTopItems(data.abilities, 4)),
                JSON.stringify(convertToTopTera(data.abilities, 4)),
                1000, // Sample size estimate
            ]);
        }

        console.log('Import complete!');
    } finally {
        await pool.end();
    }
}

importStats().catch(console.error);
