import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service - VGC Compass',
    description: 'Terms of Service for VGC Compass - guidelines for using our competitive Pokémon VGC analysis website.',
};

export default function TermsPage() {
    return (
        <main className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

            <p className="text-gray-400 mb-8">Last updated: 2026-01-31</p>

            <div className="prose prose-invert max-w-none space-y-6">
                <p>
                    By accessing or using VGC Compass (&quot;this site&quot;), you agree to these Terms of Service. If you do not agree, please do not use the site.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">1. Purpose of the Site</h2>
                <p>
                    VGC Compass provides meta analysis, usage summaries, archetype guides, and replay-based evidence for competitive Pokémon VGC formats. Content is for informational purposes only.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">2. No Guarantees</h2>
                <p>We do not guarantee:</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li>accuracy, completeness, or timeliness of any data or recommendations;</li>
                    <li>that any strategy will work in all matches;</li>
                    <li>uninterrupted availability of the website.</li>
                </ul>
                <p>Use the site at your own risk.</p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">3. Intellectual Property and Trademarks</h2>
                <p>
                    This site is fan-made and is not affiliated with or endorsed by The Pokémon Company, Nintendo, Game Freak, or Creatures Inc.
                    &quot;Pokémon&quot; and related names are trademarks of their respective owners.
                </p>
                <p>
                    We publish original text, layout, and presentation. Data and factual statistics may come from public sources.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">4. Acceptable Use</h2>
                <p>You agree not to:</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li>attempt to disrupt, overload, or damage the site;</li>
                    <li>use automated scraping that harms performance or violates rate limits;</li>
                    <li>reverse engineer or exploit the site;</li>
                    <li>use the site for illegal or abusive purposes.</li>
                </ul>
                <p>We may block access to protect the service.</p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">5. Changes and Termination</h2>
                <p>
                    We may update the site, modify features, or discontinue parts of the service at any time. We may update these Terms periodically by posting a new version on this page.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">6. Limitation of Liability</h2>
                <p>
                    To the maximum extent permitted by law, we are not liable for any damages arising from your use of the site, including losses from gameplay decisions, tournaments, rankings, or related activities.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">7. Contact</h2>
                <p>Questions about these Terms:</p>
                <p><strong>Email:</strong> contact@vgccompass.com</p>
            </div>
        </main>
    );
}
