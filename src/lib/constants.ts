// ============================================================
// FROZEN CONSTANTS - DO NOT MODIFY (See FROZEN_SPEC.md)
// ============================================================

// Format Configuration
export const CURRENT_FORMAT_ID = 'reg-f';

// Stats Cutoffs
export const STATS_CUTOFF = 1760;      // For usage/pair data
export const REPLAY_FETCH_CUTOFF = 1700; // For replay fetching
export const REPLAY_SSR_CUTOFF = 1760;   // For SSR Top10 display

// Page Eligibility Thresholds
export const CORE_MIN_SAMPLE_SIZE = 200;
export const COUNTER_MIN_USAGE_RATE = 2.0; // percentage
export const COUNTER_MIN_WINS = 300;
export const COUNTER_MIN_LOSSES = 300;
export const EFFECTIVENESS_MIN_SCORE = 10.0; // percentage

// Replay Requirements
export const REPLAY_FULL_THRESHOLD = 10;    // For Full page (1760+, official)
export const REPLAY_DEGRADED_THRESHOLD = 20; // For Degraded page (1700+)

// Archetype Whitelist (FROZEN)
export const ARCHETYPE_WHITELIST = [
    'rain',
    'sun',
    'trick-room',
    'tailwind',
    'balance',
] as const;

export type ArchetypeSlug = typeof ARCHETYPE_WHITELIST[number];

// Rating Source
export type RatingSource = 'official' | null;

// Data Retention
export const DATA_RETENTION_MONTHS = 6;

// Archetype Detection Thresholds
export const TRICK_ROOM_MAX_SPEED = 50;
export const TRICK_ROOM_MIN_SLOW_COUNT = 2;
export const TAILWIND_MIN_SPEED = 80;
export const TAILWIND_MIN_FAST_COUNT = 3;

// Archetype Key Pokemon Lists
export const RAIN_SETTERS = ['pelipper', 'politoed'];
export const SUN_SETTERS = ['torkoal', 'koraidon'];
export const TRICK_ROOM_SETTERS = ['farigiraf', 'porygon2', 'dusclops', 'hatterene', 'indeedee-f'];
export const TAILWIND_SETTERS = ['tornadus', 'whimsicott', 'talonflame', 'murkrow'];
export const DRIZZLE_ABILITY = 'drizzle';
export const DROUGHT_ABILITY = 'drought';

// Archetype Static Data
export const ARCHETYPE_DATA: Record<ArchetypeSlug, {
    name: string;
    icon: string;
    description: string;
    keyPokemon: string[];
    strengths: string[];
    weaknesses: string[];
}> = {
    rain: {
        name: 'Rain',
        icon: '🌧️',
        description: 'Weather-based archetype centered around Drizzle and Water-type attackers.',
        keyPokemon: ['pelipper', 'urshifu-rapid-strike', 'kingdra', 'floatzel', 'basculegion', 'archaludon'],
        strengths: [
            'Strong offensive pressure with Swift Swim users',
            'Weakens Fire-type attacks',
            'Hurricane always hits in rain',
            'Thunder always hits in rain',
        ],
        weaknesses: [
            'Weather wars with Sun and other setters',
            'Electric-type weakness shared by many rain Pokemon',
            'Grass-type moves threaten Water-types',
        ],
    },
    sun: {
        name: 'Sun',
        icon: '☀️',
        description: 'Weather-based archetype using Drought to power up Fire-types and enable Chlorophyll.',
        keyPokemon: ['torkoal', 'venusaur', 'koraidon', 'gouging-fire', 'entei', 'armarouge'],
        strengths: [
            'Chlorophyll users outspeed most threats',
            'Fire-type moves boosted by 50%',
            'Water-type moves weakened by 50%',
            'Growth doubles both Attack and SpA',
        ],
        weaknesses: [
            'Weather wars with Rain teams',
            'Rock-type coverage threatens Fire-types',
            'Drought setters can be slow and vulnerable',
        ],
    },
    'trick-room': {
        name: 'Trick Room',
        icon: '🔮',
        description: 'Speed-reversal archetype using slow but powerful Pokemon under Trick Room.',
        keyPokemon: ['farigiraf', 'hatterene', 'indeedee-f', 'torkoal', 'dusclops', 'ursaluna'],
        strengths: [
            'Slow Pokemon become speed demons',
            'Can ignore speed control from opponents',
            'Powerful bulk and offensive stats on slow mons',
            'Psychic Terrain blocks priority moves',
        ],
        weaknesses: [
            'Relies on setting up Trick Room',
            'Taunt shuts down the strategy',
            'Limited to 4-5 turns of reversed speed',
            'Fast teams can pressure before TR goes up',
        ],
    },
    tailwind: {
        name: 'Tailwind',
        icon: '💨',
        description: 'Speed-based archetype using Tailwind to double team speed for 4 turns.',
        keyPokemon: ['tornadus', 'whimsicott', 'talonflame', 'murkrow', 'kilowattrel', 'jumpluff'],
        strengths: [
            'Doubles speed for entire team',
            'Enables slower offensive Pokemon',
            'Prankster users set up before opponents move',
            'Stacks with other speed boosts',
        ],
        weaknesses: [
            'Only lasts 4 turns',
            'Prankster blocked by Dark-types',
            'Can be countered by opposing Tailwind or Trick Room',
            'Setter can be knocked out before using Tailwind',
        ],
    },
    balance: {
        name: 'Balance',
        icon: '⚖️',
        description: 'Flexible archetype with good type coverage and adaptable game plans.',
        keyPokemon: ['incineroar', 'rillaboom', 'landorus-therian', 'flutter-mane', 'amoonguss', 'iron-hands'],
        strengths: [
            'Adaptable to many matchups',
            'Strong defensive pivoting options',
            'Fake Out and Intimidate pressure',
            'Can pivot between offensive and defensive plays',
        ],
        weaknesses: [
            'May lack explosive damage',
            'Can struggle vs dedicated archetypes',
            'Requires good game sense to pilot',
            'No singular win condition',
        ],
    },
};
