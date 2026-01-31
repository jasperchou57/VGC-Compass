import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { query, getLatestTimeBucket } from '@/lib/db';
import { CURRENT_FORMAT_ID, CORE_MIN_SAMPLE_SIZE } from '@/lib/constants';
import type { PairSynergy } from '@/lib/types';
import Breadcrumbs from '@/components/Breadcrumbs';

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
        // SEO Template: Top Cores in VGC {FormatName} (1760+) | VGC Compass
        title: `Top Cores in VGC ${formatName} (1760+) | VGC Compass`,
        description: `Browse the most common VGC ${formatName} cores based on 1760+ usage, with partners, sample teams, and replay evidence.`,
    };
}

function formatPokemonName(slug: string): string {
    return slug.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

async function getCoresData(formatId: string) {
    const timeBucket = await getLatestTimeBucket(formatId);

    const cores = await query<PairSynergy>(
        `SELECT * FROM pair_synergy 
         WHERE format_id = $1 AND time_bucket = $2 AND cutoff >= 1760 AND pair_sample_size >= $3
         ORDER BY pair_rate DESC LIMIT 50`,
        [formatId, timeBucket, CORE_MIN_SAMPLE_SIZE]
    );

    if (cores.length > 0) {
        return { cores, isDemo: false };
    }

    // Demo data
    return {
        cores: [
            { pokemon_a: 'incineroar', pokemon_b: 'rillaboom', pair_rate: 45.2, pair_sample_size: 1250 },
            { pokemon_a: 'flutter-mane', pokemon_b: 'incineroar', pair_rate: 38.5, pair_sample_size: 980 },
            { pokemon_a: 'pelipper', pokemon_b: 'urshifu-rapid-strike', pair_rate: 35.0, pair_sample_size: 820 },
            { pokemon_a: 'chien-pao', pokemon_b: 'flutter-mane', pair_rate: 32.1, pair_sample_size: 750 },
            { pokemon_a: 'iron-hands', pokemon_b: 'tornadus', pair_rate: 28.9, pair_sample_size: 680 },
            { pokemon_a: 'amoonguss', pokemon_b: 'incineroar', pair_rate: 27.5, pair_sample_size: 650 },
            { pokemon_a: 'landorus-therian', pokemon_b: 'rillaboom', pair_rate: 25.3, pair_sample_size: 600 },
            { pokemon_a: 'incineroar', pokemon_b: 'urshifu-rapid-strike', pair_rate: 24.1, pair_sample_size: 580 },
            { pokemon_a: 'flutter-mane', pokemon_b: 'tornadus', pair_rate: 22.8, pair_sample_size: 550 },
            { pokemon_a: 'chien-pao', pokemon_b: 'landorus-therian', pair_rate: 21.5, pair_sample_size: 520 },
        ] as PairSynergy[],
        isDemo: true,
    };
}

export default async function CoresIndexPage({ params }: PageProps) {
    const { format_id } = await params;

    if (format_id !== CURRENT_FORMAT_ID) {
        notFound();
    }

    const formatName = getFormatName(format_id);
    const { cores, isDemo } = await getCoresData(format_id);

    return (
        <main className="min-h-screen bg-gray-950 text-white">
            <div className="container mx-auto px-4 py-8">
                <Breadcrumbs
                    items={[
                        { label: `${formatName} Meta Hub`, href: `/vgc/${format_id}/` },
                        { label: 'Top Cores' },
                    ]}
                />

                {isDemo && (
                    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
                        <p className="text-blue-200 text-center">
                            📊 <strong>Demo Mode</strong> – Showing sample data.
                        </p>
                    </div>
                )}

                {/* H1: Unique, matches primary keyword */}
                <header className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Top Cores in VGC {formatName}</h1>
                    <p className="text-gray-400">
                        Most common Pokémon pairings based on 1760+ rated teams.
                    </p>
                </header>

                {/* H2: Top Cores (1760+) */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6">Top Cores (1760+)</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cores.map((core, i) => (
                            <Link
                                key={`${core.pokemon_a}-${core.pokemon_b}`}
                                href={`/vgc/${format_id}/core/${core.pokemon_a}-${core.pokemon_b}/`}
                                className="bg-gray-900 rounded-lg p-4 hover:bg-gray-800 transition-colors"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-gray-400 text-sm">#{i + 1}</h3>
                                    <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                                        {core.pair_rate}%
                                    </span>
                                </div>
                                <div className="font-semibold">
                                    {formatPokemonName(core.pokemon_a)} + {formatPokemonName(core.pokemon_b)}
                                </div>
                                <div className="text-sm text-gray-400 mt-1">
                                    Sample: {core.pair_sample_size} teams
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* H2: How to Use These Cores */}
                <section className="mb-12 bg-gray-900 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">How to Use These Cores</h2>
                    <p className="text-gray-300 mb-4">
                        Each core listed above shows the pair rate (percentage of teams containing both Pokémon)
                        and sample size from 1760+ rated matches. Click any core to see:
                    </p>
                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                        <li>Why the two Pokémon work well together</li>
                        <li>Best third partners to complete your team</li>
                        <li>Sample teams you can copy and use</li>
                        <li>Replay evidence from high-rated matches</li>
                    </ul>
                </section>

                {/* H2: Related Counter Guides */}
                <section className="mb-12">
                    <h2 className="text-xl font-bold mb-4">Related Counter Guides</h2>
                    <p className="text-gray-400 mb-4">
                        Learn how to beat the Pokémon that form these cores:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {['incineroar', 'flutter-mane', 'rillaboom', 'urshifu-rapid-strike', 'chien-pao'].map(pokemon => (
                            <Link
                                key={pokemon}
                                href={`/vgc/${format_id}/counter/how-to-beat-${pokemon}/`}
                                className="bg-red-900/30 hover:bg-red-800/30 rounded-lg px-4 py-2 transition-colors"
                            >
                                How to Beat {formatPokemonName(pokemon)}
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}
