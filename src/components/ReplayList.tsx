import type { Replay } from '@/lib/types';

interface ReplayListProps {
    replays: Replay[];
}

function formatDate(date: Date | null): string {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatTeam(team: string[]): string {
    return team
        .slice(0, 6)
        .map(slug =>
            slug
                .split('-')
                .map(part => part.charAt(0).toUpperCase())
                .join('')
        )
        .join(' / ');
}

export default function ReplayList({ replays }: ReplayListProps) {
    if (replays.length === 0) {
        return (
            <div className="bg-gray-900 rounded-lg p-6 text-center text-gray-400">
                <p>No replay evidence available yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {replays.map((replay) => (
                <a
                    key={replay.replay_id}
                    href={`https://replay.pokemonshowdown.com/${replay.replay_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-gray-900 rounded-lg p-4 hover:bg-gray-800 transition-colors"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                            {replay.rating_estimate && (
                                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                                    {replay.rating_estimate}
                                </span>
                            )}
                            {replay.rating_source === 'official' && (
                                <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                                    Official Rating
                                </span>
                            )}
                        </div>
                        <span className="text-gray-400 text-sm">{formatDate(replay.played_at)}</span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className={`font-medium ${replay.winner_side === 1 ? 'text-green-400' : 'text-gray-300'}`}>
                                {replay.winner_side === 1 ? '🏆 ' : ''}P1:
                            </span>
                            <span className="text-gray-400 ml-2">{formatTeam(replay.p1_team)}</span>
                        </div>
                        <div>
                            <span className={`font-medium ${replay.winner_side === 2 ? 'text-green-400' : 'text-gray-300'}`}>
                                {replay.winner_side === 2 ? '🏆 ' : ''}P2:
                            </span>
                            <span className="text-gray-400 ml-2">{formatTeam(replay.p2_team)}</span>
                        </div>
                    </div>

                    {replay.tags && replay.tags.length > 0 && (
                        <div className="flex gap-2 mt-3">
                            {replay.tags.map(tag => (
                                <span key={tag} className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded capitalize">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </a>
            ))}
        </div>
    );
}
