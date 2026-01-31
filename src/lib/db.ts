import { Pool } from 'pg';
import { CURRENT_FORMAT_ID } from './constants';

// Check if DATABASE_URL is a valid URL (not a placeholder)
function isValidDatabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  // Check for placeholder values
  if (url.includes('user:password') || url.includes('host:port')) {
    return false;
  }
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Database connection pool - only create if DATABASE_URL is valid
const pool = isValidDatabaseUrl(process.env.DATABASE_URL)
  ? new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })
  : null;

// Custom error class for database unavailability
export class DatabaseUnavailableError extends Error {
  constructor(message: string = 'Database connection unavailable') {
    super(message);
    this.name = 'DatabaseUnavailableError';
  }
}

// Helper function to query the database
export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  if (!pool) {
    // Log this as a warning - in production this is critical but we don't want to crash pages
    if (process.env.NODE_ENV === 'production') {
      console.error('[CRITICAL] DATABASE_URL not configured in production - pages will show demo data');
    } else {
      console.warn('Database not configured. Set a valid DATABASE_URL in .env.local');
    }
    return [];
  }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows as T[];
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[DB Query Error]', error);
    // Return empty array on query error to prevent page crashes
    return [];
  }
}

// Cache for latest bucket to avoid repeated queries
let cachedLatestBucket: { value: string; timestamp: number } | null = null;
const BUCKET_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get the latest time_bucket from the database.
 * Falls back to current month if no data or DB not configured.
 * Cached for 1 hour to reduce DB load.
 */
export async function getLatestTimeBucket(formatId: string = CURRENT_FORMAT_ID): Promise<string> {
  const now = Date.now();
  const fallback = new Date().toISOString().slice(0, 7);

  // Return cached value if still valid
  if (cachedLatestBucket && (now - cachedLatestBucket.timestamp) < BUCKET_CACHE_TTL) {
    return cachedLatestBucket.value;
  }

  if (!pool) {
    return fallback;
  }

  try {
    const result = await query<{ max: string }>(
      'SELECT MAX(time_bucket) as max FROM pokemon_usage WHERE format_id = $1',
      [formatId]
    );
    const bucket = result[0]?.max || fallback;
    cachedLatestBucket = { value: bucket, timestamp: now };
    return bucket;
  } catch (error) {
    console.error('Error fetching latest bucket:', error);
    return fallback;
  }
}

/**
 * Get the last two time_buckets for rise/fall calculations.
 * Returns [current, previous] or [current, null] if only one exists.
 */
export async function getLastTwoBuckets(formatId: string = CURRENT_FORMAT_ID): Promise<[string, string | null]> {
  const current = await getLatestTimeBucket(formatId);

  if (!pool) {
    return [current, null];
  }

  try {
    const result = await query<{ time_bucket: string }>(
      `SELECT DISTINCT time_bucket FROM pokemon_usage 
       WHERE format_id = $1 AND time_bucket < $2 
       ORDER BY time_bucket DESC LIMIT 1`,
      [formatId, current]
    );
    const previous = result[0]?.time_bucket || null;
    return [current, previous];
  } catch (error) {
    console.error('Error fetching previous bucket:', error);
    return [current, null];
  }
}

// Cache for pokemon slugs
let cachedPokemonSlugs: { value: Set<string>; timestamp: number } | null = null;
const SLUGS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get all known Pokemon slugs from pokemon_dim table.
 * Cached for 24 hours. Returns demo set if DB not configured.
 */
export async function getPokemonSlugs(): Promise<Set<string>> {
  const now = Date.now();

  // Return cached value if still valid
  if (cachedPokemonSlugs && (now - cachedPokemonSlugs.timestamp) < SLUGS_CACHE_TTL) {
    return cachedPokemonSlugs.value;
  }

  // Demo fallback set for common VGC Pokemon
  const demoSlugs = new Set([
    'incineroar', 'rillaboom', 'flutter-mane', 'urshifu-rapid-strike', 'landorus-therian',
    'iron-hands', 'tornadus', 'amoonguss', 'chien-pao', 'pelipper', 'chi-yu', 'iron-bundle',
    'gholdengo', 'annihilape', 'dragonite', 'kingambit', 'great-tusk', 'iron-jugulis',
    'arcanine', 'gothitelle', 'farigiraf', 'indeedee-f', 'hatterene', 'torkoal', 'venusaur',
    'whimsicott', 'murkrow', 'talonflame', 'dusclops', 'porygon2', 'oranguru', 'ursaluna',
  ]);

  if (!pool) {
    cachedPokemonSlugs = { value: demoSlugs, timestamp: now };
    return demoSlugs;
  }

  try {
    const result = await query<{ slug: string }>('SELECT slug FROM pokemon_dim');
    const slugs = new Set(result.map(r => r.slug));
    // Merge with demo slugs in case DB is incomplete
    demoSlugs.forEach(s => slugs.add(s));
    cachedPokemonSlugs = { value: slugs, timestamp: now };
    return slugs;
  } catch (error) {
    console.error('Error fetching pokemon slugs:', error);
    cachedPokemonSlugs = { value: demoSlugs, timestamp: now };
    return demoSlugs;
  }
}

/**
 * Parse a URL pair slug into two canonical Pokemon slugs.
 * Uses DB-driven slug lookup to correctly split multi-hyphen names.
 * Returns null if pair cannot be parsed or Pokemon not found.
 */
export async function parsePokemonPair(pairSlug: string): Promise<{ a: string; b: string } | null> {
  const knownSlugs = await getPokemonSlugs();
  const parts = pairSlug.split('-');

  if (parts.length < 2) return null;

  // Try all possible split points
  for (let i = 1; i < parts.length; i++) {
    const candidateA = parts.slice(0, i).join('-');
    const candidateB = parts.slice(i).join('-');

    if (knownSlugs.has(candidateA) && knownSlugs.has(candidateB)) {
      // Canonical order: alphabetically sorted
      return candidateA < candidateB
        ? { a: candidateA, b: candidateB }
        : { a: candidateB, b: candidateA };
    }
  }

  return null;
}

export default pool;

