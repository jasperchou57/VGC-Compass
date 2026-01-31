import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { query, getLatestTimeBucket } from '@/lib/db';
import { checkArchetypeEligibility } from '@/lib/eligibility';
import { CURRENT_FORMAT_ID, ARCHETYPE_DATA } from '@/lib/constants';
import type { Archetype, Replay } from '@/lib/types';
import ReplayList from '@/components/ReplayList';
import Breadcrumbs from '@/components/Breadcrumbs';
import CopyPasteButton from '@/components/CopyPasteButton';

export const revalidate = 2592000; // ISR: Monthly

interface PageProps {
    params: Promise<{ format_id: string; slug: string }>;
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
    const { format_id, slug } = await params;
    const data = ARCHETYPE_DATA[slug as keyof typeof ARCHETYPE_DATA];
    if (!data) return { title: 'Archetype Not Found' };

    const formatName = getFormatName(format_id);

    return {
        // SEO Template: {ArchetypeName} Teams – VGC {FormatName} | VGC Meta Compass
        title: `${data.name} Teams – VGC ${formatName} | VGC Meta Compass`,
        description: `What defines ${data.name} in VGC ${formatName}: key Pokémon, common cores, weaknesses, sample teams to copy, and replay evidence.`,
    };
}

interface ArchetypePageData {
    archetype: Archetype;
    replays: Replay[];
    isDemo: boolean;
}

async function getArchetypePageData(formatId: string, slug: string): Promise<ArchetypePageData | null> {
    const timeBucket = await getLatestTimeBucket(formatId);
    const eligibility = checkArchetypeEligibility(slug);

    if (eligibility.status === '404') {
        return null;
    }

    const staticData = ARCHETYPE_DATA[slug as keyof typeof ARCHETYPE_DATA];
    if (!staticData) {
        return null;
    }

    const [archetypeData, replaysData] = await Promise.all([
        query<Archetype>(
            `SELECT * FROM archetypes WHERE format_id = $1 AND time_bucket = $2 AND archetype_slug = $3`,
            [formatId, timeBucket, slug]
        ),
        query<Replay>(
            `SELECT * FROM replays 
             WHERE format_id = $1 AND $2 = ANY(tags)
             AND rating_estimate >= 1760
             AND rating_source = 'official'
             ORDER BY rating_estimate DESC
             LIMIT 10`,
            [formatId, slug]
        ),
    ]);

    if (archetypeData.length > 0) {
        return {
            archetype: archetypeData[0],
            replays: replaysData,
            isDemo: false,
        };
    }

    // Demo data
    return {
        archetype: {
            id: 0,
            format_id: formatId,
            time_bucket: timeBucket,
            archetype_slug: slug,
            name: staticData.name,
            description: staticData.description,
            icon: staticData.icon,
            key_pokemon: staticData.keyPokemon,
            strengths: staticData.strengths,
            weaknesses: staticData.weaknesses,
            meta_share: 15.5,
            sample_teams: [
                {
                    pokemon: staticData.keyPokemon.slice(0, 6),
                    paste: staticData.keyPokemon.slice(0, 6).join('\n'),
                    usage_count: 50,
                }
            ],
            created_at: new Date(),
        } as Archetype,
        replays: [],
        isDemo: true,
    };
}

export default async function ArchetypePage({ params }: PageProps) {
    const { format_id, slug } = await params;

    if (format_id !== CURRENT_FORMAT_ID) {
        notFound();
    }

    const data = await getArchetypePageData(format_id, slug);

    if (!data) {
        notFound();
    }

    const formatName = getFormatName(format_id);
    const staticData = ARCHETYPE_DATA[slug as keyof typeof ARCHETYPE_DATA];

    return (
        <main className="min-h-screen bg-gray-950 text-white">
            <div className="container mx-auto px-4 py-8">
                <Breadcrumbs
                    items={[
                        { label: `${formatName} Meta Hub`, href: `/vgc/${format_id}/` },
                        { label: 'Team Archetypes', href: `/vgc/${format_id}/archetypes/` },
                        { label: `${data.archetype.name} Teams` },
                    ]}
                />

                {data.isDemo && (
                    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
                        <p className="text-blue-200 text-center">
                            📊 <strong>Demo Mode</strong> – Showing sample data.
                        </p>
                    </div>
                )}

                {/* H1: Unique, matches primary keyword "{ArchetypeName} Teams" */}
                <header className="mb-8">
                    <div className="flex items-center gap-4 mb-2">
                        <span className="text-5xl">{staticData?.icon || '🏛️'}</span>
                        <h1 className="text-3xl font-bold">{data.archetype.name} Teams in VGC {formatName}</h1>
                    </div>
                </header>

                {/* H2: Overview */}
                <section className="bg-gray-900 rounded-lg p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">Overview</h2>
                    <p className="text-gray-300">{data.archetype.description}</p>
                    {data.archetype.meta_share && (
                        <p className="text-gray-400 mt-3">
                            Meta Share: <strong className="text-white">{data.archetype.meta_share}%</strong>
                        </p>
                    )}
                </section>

                {/* H2: Key Pokémon */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Key Pokémon</h2>
                    <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {data.archetype.key_pokemon?.map((pokemon) => (
                            <Link
                                key={pokemon}
                                href={`/vgc/${format_id}/counter/how-to-beat-${pokemon}/`}
                                className="bg-gray-900 rounded-lg p-4 text-center hover:bg-gray-800 transition-colors"
                            >
                                <h3 className="font-semibold">{formatPokemonName(pokemon)}</h3>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* H2: Common Cores */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Common Cores</h2>
                    <div className="flex flex-wrap gap-3">
                        {data.archetype.key_pokemon && data.archetype.key_pokemon.length >= 2 && (
                            <Link
                                href={`/vgc/${format_id}/core/${data.archetype.key_pokemon[0]}-${data.archetype.key_pokemon[1]}/`}
                                className="bg-blue-900/30 hover:bg-blue-800/30 rounded-lg px-4 py-2 transition-colors"
                            >
                                {formatPokemonName(data.archetype.key_pokemon[0])} + {formatPokemonName(data.archetype.key_pokemon[1])} core
                            </Link>
                        )}
                        <Link
                            href={`/vgc/${format_id}/cores/`}
                            className="bg-gray-700 hover:bg-gray-600 rounded-lg px-4 py-2 transition-colors"
                        >
                            View all cores →
                        </Link>
                    </div>
                </section>

                {/* H2: Weaknesses and Counters */}
                <section className="grid md:grid-cols-2 gap-8 mb-8">
                    <div className="bg-green-900/20 border border-green-700 rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4 text-green-400">Strengths</h2>
                        <ul className="space-y-2">
                            {data.archetype.strengths?.map((strength, i) => (
                                <li key={i} className="text-gray-300">• {strength}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4 text-red-400">Weaknesses and Counters</h2>
                        <ul className="space-y-2">
                            {data.archetype.weaknesses?.map((weakness, i) => (
                                <li key={i} className="text-gray-300">• {weakness}</li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* H2: Sample Teams (Copy Paste) */}
                {data.archetype.sample_teams && data.archetype.sample_teams.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">Sample Teams (Copy Paste)</h2>
                        <div className="space-y-4">
                            {data.archetype.sample_teams.map((team, i) => (
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
            </div>
        </main>
    );
}
