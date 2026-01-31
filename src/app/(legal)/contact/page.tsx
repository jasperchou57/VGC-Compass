import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Contact - VGC Compass',
    description: 'Contact VGC Compass for corrections, questions, partnerships, or rights-related requests.',
};

export default function ContactPage() {
    return (
        <main className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Contact</h1>

            <p className="text-gray-400 mb-8">Last updated: 2026-01-31</p>

            <div className="prose prose-invert max-w-none space-y-6">
                <p>
                    For corrections, questions, partnerships, or rights-related requests, contact us:
                </p>

                <p className="text-xl">
                    <strong>Email:</strong>{' '}
                    <a href="mailto:contact@vgccompass.com" className="text-blue-400 hover:text-blue-300">
                        contact@vgccompass.com
                    </a>
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">Please Include</h2>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li>the page URL</li>
                    <li>a short description of the issue</li>
                    <li>any supporting links or evidence</li>
                </ul>
            </div>
        </main>
    );
}
