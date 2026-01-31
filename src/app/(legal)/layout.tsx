import Link from 'next/link';
import { CURRENT_FORMAT_ID } from '@/lib/constants';

export default function LegalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {/* Header/Nav for legal pages */}
            <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
                <nav className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        <Link href={`/vgc/${CURRENT_FORMAT_ID}/`} className="text-xl font-bold text-white">
                            🧭 VGC Compass
                        </Link>
                        <div className="flex space-x-6 text-sm">
                            <Link href={`/vgc/${CURRENT_FORMAT_ID}/cores/`} className="text-gray-300 hover:text-white transition-colors">
                                Cores
                            </Link>
                            <Link href={`/vgc/${CURRENT_FORMAT_ID}/counters/`} className="text-gray-300 hover:text-white transition-colors">
                                Counters
                            </Link>
                            <Link href={`/vgc/${CURRENT_FORMAT_ID}/archetypes/`} className="text-gray-300 hover:text-white transition-colors">
                                Archetypes
                            </Link>
                        </div>
                    </div>
                </nav>
            </header>

            {children}

            {/* Footer for legal pages */}
            <footer className="bg-gray-900 border-t border-gray-800 py-8 mt-12">
                <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
                    <p className="mb-4">
                        VGC Compass is not affiliated with, endorsed by, or connected to The Pokémon Company, Nintendo, Game Freak, or Creatures Inc.
                        Pokémon and all related names are trademarks of their respective owners.
                        This is a fan-made tool for competitive VGC analysis.
                    </p>
                    <div className="flex justify-center flex-wrap gap-4 text-gray-500">
                        <Link href="/privacy/" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="/terms/" className="hover:text-white transition-colors">Terms</Link>
                        <Link href="/cookies/" className="hover:text-white transition-colors">Cookie Policy</Link>
                        <Link href="/disclaimer/" className="hover:text-white transition-colors">Disclaimer</Link>
                        <Link href="/contact/" className="hover:text-white transition-colors">Contact</Link>
                    </div>
                </div>
            </footer>
        </>
    );
}
