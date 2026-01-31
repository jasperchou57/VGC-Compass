import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-gray-900 border-t border-gray-800 mt-12">
            <div className="container mx-auto px-4 py-8">
                <div className="grid md:grid-cols-3 gap-8">
                    {/* About */}
                    <div>
                        <h3 className="font-bold text-lg mb-4">🧭 VGC Compass</h3>
                        <p className="text-gray-400 text-sm">
                            Data-driven insights for competitive VGC players.
                            All statistics derived from high-rating ladder and tournament replays.
                        </p>
                    </div>

                    {/* Data Sources */}
                    <div>
                        <h3 className="font-bold text-lg mb-4">Data Sources</h3>
                        <ul className="text-gray-400 text-sm space-y-2">
                            <li>• Pokémon Showdown Usage Stats</li>
                            <li>• Official Tournament Replays</li>
                            <li>• Rating ≥1760 Games</li>
                        </ul>
                    </div>

                    {/* Disclaimer */}
                    <div>
                        <h3 className="font-bold text-lg mb-4">Disclaimer</h3>
                        <p className="text-gray-400 text-sm">
                            This is a fan-made resource.
                            Pokémon and all related properties are © Nintendo/Game Freak.
                        </p>
                    </div>
                </div>

                <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
                    <div className="mb-4 md:mb-0">
                        © {new Date().getFullYear()} VGC Compass. Built for the competitive Pokémon community.
                    </div>

                    {/* Compliance Links (P2-1) */}
                    <div className="flex space-x-6">
                        <Link href="/about" className="hover:text-blue-400 transition-colors">About</Link>
                        <Link href="/contact" className="hover:text-blue-400 transition-colors">Contact</Link>
                        <Link href="/privacy" className="hover:text-blue-400 transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-blue-400 transition-colors">Terms</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
