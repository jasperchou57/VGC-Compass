import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Cookie Policy - VGC Compass',
    description: 'Cookie Policy for VGC Compass - how we use cookies and similar technologies.',
};

export default function CookiesPage() {
    return (
        <main className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Cookie Policy</h1>

            <p className="text-gray-400 mb-8">Last updated: 2026-01-31</p>

            <div className="prose prose-invert max-w-none space-y-6">
                <p>
                    This Cookie Policy explains how VGC Compass uses cookies and similar technologies.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">1. What Are Cookies?</h2>
                <p>
                    Cookies are small text files stored on your device that help websites function, remember preferences, and measure performance.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Cookies</h2>
                <p>We may use cookies to:</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li>keep the site working reliably;</li>
                    <li>remember basic preferences;</li>
                    <li>analyze usage and improve content;</li>
                    <li>(if enabled) support advertising and measurement.</li>
                </ul>

                <h2 className="text-2xl font-semibold mt-8 mb-4">3. Types of Cookies</h2>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li><strong>Essential cookies:</strong> needed for basic site operation.</li>
                    <li><strong>Analytics cookies:</strong> help us understand traffic and user behavior.</li>
                    <li><strong>Advertising cookies (if enabled):</strong> used by ad partners to measure and deliver ads.</li>
                </ul>

                <h2 className="text-2xl font-semibold mt-8 mb-4">4. Managing Cookies</h2>
                <p>You can control cookies through your browser settings:</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li>block cookies entirely;</li>
                    <li>delete cookies already stored;</li>
                    <li>restrict third-party cookies.</li>
                </ul>
                <p>Blocking cookies may affect site functionality.</p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">5. Contact</h2>
                <p><strong>Email:</strong> contact@vgccompass.com</p>
            </div>
        </main>
    );
}
