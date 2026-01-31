import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CURRENT_FORMAT_ID, ARCHETYPE_WHITELIST, ARCHETYPE_DATA } from '@/lib/constants';
import Breadcrumbs from '@/components/Breadcrumbs';

export const revalidate = 86400;

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
        // SEO Template: Team Archetypes in VGC {FormatName} | VGC Compass
        title: `Team Archetypes in VGC ${formatName} | VGC Compass`,
        description: `Explore common team archetypes in VGC ${formatName} with key cores, sample teams, and replay evidence.`,
    };
}

export default async function ArchetypesIndexPage({ params }: PageProps) {
    const { format_id } = await params;

    if (format_id !== CURRENT_FORMAT_ID) {
        notFound();
    }

    const formatName = getFormatName(format_id);

    return (
        <main className="min-h-screen bg-gray-950 text-white">
            <div className="container mx-auto px-4 py-8">
                <Breadcrumbs
                    items={[
                        { label: `${formatName} Meta Hub`, href: `/vgc/${format_id}/` },
                        { label: 'Team Archetypes' },
                    ]}
                />

                {/* H1: Unique, matches primary keyword */}
                <header className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Team Archetypes in VGC {formatName}</h1>
                    <p className="text-gray-400">
                        Common team structures and strategies in the current meta.
                    </p>
                </header>

                {/* H2: Archetypes (MVP Set) */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6">Archetypes (MVP Set)</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ARCHETYPE_WHITELIST.map((slug) => {
                            const data = ARCHETYPE_DATA[slug];
                            return (
                                <Link
                                    key={slug}
                                    href={`/vgc/${format_id}/archetype/${slug}/`}
                                    className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition-colors"
                                >
                                    <div className="text-4xl mb-4">{data.icon}</div>
                                    <h3 className="text-xl font-bold mb-2">{data.name} Teams</h3>
                                    <p className="text-gray-400 text-sm mb-4">{data.description}</p>
                                    <div className="flex gap-2">
                                        {data.keyPokemon.slice(0, 3).map((pokemon) => (
                                            <span
                                                key={pokemon}
                                                className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded capitalize"
                                            >
                                                {pokemon.split('-')[0]}
                                            </span>
                                        ))}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>

                {/* H2: How Archetypes Are Tagged */}
                <section className="mb-12 bg-gray-900 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">How Archetypes Are Tagged</h2>
                    <p className="text-gray-300 mb-4">
                        Teams are automatically tagged with archetypes based on key Pokémon presence:
                    </p>
                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                        <li><strong>Rain:</strong> Teams with Pelipper, Politoed, or weather-dependent Water types</li>
                        <li><strong>Sun:</strong> Teams with Torkoal, Koraidon, or Chlorophyll users</li>
                        <li><strong>Trick Room:</strong> Teams with dedicated setters (Hatterene, Dusclops, Farigiraf)</li>
                        <li><strong>Tailwind:</strong> Teams with Tornadus, Whimsicott, or Talonflame</li>
                        <li><strong>Balance:</strong> Teams with flexible speed control and broad coverage</li>
                    </ul>
                </section>
            </div>
        </main>
    );
}
