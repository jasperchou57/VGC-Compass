import { NextResponse } from 'next/server';
import { query, getLatestTimeBucket } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Test database connection
        const result = await query<{ now: Date }>('SELECT NOW() as now');
        const latestBucket = await getLatestTimeBucket();

        return NextResponse.json({
            status: 'ok',
            db: 'connected',
            latestBucket,
            timestamp: result[0]?.now || new Date().toISOString(),
        });
    } catch (error) {
        console.error('Health check failed:', error);

        return NextResponse.json({
            status: 'error',
            db: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
        }, { status: 503 });
    }
}
