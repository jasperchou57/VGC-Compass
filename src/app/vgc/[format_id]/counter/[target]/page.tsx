import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { query, getLatestTimeBucket } from '@/lib/db';
import { checkCounterEligibility } from '@/lib/eligibility';
import { CURRENT_FORMAT_ID, COUNTER_MIN_WINS, COUNTER_MIN_LOSSES, EFFECTIVENESS_MIN_SCORE } from '@/lib/constants';
import type { PokemonUsage, Counter, Replay } from '@/lib/types';
import LimitedDataNotice from '@/components/LimitedDataNotice';
import ReplayList from '@/components/ReplayList';
import Breadcrumbs from '@/components/Breadcrumbs';

export const revalidate = 2592000; // ISR: Monthly

// Demo Pokemon set
const DEMO_POKEMON = new Set([
    'incineroar', 'flutter-mane', 'rillaboom', 'urshifu-rapid-strike', 'landorus-therian',
    'iron-hands', 'tornadus', 'amoonguss', 'chien-pao', 'pelipper', 'chi-yu', 'iron-bundle'
]);

interface PageProps {
    params: Promise<{ format_id: string; target: string }>;
}

// SEO: Format name mapping
function getFormatName(formatId: string): string {
    const names: Record<string, string> = {
        'reg-f': 'Regulation F',
        'reg-g': 'Regulation G',
        'reg-h': 'Regulation H',
    };
    return names[formatId] || formatId.toUpperCase().replace('-', ' ');
}

function extractTargetSlug(urlTarget: string): string {
    return urlTarget.replace('how-to-beat-', '');
}

function formatPokemonName(slug: string): string {
    return slug.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSmogonData(data: any): { name: string; usage: number }[] {
    if (!data) return [];
    // Handle new Smogon format: {_v: 1, data: [{key: "...", pct: ...}]}
    if (data._v && Array.isArray(data.data)) {
        return data.data.map((item: { key: string; pct: number }) => ({
            name: item.key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, s => s.toUpperCase()),
            usage: item.pct,
        }));
    }
    // Handle old format: [{name: "...", usage: ...}]
    if (Array.isArray(data)) {
        return data;
    }
    return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTeraData(data: any): { type: string; usage: number }[] {
    if (!data) return [];
    // Handle new Smogon format: {_v: 1, data: [{key: "...", pct: ...}]}
    if (data._v && Array.isArray(data.data)) {
        return data.data.map((item: { key: string; pct: number }) => ({
            type: item.key.replace(/^./, s => s.toUpperCase()),
            usage: item.pct,
        }));
    }
    // Handle old format: [{type: "...", usage: ...}]
    if (Array.isArray(data)) {
        return data;
    }
    return [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { format_id, target } = await params;
    const targetSlug = extractTargetSlug(target);
    const name = formatPokemonName(targetSlug);
    const formatName = getFormatName(format_id);

    return {
        // SEO Template: How to Beat {X} in VGC {FormatName} (1760+) | VGC Compass
        title: `How to Beat ${name} in VGC ${formatName} (1760+) | VGC Compass`,
        description: `Threat profile for ${name} in VGC ${formatName}: usage rate, common items/tera, recommended answers, sample teams to copy, and replay evidence.`,
    };
}

interface CounterPageData {
    usage: PokemonUsage;
    counters: Counter[];
    replays: Replay[];
    status: 'full' | 'degraded';
    showEffectiveness: boolean;
    isDemo: boolean;
}

async function getCounterPageData(formatId: string, targetPokemon: string): Promise<CounterPageData | null> {
    const timeBucket = await getLatestTimeBucket(formatId);

    const eligibility = await checkCounterEligibility(formatId, timeBucket, targetPokemon);

    const [usageData, countersData, replaysData] = await Promise.all([
        query<PokemonUsage>(
            'SELECT * FROM pokemon_usage WHERE format_id = $1 AND time_bucket = $2 AND pokemon = $3 AND cutoff >= 1760',
            [formatId, timeBucket, targetPokemon]
        ),
        query<Counter>(
            `SELECT * FROM counters 
             WHERE format_id = $1 AND time_bucket = $2 AND target_pokemon = $3
             ORDER BY effectiveness_score DESC NULLS LAST`,
            [formatId, timeBucket, targetPokemon]
        ),
        query<Replay>(
            `SELECT * FROM replays 
             WHERE format_id = $1 
             AND (p1_team ? $2 OR p2_team ? $2)
             AND ((rating_estimate >= 1760) OR rating_estimate IS NULL)
             ORDER BY
               (rating_source = 'official') DESC,
               (rating_source = 'derived') DESC,
               rating_estimate DESC NULLS LAST,
               played_at DESC
             LIMIT 10`,
            [formatId, targetPokemon]
        ),
    ]);

    if (usageData.length > 0 && eligibility.status !== '404') {
        const totalWins = countersData.reduce((sum, c) => sum + (c.n_wins || 0), 0);
        const totalLosses = countersData.reduce((sum, c) => sum + (c.n_losses || 0), 0);
        const showEffectiveness = totalWins >= COUNTER_MIN_WINS && totalLosses >= COUNTER_MIN_LOSSES;

        return {
            usage: usageData[0],
            counters: countersData,
            replays: replaysData,
            status: eligibility.status as 'full' | 'degraded',
            showEffectiveness,
            isDemo: false,
        };
    }

    // Return demo data if no real data
    if (DEMO_POKEMON.has(targetPokemon)) {
        return {
            usage: {
                id: 0,
                format_id: formatId,
                time_bucket: timeBucket,
                cutoff: 1760,
                pokemon: targetPokemon,
                usage_rate: 45.5,
                rank: 3,
                top_moves: [
                    { name: 'Fake Out', usage: 95.2 },
                    { name: 'Flare Blitz', usage: 88.5 },
                    { name: 'Knock Off', usage: 75.3 },
                    { name: 'Parting Shot', usage: 62.1 },
                ],
                top_items: [
                    { name: 'Safety Goggles', usage: 45.2 },
                    { name: 'Sitrus Berry', usage: 28.5 },
                    { name: 'Assault Vest', usage: 15.8 },
                ],
                top_abilities: [
                    { name: 'Intimidate', usage: 98.5 },
                    { name: 'Blaze', usage: 1.5 },
                ],
                top_tera: [
                    { type: 'Ghost', usage: 35.2 },
                    { type: 'Grass', usage: 28.5 },
                    { type: 'Water', usage: 18.3 },
                    { type: 'Fairy', usage: 10.2 },
                ],
                top_spreads: [],
                sample_size: 2500,
                created_at: new Date(),
            } as PokemonUsage,
            counters: [
                { id: 1, format_id: formatId, time_bucket: timeBucket, cutoff: 1760, target_pokemon: targetPokemon, answer_type: 'pokemon' as const, answer_key: 'urshifu-rapid-strike', effectiveness_score: 25.5, loss_appearance_rate: 45.2, win_appearance_rate: 19.7, n_wins: 150, n_losses: 200, evidence_replays: [], suggested_moves: [], notes: null, created_at: new Date() },
                { id: 2, format_id: formatId, time_bucket: timeBucket, cutoff: 1760, target_pokemon: targetPokemon, answer_type: 'pokemon' as const, answer_key: 'landorus-therian', effectiveness_score: 18.2, loss_appearance_rate: 38.5, win_appearance_rate: 20.3, n_wins: 140, n_losses: 180, evidence_replays: [], suggested_moves: [], notes: null, created_at: new Date() },
                { id: 3, format_id: formatId, time_bucket: timeBucket, cutoff: 1760, target_pokemon: targetPokemon, answer_type: 'pokemon' as const, answer_key: 'pelipper', effectiveness_score: 15.8, loss_appearance_rate: 32.1, win_appearance_rate: 16.3, n_wins: 120, n_losses: 160, evidence_replays: [], suggested_moves: [], notes: null, created_at: new Date() },
                { id: 4, format_id: formatId, time_bucket: timeBucket, cutoff: 1760, target_pokemon: targetPokemon, answer_type: 'archetype' as const, answer_key: 'rain', effectiveness_score: null, loss_appearance_rate: 0, win_appearance_rate: 0, n_wins: 0, n_losses: 0, evidence_replays: [], suggested_moves: [], notes: 'Weather control negates Fire coverage', created_at: new Date() },
            ] as Counter[],
            replays: [],
            status: 'full' as const,
            showEffectiveness: true,
            isDemo: true,
        };
    }

    return null;
}

export default async function CounterPage({ params }: PageProps) {
    const { format_id, target } = await params;

    if (format_id !== CURRENT_FORMAT_ID) {
        notFound();
    }

    const targetSlug = extractTargetSlug(target);
    const data = await getCounterPageData(format_id, targetSlug);

    if (!data) {
        notFound();
    }

    const formatName = getFormatName(format_id);
    const name = formatPokemonName(targetSlug);

    const pokemonCounters = data.counters.filter(c => c.answer_type === 'pokemon');
    const archetypeCounters = data.counters.filter(c => c.answer_type === 'archetype');
    const recommendedPokemon = pokemonCounters.filter(
        c => c.effectiveness_score !== null && c.effectiveness_score >= EFFECTIVENESS_MIN_SCORE
    );

    return (
        <main className="min-h-screen bg-gray-950 text-white">
            <div className="container mx-auto px-4 py-8">
                <Breadcrumbs
                    items={[
                        { label: `${formatName} Meta Hub`, href: `/vgc/${format_id}/` },
                        { label: 'Counter Guides', href: `/vgc/${format_id}/counters/` },
                        { label: `How to Beat ${name}` },
                    ]}
                />

                {data.isDemo && (
                    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
                        <p className="text-blue-200 text-center">
                            📊 <strong>Demo Mode</strong> – Showing sample data.
                        </p>
                    </div>
                )}

                {data.status === 'degraded' && <LimitedDataNotice />}

                {/* H1: Unique, matches primary keyword "How to Beat {X}" */}
                <header className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">How to Beat {name} in VGC {formatName}</h1>
                    <p className="text-gray-400">
                        Usage Rate: <strong className="text-white">{data.usage.usage_rate}%</strong> · Rank #{data.usage.rank}
                    </p>
                </header>

                {/* H2: Threat Summary */}
                <section className="bg-gray-900 rounded-lg p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">Threat Summary</h2>
                    <p className="text-gray-300">
                        {name} is one of the most common threats in VGC {formatName}, appearing on {data.usage.usage_rate}%
                        of teams at 1760+ rating. Understanding its common sets and counters is essential for success.
                    </p>
                </section>

                {/* H2: {X} Usage (1760+) */}
                <section className="bg-gray-900 rounded-lg p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">{name} Usage (1760+)</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                            <h3 className="text-sm text-gray-400 mb-2">Common Moves</h3>
                            <ul className="space-y-1">
                                {parseSmogonData(data.usage.top_moves).slice(0, 4).map(move => (
                                    <li key={move.name} className="flex justify-between">
                                        <span>{move.name}</span>
                                        <span className="text-gray-400">{move.usage}%</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-sm text-gray-400 mb-2">Common Items</h3>
                            <ul className="space-y-1">
                                {parseSmogonData(data.usage.top_items).slice(0, 4).map(item => (
                                    <li key={item.name} className="flex justify-between">
                                        <span>{item.name}</span>
                                        <span className="text-gray-400">{item.usage}%</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-sm text-gray-400 mb-2">Common Abilities</h3>
                            <ul className="space-y-1">
                                {parseSmogonData(data.usage.top_abilities).slice(0, 4).map(ability => (
                                    <li key={ability.name} className="flex justify-between">
                                        <span>{ability.name}</span>
                                        <span className="text-gray-400">{ability.usage}%</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-sm text-gray-400 mb-2">Tera Types</h3>
                            <ul className="space-y-1">
                                {parseTeraData(data.usage.top_tera).slice(0, 4).map(tera => (
                                    <li key={tera.type} className="flex justify-between">
                                        <span>{tera.type}</span>
                                        <span className="text-gray-400">{tera.usage}%</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* H2: Recommended Answers */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Recommended Answers</h2>
                    <p className="text-sm text-gray-400 mb-4 bg-gray-900 rounded-lg p-3">
                        ⚠️ These are correlations from replay data, not guaranteed causation.
                    </p>
                    {data.showEffectiveness && recommendedPokemon.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {recommendedPokemon.slice(0, 6).map(counter => (
                                <div key={counter.answer_key} className="bg-gray-900 rounded-lg p-4">
                                    <h3 className="font-semibold mb-2">{formatPokemonName(counter.answer_key)}</h3>
                                    <div className="text-sm">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-gray-400">In {name}&apos;s losses:</span>
                                            <span className="text-green-400">{counter.loss_appearance_rate}%</span>
                                        </div>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-gray-400">In {name}&apos;s wins:</span>
                                            <span className="text-red-400">{counter.win_appearance_rate}%</span>
                                        </div>
                                        <div className="flex justify-between font-semibold mt-2 pt-2 border-t border-gray-700">
                                            <span>Differential:</span>
                                            <span className="text-blue-400">+{counter.effectiveness_score}%</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {pokemonCounters.slice(0, 8).map(counter => (
                                <div key={counter.answer_key} className="bg-gray-900 rounded-lg p-4">
                                    <h3 className="font-semibold">{formatPokemonName(counter.answer_key)}</h3>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* H2: Sample Teams (Copy Paste) - placeholder for future */}

                {/* H2: Replay Evidence */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Replay Evidence</h2>
                    <ReplayList replays={data.replays} />
                </section>

                {/* H2: Related Cores and Archetypes */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Related Cores and Archetypes</h2>
                    <div className="flex flex-wrap gap-3">
                        {archetypeCounters.slice(0, 3).map(counter => (
                            <Link
                                key={counter.answer_key}
                                href={`/vgc/${format_id}/archetype/${counter.answer_key}/`}
                                className="bg-purple-900/30 hover:bg-purple-800/30 rounded-lg px-4 py-2 transition-colors capitalize"
                            >
                                {counter.answer_key} teams
                            </Link>
                        ))}
                        <Link
                            href={`/vgc/${format_id}/cores/`}
                            className="bg-blue-900/30 hover:bg-blue-800/30 rounded-lg px-4 py-2 transition-colors"
                        >
                            View all cores →
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}
