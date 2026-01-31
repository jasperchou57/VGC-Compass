import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { query, getLatestTimeBucket } from '@/lib/db';
import { CURRENT_FORMAT_ID, COUNTER_MIN_USAGE_RATE } from '@/lib/constants';
import type { PokemonUsage } from '@/lib/types';
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
        // SEO Template: Counter Guides – VGC {FormatName} | VGC Meta Compass
        title: `Counter Guides – VGC ${formatName} | VGC Meta Compass`,
        description: `How to beat the most common threats in VGC ${formatName}, backed by usage stats and replay evidence.`,
    };
}

function formatPokemonName(slug: string): string {
    return slug.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

async function getCountersData(formatId: string) {
    const timeBucket = await getLatestTimeBucket(formatId);

    const threats = await query<PokemonUsage>(
        `SELECT * FROM pokemon_usage 
         WHERE format_id = $1 AND time_bucket = $2 AND cutoff >= 1760 AND usage_rate >= $3
         ORDER BY usage_rate DESC LIMIT 30`,
        [formatId, timeBucket, COUNTER_MIN_USAGE_RATE]
    );

    if (threats.length > 0) {
        return { threats, isDemo: false };
    }

    return {
        threats: [
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
            { pokemon: 'chi-yu', usage_rate: 15.2, rank: 11 },
            { pokemon: 'cresselia', usage_rate: 14.5, rank: 12 },
        ] as PokemonUsage[],
        isDemo: true,
    };
}

export default async function CountersIndexPage({ params }: PageProps) {
    const { format_id } = await params;

    if (format_id !== CURRENT_FORMAT_ID) {
        notFound();
    }

    const formatName = getFormatName(format_id);
    const { threats, isDemo } = await getCountersData(format_id);

    // Split threats into most searched (top 5) and all
    const mostSearched = threats.slice(0, 5);
    const allThreats = threats;

    return (
        <main className="min-h-screen bg-gray-950 text-white">
            <div className="container mx-auto px-4 py-8">
                <Breadcrumbs
                    items={[
                        { label: `${formatName} Meta Hub`, href: `/vgc/${format_id}/` },
                        { label: 'Counter Guides' },
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
                    <h1 className="text-3xl font-bold mb-2">Counter Guides for VGC {formatName}</h1>
                    <p className="text-gray-400">
                        Learn how to beat the top threats with data-backed strategies and replay evidence.
                    </p>
                </header>

                {/* H2: Most Searched Threats */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6">Most Searched Threats</h2>
                    <div className="grid md:grid-cols-5 gap-4">
                        {mostSearched.map((threat) => (
                            <Link
                                key={threat.pokemon}
                                href={`/vgc/${format_id}/counter/how-to-beat-${threat.pokemon}/`}
                                className="bg-red-900/30 hover:bg-red-800/30 rounded-lg p-4 transition-colors text-center"
                            >
                                <h3 className="font-semibold mb-1">How to Beat {formatPokemonName(threat.pokemon)}</h3>
                                <div className="text-sm text-gray-400">{threat.usage_rate}% usage</div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* H2: All Counter Guides */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6">All Counter Guides</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allThreats.map((threat) => (
                            <Link
                                key={threat.pokemon}
                                href={`/vgc/${format_id}/counter/how-to-beat-${threat.pokemon}/`}
                                className="bg-gray-900 rounded-lg p-4 hover:bg-gray-800 transition-colors"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-gray-400 text-sm">#{threat.rank}</h3>
                                    <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                                        {threat.usage_rate}% usage
                                    </span>
                                </div>
                                <div className="font-semibold">How to Beat {formatPokemonName(threat.pokemon)}</div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* H2: Popular Cores to Pair With */}
                <section className="mb-12">
                    <h2 className="text-xl font-bold mb-4">Popular Cores to Pair With</h2>
                    <p className="text-gray-400 mb-4">
                        After understanding how to beat top threats, build your team with proven cores:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href={`/vgc/${format_id}/core/incineroar-rillaboom/`}
                            className="bg-blue-900/30 hover:bg-blue-800/30 rounded-lg px-4 py-2 transition-colors"
                        >
                            Incineroar + Rillaboom core
                        </Link>
                        <Link
                            href={`/vgc/${format_id}/core/flutter-mane-incineroar/`}
                            className="bg-blue-900/30 hover:bg-blue-800/30 rounded-lg px-4 py-2 transition-colors"
                        >
                            Flutter Mane + Incineroar core
                        </Link>
                        <Link
                            href={`/vgc/${format_id}/cores/`}
                            className="bg-gray-700 hover:bg-gray-600 rounded-lg px-4 py-2 transition-colors"
                        >
                            View all cores →
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}
