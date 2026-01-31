import Link from 'next/link';
import { CURRENT_FORMAT_ID } from '@/lib/constants';

export default function Navigation() {
    return (
        <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href={`/vgc/${CURRENT_FORMAT_ID}/`} className="flex items-center space-x-2">
                        <span className="text-2xl">🧭</span>
                        <span className="font-bold text-lg">VGC Compass</span>
                    </Link>

                    {/* Nav Links */}
                    <div className="hidden md:flex items-center space-x-6">
                        <Link
                            href={`/vgc/${CURRENT_FORMAT_ID}/`}
                            className="text-gray-300 hover:text-white transition-colors"
                        >
                            Meta Hub
                        </Link>
                        <Link
                            href={`/vgc/${CURRENT_FORMAT_ID}/cores/`}
                            className="text-gray-300 hover:text-white transition-colors"
                        >
                            Cores
                        </Link>
                        <Link
                            href={`/vgc/${CURRENT_FORMAT_ID}/counters/`}
                            className="text-gray-300 hover:text-white transition-colors"
                        >
                            Counters
                        </Link>
                        <Link
                            href={`/vgc/${CURRENT_FORMAT_ID}/archetypes/`}
                            className="text-gray-300 hover:text-white transition-colors"
                        >
                            Archetypes
                        </Link>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <div className="md:hidden">
                        <span className="text-gray-400 text-sm">REG F</span>
                    </div>
                </div>
            </div>
        </nav>
    );
}
