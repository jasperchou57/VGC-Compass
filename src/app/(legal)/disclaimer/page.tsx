import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Disclaimer - VGC Compass',
    description: 'Disclaimer for VGC Compass - non-affiliation notice, data sources, and limitations.',
};

export default function DisclaimerPage() {
    return (
        <main className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Disclaimer</h1>

            <p className="text-gray-400 mb-8">Last updated: 2026-01-31</p>

            <div className="prose prose-invert max-w-none space-y-6">
                <h2 className="text-2xl font-semibold mt-8 mb-4">1. Non-Affiliation</h2>
                <p>
                    VGC Compass is a fan-made resource. It is not affiliated with, endorsed by, or connected to The Pokémon Company, Nintendo, Game Freak, or Creatures Inc.
                </p>
                <p>
                    &quot;Pokémon&quot; and all related names are trademarks of their respective owners.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">2. Data Sources and Limitations</h2>
                <p>This site may use publicly available data sources such as:</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li>Smogon usage statistics (high-rating cutoff data)</li>
                    <li>Pokémon Showdown public replays and replay logs</li>
                </ul>
                <p>
                    Data may be delayed, incomplete, or affected by sampling bias. Replay-based insights reflect correlation patterns, not guaranteed causation.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">3. No Competitive Guarantee</h2>
                <p>
                    Guides and recommendations are provided for informational purposes. Competitive outcomes depend on many factors (matchups, skill, preparation, RNG, team context). We do not guarantee results.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">4. Copyright and Content Use</h2>
                <p>
                    We avoid using official artwork/sprites. If you believe any content infringes your rights, please contact us with details so we can review and respond.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">5. Contact</h2>
                <p><strong>Email:</strong> contact@vgccompass.com</p>
            </div>
        </main>
    );
}
