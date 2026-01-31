import { MetadataRoute } from 'next';
import { query, getLatestTimeBucket } from '@/lib/db';
import { CURRENT_FORMAT_ID, CORE_MIN_SAMPLE_SIZE, COUNTER_MIN_USAGE_RATE, ARCHETYPE_WHITELIST } from '@/lib/constants';
import type { PairSynergy, PokemonUsage } from '@/lib/types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vgcmeta.com';
    const timeBucket = await getLatestTimeBucket(CURRENT_FORMAT_ID);
    const lastModified = new Date();

    const entries: MetadataRoute.Sitemap = [];

    // Format Hub
    entries.push({
        url: `${baseUrl}/vgc/${CURRENT_FORMAT_ID}/`,
        lastModified,
        changeFrequency: 'daily',
        priority: 1.0,
    });

    // Index pages
    entries.push({
        url: `${baseUrl}/vgc/${CURRENT_FORMAT_ID}/cores/`,
        lastModified,
        changeFrequency: 'daily',
        priority: 0.8,
    });
    entries.push({
        url: `${baseUrl}/vgc/${CURRENT_FORMAT_ID}/counters/`,
        lastModified,
        changeFrequency: 'daily',
        priority: 0.8,
    });
    entries.push({
        url: `${baseUrl}/vgc/${CURRENT_FORMAT_ID}/archetypes/`,
        lastModified,
        changeFrequency: 'daily',
        priority: 0.8,
    });

    // Archetype detail pages (whitelist only)
    for (const slug of ARCHETYPE_WHITELIST) {
        entries.push({
            url: `${baseUrl}/vgc/${CURRENT_FORMAT_ID}/archetype/${slug}/`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.7,
        });
    }

    try {
        // Eligible Core pages
        const eligibleCores = await query<PairSynergy>(
            `SELECT pokemon_a, pokemon_b FROM pair_synergy 
       WHERE format_id = $1 AND time_bucket = $2 AND cutoff >= 1760 AND pair_sample_size >= $3`,
            [CURRENT_FORMAT_ID, timeBucket, CORE_MIN_SAMPLE_SIZE]
        );

        for (const core of eligibleCores) {
            entries.push({
                url: `${baseUrl}/vgc/${CURRENT_FORMAT_ID}/core/${core.pokemon_a}-${core.pokemon_b}/`,
                lastModified,
                changeFrequency: 'monthly',
                priority: 0.6,
            });
        }

        // Eligible Counter pages
        const eligibleThreats = await query<PokemonUsage>(
            `SELECT u.pokemon FROM pokemon_usage u
             WHERE u.format_id = $1 AND u.time_bucket = $2 AND u.cutoff >= 1760 AND u.usage_rate >= $3
             AND EXISTS (
                 SELECT 1 FROM counters c 
                 WHERE c.format_id = u.format_id 
                 AND c.time_bucket = u.time_bucket 
                 AND c.target_pokemon = u.pokemon
             )`,
            [CURRENT_FORMAT_ID, timeBucket, COUNTER_MIN_USAGE_RATE]
        );

        for (const threat of eligibleThreats) {
            entries.push({
                url: `${baseUrl}/vgc/${CURRENT_FORMAT_ID}/counter/how-to-beat-${threat.pokemon}/`,
                lastModified,
                changeFrequency: 'monthly',
                priority: 0.6,
            });
        }
    } catch {
        // Database not available, return static entries only
        console.log('Sitemap: Database not available, returning static entries only');
    }

    return entries;
}
