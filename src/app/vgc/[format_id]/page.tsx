import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { query, getLastTwoBuckets } from '@/lib/db';
import { CURRENT_FORMAT_ID } from '@/lib/constants';
import type { FormatHubData, PokemonUsage, PairSynergy, Archetype } from '@/lib/types';

export const revalidate = 86400; // ISR: Daily

interface PageProps {
    params: Promise<{ format_id: string }>;
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { format_id } = await params;
    const formatName = getFormatName(format_id);

    return {
        // SEO Template: VGC {FormatName} Meta Guide (1760+) – Threats, Cores & Counters | VGC Meta Compass
        title: `VGC ${formatName} Meta Guide (1760+) – Threats, Cores & Counters | VGC Meta Compass`,
        description: `Current VGC ${formatName} meta hub: top threats by usage, best cores, counter guides, archetypes, and high-rated replay evidence. Updated monthly.`,
    };
}

async function getFormatHubData(formatId: string): Promise<FormatHubData | null> {
    const [currentTimeBucket, previousTimeBucket] = await getLastTwoBuckets(formatId);

    const currentUsage = await query<PokemonUsage>(
        `SELECT * FROM pokemon_usage 
         WHERE format_id = $1 AND time_bucket = $2 AND cutoff >= 1760
         ORDER BY rank ASC LIMIT 50`,
        [formatId, currentTimeBucket]
    );

    const previousUsage = previousTimeBucket
        ? await query<PokemonUsage>(
            `SELECT pokemon, rank FROM pokemon_usage 
             WHERE format_id = $1 AND time_bucket = $2 AND cutoff >= 1760`,
            [formatId, previousTimeBucket]
        )
        : [];

    const prevRankMap = new Map(previousUsage.map(p => [p.pokemon, p.rank]));
    const withDelta = currentUsage.map(p => ({
        ...p,
        rankDelta: (prevRankMap.get(p.pokemon) ?? p.rank) - p.rank
    }));

    const topRisers = withDelta.filter(p => p.rankDelta > 0).sort((a, b) => b.rankDelta - a.rankDelta).slice(0, 5);
    const topFallers = withDelta.filter(p => p.rankDelta < 0).sort((a, b) => a.rankDelta - b.rankDelta).slice(0, 5);
    const topThreats = currentUsage.slice(0, 10);

    const topCores = await query<PairSynergy>(
        `SELECT * FROM pair_synergy 
         WHERE format_id = $1 AND time_bucket = $2 AND cutoff >= 1760 AND pair_sample_size >= 200
         ORDER BY pair_rate DESC LIMIT 10`,
        [formatId, currentTimeBucket]
    );

    const archetypes = await query<Archetype>(
        `SELECT * FROM archetypes 
         WHERE format_id = $1 AND time_bucket = $2 
         AND archetype_slug IN ('rain', 'sun', 'trick-room', 'tailwind', 'balance')`,
        [formatId, currentTimeBucket]
    );

    if (currentUsage.length === 0) return null;

    return { topRisers, topFallers, topCores, topThreats, archetypes };
}

// Helper to format Pokemon name
function formatPokemonName(slug: string): string {
    return slug.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

export default async function FormatHubPage({ params }: PageProps) {
    const { format_id } = await params;

    if (format_id !== CURRENT_FORMAT_ID) {
        notFound();
    }

    const formatName = getFormatName(format_id);
    const data = await getFormatHubData(format_id);

    // Demo data when database is not connected
    const displayData: FormatHubData = data || {
        topRisers: [
            { pokemon: 'urshifu-rapid-strike', usage_rate: 28.5, rank: 5, rankDelta: 8 },
            { pokemon: 'rillaboom', usage_rate: 35.2, rank: 8, rankDelta: 6 },
            { pokemon: 'iron-hands', usage_rate: 22.1, rank: 12, rankDelta: 5 },
            { pokemon: 'amoonguss', usage_rate: 18.9, rank: 15, rankDelta: 4 },
            { pokemon: 'landorus-therian', usage_rate: 25.0, rank: 10, rankDelta: 3 },
        ] as (PokemonUsage & { rankDelta: number })[],
        topFallers: [
            { pokemon: 'flutter-mane', usage_rate: 42.1, rank: 3, rankDelta: -5 },
            { pokemon: 'chi-yu', usage_rate: 15.2, rank: 20, rankDelta: -4 },
            { pokemon: 'iron-bundle', usage_rate: 12.3, rank: 25, rankDelta: -3 },
            { pokemon: 'great-tusk', usage_rate: 18.0, rank: 18, rankDelta: -2 },
            { pokemon: 'arcanine', usage_rate: 10.5, rank: 30, rankDelta: -2 },
        ] as (PokemonUsage & { rankDelta: number })[],
        topThreats: [
            { pokemon: 'incineroar', usage_rate: 55.2, rank: 1 },
            { pokemon: 'flutter-mane', usage_rate: 42.1, rank: 2 },
            { pokemon: 'rillaboom', usage_rate: 35.2, rank: 3 },
            { pokemon: 'urshifu-rapid-strike', usage_rate: 28.5, rank: 4 },
            { pokemon: 'landorus-therian', usage_rate: 25.0, rank: 5 },
            { pokemon: 'iron-hands', usage_rate: 22.1, rank: 6 },
            { pokemon: 'tornadus', usage_rate: 20.5, rank: 7 },
            { pokemon: 'amoonguss', usage_rate: 18.9, rank: 8 },
            { pokemon: 'chien-pao', usage_rate: 17.2, rank: 9 },
            { pokemon: 'pelipper', usage_rate: 16.0, rank: 10 },
        ] as PokemonUsage[],
        topCores: [
            { pokemon_a: 'incineroar', pokemon_b: 'rillaboom', pair_rate: 45.2, pair_sample_size: 1250 },
            { pokemon_a: 'flutter-mane', pokemon_b: 'incineroar', pair_rate: 38.5, pair_sample_size: 980 },
            { pokemon_a: 'pelipper', pokemon_b: 'urshifu-rapid-strike', pair_rate: 35.0, pair_sample_size: 820 },
            { pokemon_a: 'chien-pao', pokemon_b: 'flutter-mane', pair_rate: 32.1, pair_sample_size: 750 },
            { pokemon_a: 'iron-hands', pokemon_b: 'tornadus', pair_rate: 28.9, pair_sample_size: 680 },
        ] as PairSynergy[],
        archetypes: [
            { archetype_slug: 'rain', name: 'Rain' },
            { archetype_slug: 'sun', name: 'Sun' },
            { archetype_slug: 'trick-room', name: 'Trick Room' },
            { archetype_slug: 'tailwind', name: 'Tailwind' },
            { archetype_slug: 'balance', name: 'Balance' },
        ] as Archetype[],
    };

    const isDemo = !data;

    return (
        <main className="min-h-screen bg-gray-950 text-white">
            <div className="container mx-auto px-4 py-8">
                {/* H1: Unique, matches primary keyword */}
                <header className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">VGC {formatName} Meta Guide (1760+)</h1>
                    <p className="text-gray-400">
                        Updated {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                </header>

                {/* Demo Banner */}
                {isDemo && (
                    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-8">
                        <p className="text-blue-200 text-center">
                            📊 <strong>Demo Mode</strong> – Showing sample data. Connect database for live statistics.
                        </p>
                    </div>
                )}

                {/* H2: What Changed This Month */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6">What Changed This Month</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-gray-900 rounded-lg p-6">
                            <h3 className="text-xl font-semibold mb-4 text-green-400">📈 Top Risers</h3>
                            <ul className="space-y-3">
                                {displayData.topRisers.map((p, i) => (
                                    <li key={p.pokemon} className="flex justify-between items-center">
                                        <span>{i + 1}. {formatPokemonName(p.pokemon)}</span>
                                        <span className="text-green-400">+{(p as PokemonUsage & { rankDelta: number }).rankDelta} ranks</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-6">
                            <h3 className="text-xl font-semibold mb-4 text-red-400">📉 Top Fallers</h3>
                            <ul className="space-y-3">
                                {displayData.topFallers.map((p, i) => (
                                    <li key={p.pokemon} className="flex justify-between items-center">
                                        <span>{i + 1}. {formatPokemonName(p.pokemon)}</span>
                                        <span className="text-red-400">{(p as PokemonUsage & { rankDelta: number }).rankDelta} ranks</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* H2: Top Threats (Usage) */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6">Top Threats (Usage)</h2>
                    <p className="text-gray-400 mb-4">The most common Pokémon in VGC {formatName} at 1760+ rating.</p>
                    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {displayData.topThreats.map((p, i) => (
                            <a
                                key={p.pokemon}
                                href={`/vgc/${format_id}/counter/how-to-beat-${p.pokemon}/`}
                                className="bg-gray-900 rounded-lg p-4 hover:bg-gray-800 transition-colors"
                            >
                                <h3 className="text-sm text-gray-400">#{i + 1}</h3>
                                <div className="font-semibold">{formatPokemonName(p.pokemon)}</div>
                                <div className="text-sm text-gray-400">{p.usage_rate}% usage</div>
                            </a>
                        ))}
                    </div>
                </section>

                {/* H2: Top Cores */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6">Top Cores</h2>
                    <p className="text-gray-400 mb-4">Most common Pokémon pairings in high-rated teams.</p>
                    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {displayData.topCores.map((core, i) => (
                            <a
                                key={`${core.pokemon_a}-${core.pokemon_b}`}
                                href={`/vgc/${format_id}/core/${core.pokemon_a}-${core.pokemon_b}/`}
                                className="bg-gray-900 rounded-lg p-4 hover:bg-gray-800 transition-colors"
                            >
                                <h3 className="text-sm text-gray-400">#{i + 1}</h3>
                                <div className="font-semibold text-sm">
                                    {formatPokemonName(core.pokemon_a)} + {formatPokemonName(core.pokemon_b)}
                                </div>
                                <div className="text-sm text-gray-400">{core.pair_rate}% pair rate</div>
                            </a>
                        ))}
                    </div>
                    <div className="mt-4">
                        <a href={`/vgc/${format_id}/cores/`} className="text-blue-400 hover:underline">
                            View all cores →
                        </a>
                    </div>
                </section>

                {/* H2: Counter Guides */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6">Counter Guides</h2>
                    <p className="text-gray-400 mb-4">Learn how to beat the top threats with data-backed strategies.</p>
                    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {displayData.topThreats.slice(0, 5).map(p => (
                            <a
                                key={p.pokemon}
                                href={`/vgc/${format_id}/counter/how-to-beat-${p.pokemon}/`}
                                className="bg-red-900/30 hover:bg-red-800/30 rounded-lg p-4 transition-colors"
                            >
                                <div className="font-semibold">How to Beat {formatPokemonName(p.pokemon)}</div>
                                <div className="text-sm text-gray-400">{p.usage_rate}% usage</div>
                            </a>
                        ))}
                    </div>
                    <div className="mt-4">
                        <a href={`/vgc/${format_id}/counters/`} className="text-blue-400 hover:underline">
                            All counter guides →
                        </a>
                    </div>
                </section>

                {/* H2: Team Archetypes */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6">Team Archetypes</h2>
                    <p className="text-gray-400 mb-4">Common team structures in the current meta.</p>
                    <div className="grid md:grid-cols-5 gap-4">
                        {displayData.archetypes.map(arch => (
                            <a
                                key={arch.archetype_slug}
                                href={`/vgc/${format_id}/archetype/${arch.archetype_slug}/`}
                                className="bg-gray-900 rounded-lg p-4 hover:bg-gray-800 transition-colors text-center"
                            >
                                <div className="text-2xl mb-2">
                                    {arch.archetype_slug === 'rain' && '🌧️'}
                                    {arch.archetype_slug === 'sun' && '☀️'}
                                    {arch.archetype_slug === 'trick-room' && '🔮'}
                                    {arch.archetype_slug === 'tailwind' && '💨'}
                                    {arch.archetype_slug === 'balance' && '⚖️'}
                                </div>
                                <h3 className="font-semibold capitalize">{arch.name} Teams</h3>
                            </a>
                        ))}
                    </div>
                    <div className="mt-4">
                        <a href={`/vgc/${format_id}/archetypes/`} className="text-blue-400 hover:underline">
                            All archetypes →
                        </a>
                    </div>
                </section>

                {/* H2: Data Sources & Methodology */}
                <section className="mb-12 bg-gray-900 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Data Sources & Methodology</h2>
                    <ul className="space-y-2 text-gray-300">
                        <li>📊 <strong>Usage Stats:</strong> Smogon Stats (1760+ rating cutoff, updated monthly)</li>
                        <li>🎬 <strong>Replay Evidence:</strong> Pokémon Showdown replays (1700+ rating, official rating source)</li>
                        <li>🔄 <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</li>
                    </ul>
                </section>

                {/* H2: FAQ */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
                    <div className="space-y-4">
                        <div className="bg-gray-900 rounded-lg p-4">
                            <h3 className="font-semibold mb-2">What does &quot;1760+ usage&quot; mean?</h3>
                            <p className="text-gray-300">
                                Usage statistics are filtered to only include teams from players rated 1760 or higher on Pokémon Showdown ladder.
                                This ensures the data reflects competitive play rather than casual matches.
                            </p>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-4">
                            <h3 className="font-semibold mb-2">Where does the data come from?</h3>
                            <p className="text-gray-300">
                                Usage data comes from Smogon&apos;s monthly statistics. Replay evidence comes from Pokémon Showdown&apos;s
                                official replay database, filtered for high-rated matches.
                            </p>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-4">
                            <h3 className="font-semibold mb-2">Why are replays from 1700+ but usage is 1760+?</h3>
                            <p className="text-gray-300">
                                Smogon uses 1760 as their high-rated cutoff for statistics. We use 1700+ for replays to ensure sufficient
                                sample size while still representing competitive play.
                            </p>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-4">
                            <h3 className="font-semibold mb-2">How often is the data updated?</h3>
                            <p className="text-gray-300">
                                Usage statistics are updated monthly when Smogon publishes new data. Replays are fetched weekly to provide
                                fresh evidence for counter guides and team samples.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
