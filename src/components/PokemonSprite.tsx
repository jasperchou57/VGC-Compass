import Image from 'next/image';

interface PokemonSpriteProps {
    pokemon: string;
    size?: number;
    className?: string;
}

// Convert slug to PokeAPI sprite ID format
function getSpriteName(slug: string): string {
    // Handle special cases
    const specialMappings: Record<string, string> = {
        'urshifu-rapid-strike': 'urshifu-rapid-strike',
        'landorus-therian': 'landorus-therian',
        'indeedee-f': 'indeedee-female',
        'calyrex-ice': 'calyrex-ice-rider',
        'calyrex-shadow': 'calyrex-shadow-rider',
    };

    return specialMappings[slug] || slug;
}

export default function PokemonSprite({ pokemon, size = 96, className = '' }: PokemonSpriteProps) {
    const spriteName = getSpriteName(pokemon);
    const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${getPokedexNumber(spriteName)}.png`;
    const fallbackUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${getPokedexNumber(spriteName)}.png`;

    return (
        <div className={`relative ${className}`} style={{ width: size, height: size }}>
            <Image
                src={spriteUrl}
                alt={pokemon}
                width={size}
                height={size}
                className="object-contain"
                unoptimized
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = fallbackUrl;
                }}
            />
        </div>
    );
}

// Map common VGC Pokemon to their Pokedex numbers
function getPokedexNumber(slug: string): number {
    const pokedex: Record<string, number> = {
        'incineroar': 727,
        'flutter-mane': 987,
        'rillaboom': 812,
        'urshifu-rapid-strike': 892,
        'landorus-therian': 645,
        'iron-hands': 992,
        'tornadus': 641,
        'amoonguss': 591,
        'chien-pao': 1002,
        'pelipper': 279,
        'chi-yu': 1004,
        'iron-bundle': 991,
        'great-tusk': 984,
        'arcanine': 59,
        'cresselia': 488,
        'hatterene': 858,
        'indeedee-female': 876,
        'torkoal': 324,
        'whimsicott': 547,
        'venusaur': 3,
        'kyogre': 382,
        'groudon': 383,
        'miraidon': 1008,
        'koraidon': 1007,
        'calyrex': 898,
        'calyrex-ice-rider': 898,
        'calyrex-shadow-rider': 898,
        'ursaluna': 901,
        'murkrow': 198,
    };

    return pokedex[slug] || 1; // Default to Bulbasaur if not found
}
