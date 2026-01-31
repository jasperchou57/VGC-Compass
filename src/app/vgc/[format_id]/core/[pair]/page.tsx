import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { query, getLatestTimeBucket, parsePokemonPair } from '@/lib/db';
import { checkCoreEligibility } from '@/lib/eligibility';
import { CURRENT_FORMAT_ID } from '@/lib/constants';
import type { PairSynergy, PokemonUsage, Replay } from '@/lib/types';
import LimitedDataNotice from '@/components/LimitedDataNotice';
import ReplayList from '@/components/ReplayList';
import Breadcrumbs from '@/components/Breadcrumbs';
import CopyPasteButton from '@/components/CopyPasteButton';

export const revalidate = 2592000; // ISR: Monthly

// Demo cores that always work in demo mode
const DEMO_CORES = new Set([
    'incineroar-rillaboom', 'flutter-mane-incineroar', 'pelipper-urshifu-rapid-strike',
    'chien-pao-flutter-mane', 'iron-hands-tornadus'
]);

interface PageProps {
    params: Promise<{ format_id: string; pair: string }>;
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

function formatPokemonName(slug: string): string {
    return slug.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { format_id, pair } = await params;
    const parsed = await parsePokemonPair(pair);
    if (!parsed) return { title: 'Core Not Found' };

    const nameA = formatPokemonName(parsed.a);
    const nameB = formatPokemonName(parsed.b);
    const formatName = getFormatName(format_id);

    return {
        // SEO Template: {A} + {B} Core Guide – VGC {FormatName} (1760+) | VGC Compass
        title: `${nameA} + ${nameB} Core Guide – VGC ${formatName} (1760+) | VGC Compass`,
        description: `Why ${nameA}+${nameB} works in VGC ${formatName}: pair rate, best third partners, sample teams to copy, and high-rated replay evidence.`,
    };
}

interface CorePageData {
    synergy: PairSynergy;
    usageA: PokemonUsage | null;
    usageB: PokemonUsage | null;
    replays: Replay[];
    status: 'full' | 'degraded';
    isDemo: boolean;
}

async function getCorePageData(formatId: string, pokemonA: string, pokemonB: string): Promise<CorePageData | null> {
    const timeBucket = await getLatestTimeBucket(formatId);
    const eligibility = await checkCoreEligibility(formatId, timeBucket, pokemonA, pokemonB);

    if (eligibility.status === '404') {
        const pairKey = pokemonA < pokemonB ? `${pokemonA}-${pokemonB}` : `${pokemonB}-${pokemonA}`;
        if (!DEMO_CORES.has(pairKey)) {
            return null;
        }
    }

    const [synergyData, usageDataA, usageDataB, replaysData] = await Promise.all([
        query<PairSynergy>(
            `SELECT * FROM pair_synergy 
             WHERE format_id = $1 AND time_bucket = $2 AND pokemon_a = $3 AND pokemon_b = $4 AND cutoff >= 1760`,
            [formatId, timeBucket, pokemonA, pokemonB]
        ),
        query<PokemonUsage>(
            'SELECT * FROM pokemon_usage WHERE format_id = $1 AND time_bucket = $2 AND pokemon = $3 AND cutoff >= 1760',
            [formatId, timeBucket, pokemonA]
        ),
        query<PokemonUsage>(
            'SELECT * FROM pokemon_usage WHERE format_id = $1 AND time_bucket = $2 AND pokemon = $3 AND cutoff >= 1760',
            [formatId, timeBucket, pokemonB]
        ),
        query<Replay>(
            `SELECT * FROM replays 
             WHERE format_id = $1 
             AND ((p1_team ? $2 AND p1_team ? $3) OR (p2_team ? $2 AND p2_team ? $3))
             AND rating_estimate >= 1760
             AND rating_source = 'official'
             ORDER BY rating_estimate DESC
             LIMIT 10`,
            [formatId, pokemonA, pokemonB]
        ),
    ]);

    if (synergyData.length > 0) {
        return {
            synergy: synergyData[0],
            usageA: usageDataA[0] || null,
            usageB: usageDataB[0] || null,
            replays: replaysData,
            status: eligibility.status as 'full' | 'degraded',
            isDemo: false,
        };
    }

    // Demo data
    const pairKey = pokemonA < pokemonB ? `${pokemonA}-${pokemonB}` : `${pokemonB}-${pokemonA}`;
    if (DEMO_CORES.has(pairKey)) {
        return {
            synergy: {
                id: 0,
                format_id: formatId,
                time_bucket: timeBucket,
                cutoff: 1760,
                pokemon_a: pokemonA,
                pokemon_b: pokemonB,
                pair_rate: 45.2,
                pair_sample_size: 1250,
                synergy_score: 85.5,
                common_partners: ['amoonguss', 'landorus-therian', 'tornadus'],
                common_archetypes: ['rain', 'balance'],
                sample_teams: [
                    {
                        pokemon: [pokemonA, pokemonB, 'amoonguss', 'landorus-therian', 'tornadus', 'chien-pao'],
                        paste: `${pokemonA}\n${pokemonB}\namoonguss\nlandorus-therian\ntornadus\nchien-pao`,
                        usage_count: 150,
                    }
                ],
                created_at: new Date(),
            } as PairSynergy,
            usageA: null,
            usageB: null,
            replays: [],
            status: 'full' as const,
            isDemo: true,
        };
    }

    return null;
}

export default async function CorePage({ params }: PageProps) {
    const { format_id, pair } = await params;

    if (format_id !== CURRENT_FORMAT_ID) {
        notFound();
    }

    const parsed = await parsePokemonPair(pair);
    if (!parsed) {
        notFound();
    }

    const data = await getCorePageData(format_id, parsed.a, parsed.b);

    if (!data) {
        notFound();
    }

    const formatName = getFormatName(format_id);
    const nameA = formatPokemonName(parsed.a);
    const nameB = formatPokemonName(parsed.b);

    return (
        <main className="min-h-screen bg-gray-950 text-white">
            <div className="container mx-auto px-4 py-8">
                <Breadcrumbs
                    items={[
                        { label: `${formatName} Meta Hub`, href: `/vgc/${format_id}/` },
                        { label: 'Top Cores', href: `/vgc/${format_id}/cores/` },
                        { label: `${nameA} + ${nameB}` },
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

                {/* H1: Unique, matches primary keyword "{A} + {B} Core" */}
                <header className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">{nameA} + {nameB} Core in VGC {formatName}</h1>
                    <p className="text-gray-400">
                        This core appears in <strong className="text-white">{data.synergy.pair_rate}%</strong> of 1760+ teams
                        (n={data.synergy.pair_sample_size}).
                    </p>
                </header>

                {/* H2: Summary */}
                <section className="bg-gray-900 rounded-lg p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">Summary</h2>
                    <p className="text-gray-300">
                        {nameA} and {nameB} form a powerful core in VGC {formatName}, appearing together in {data.synergy.pair_rate}% of teams.
                        This combination provides excellent synergy through complementary typing and support options.
                    </p>
                </section>

                {/* H2: Core Stats (1760+) */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Core Stats (1760+)</h2>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-gray-900 rounded-lg p-4 text-center">
                            <div className="text-3xl font-bold text-blue-400">{data.synergy.pair_rate}%</div>
                            <div className="text-gray-400">Pair Rate</div>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-4 text-center">
                            <div className="text-3xl font-bold text-green-400">{data.synergy.pair_sample_size}</div>
                            <div className="text-gray-400">Sample Size</div>
                        </div>
                        {data.synergy.synergy_score && (
                            <div className="bg-gray-900 rounded-lg p-4 text-center">
                                <div className="text-3xl font-bold text-purple-400">{data.synergy.synergy_score}</div>
                                <div className="text-gray-400">Synergy Score</div>
                            </div>
                        )}
                    </div>
                </section>

                {/* H2: Best Third Partners */}
                {data.synergy.common_partners && data.synergy.common_partners.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">Best Third Partners</h2>
                        <p className="text-gray-400 mb-4">Pokémon commonly seen alongside this core:</p>
                        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {data.synergy.common_partners.map((partner) => (
                                <Link
                                    key={partner}
                                    href={`/vgc/${format_id}/counter/how-to-beat-${partner}/`}
                                    className="bg-gray-900 rounded-lg p-4 text-center hover:bg-gray-800 transition-colors"
                                >
                                    <h3 className="font-semibold">{formatPokemonName(partner)}</h3>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* H2: Common Leads - placeholder for future data */}

                {/* H2: Sample Teams (Copy Paste) */}
                {data.synergy.sample_teams && data.synergy.sample_teams.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">Sample Teams (Copy Paste)</h2>
                        <div className="space-y-4">
                            {data.synergy.sample_teams.map((team, i) => (
                                <div key={i} className="bg-gray-900 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-wrap gap-2">
                                            {team.pokemon.map((pokemon) => (
                                                <span key={pokemon} className="bg-gray-700 text-gray-200 px-3 py-1 rounded capitalize">
                                                    {formatPokemonName(pokemon)}
                                                </span>
                                            ))}
                                        </div>
                                        {team.paste && <CopyPasteButton paste={team.paste} />}
                                    </div>
                                    {team.usage_count && (
                                        <p className="text-gray-400 text-sm">Seen in {team.usage_count} replays</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* H2: Replay Evidence */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Replay Evidence</h2>
                    <ReplayList replays={data.replays} />
                </section>

                {/* H2: Related Counter Guides */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Related Counter Guides</h2>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href={`/vgc/${format_id}/counter/how-to-beat-${parsed.a}/`}
                            className="bg-red-900/30 hover:bg-red-800/30 rounded-lg px-4 py-2 transition-colors"
                        >
                            How to Beat {nameA}
                        </Link>
                        <Link
                            href={`/vgc/${format_id}/counter/how-to-beat-${parsed.b}/`}
                            className="bg-red-900/30 hover:bg-red-800/30 rounded-lg px-4 py-2 transition-colors"
                        >
                            How to Beat {nameB}
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}
