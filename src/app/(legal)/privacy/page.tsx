import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy - VGC Compass',
    description: 'Privacy Policy for VGC Compass - how we collect, use, and protect your information.',
};

export default function PrivacyPage() {
    return (
        <main className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

            <p className="text-gray-400 mb-8">Last updated: 2026-01-31</p>

            <div className="prose prose-invert max-w-none space-y-6">
                <p>
                    This Privacy Policy explains how VGC Compass (&quot;we&quot;, &quot;our&quot;, &quot;this site&quot;) collects, uses, and protects information when you use our website.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
                <p>We may collect the following types of information:</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li><strong>Usage data:</strong> pages viewed, clicks, referring pages, approximate location (country/region), device type, browser type, and general interaction events.</li>
                    <li><strong>Technical data:</strong> IP address, user agent, timestamps, and diagnostic logs for security and performance.</li>
                    <li><strong>Cookies and similar technologies:</strong> used to remember preferences and measure site performance.</li>
                    <li><strong>Contact information (optional):</strong> if you email us, we may receive your email address and the contents of your message.</li>
                </ul>
                <p>We do not require user accounts and we do not intentionally collect sensitive personal data.</p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Information</h2>
                <p>We use information to:</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li>operate and maintain the website;</li>
                    <li>improve content quality and user experience;</li>
                    <li>measure performance and usage trends;</li>
                    <li>prevent abuse, spam, or malicious activity;</li>
                    <li>respond to inquiries and support requests.</li>
                </ul>

                <h2 className="text-2xl font-semibold mt-8 mb-4">3. Analytics and Advertising Partners</h2>
                <p>
                    We may use third-party services (for example, analytics providers or advertising networks) that collect information through cookies or similar technologies to help us understand website usage and/or display ads.
                </p>
                <p>
                    These third parties may collect information such as IP address, device identifiers, browser information, and usage events, subject to their own privacy policies.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Sharing</h2>
                <p>We do not sell your personal information. We may share limited information only when:</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li>required by law or legal process;</li>
                    <li>necessary to protect the security and integrity of the website;</li>
                    <li>using service providers that process data on our behalf (e.g., hosting, analytics).</li>
                </ul>

                <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Retention</h2>
                <p>
                    We keep logs and analytics data only as long as needed for operational and security purposes. Retention periods may vary depending on the service provider.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">6. Your Choices</h2>
                <p>You can:</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li>block or delete cookies via your browser settings;</li>
                    <li>use browser features or extensions to limit tracking;</li>
                    <li>contact us to request deletion of information you provided via email.</li>
                </ul>

                <h2 className="text-2xl font-semibold mt-8 mb-4">7. Children&apos;s Privacy</h2>
                <p>
                    This site is not intended for children under 13. We do not knowingly collect personal information from children.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">8. Contact</h2>
                <p>If you have questions about this policy, contact us at:</p>
                <p><strong>Email:</strong> contact@vgccompass.com</p>
            </div>
        </main>
    );
}
