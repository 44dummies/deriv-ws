

import { createClient } from '@supabase/supabase-js';

// Load env via --env-file=.env flag


const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(url, key);

interface MemoryEvent {
    id: string;
    market: string;
    created_at: string;
    decision: string;
    result: string;
    pnl: number;
    signal: any;
    features: any;
}

async function runValidation() {
    console.log('# Integrity & Replay Validation Report');
    console.log(`Date: ${new Date().toISOString()}`);
    console.log('----------------------------------------\n');

    // 0. Seed Mode
    if (process.argv.includes('--seed')) {
        console.log('SEEDING VALID DATA...');
        const seedEvents = [
            {
                market: 'R_SEED_WIN',
                decision: 'EXECUTED',
                result: 'WIN',
                pnl: 50,
                signal: { confidence: 0.95 },
                features: { rsi: 30, v: 'v1' }
            },
            {
                market: 'R_SEED_BLOCK',
                decision: 'BLOCKED',
                result: 'NO_TRADE',
                pnl: 0,
                signal: { confidence: 0.4 },
                features: { rsi: 50, v: 'v1' }
            }
        ];

        for (const ev of seedEvents) {
            await supabase.from('trade_memory_events').insert(ev);
            console.log(`Seeded: ${ev.market} (${ev.decision})`);
        }
        console.log('Seeding Complete.\n');
    }

    // 1. Fetch All Events
    const { data: events, error } = await supabase
        .from('trade_memory_events')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Failed to fetch events:', error.message);
        process.exit(1);
    }

    if (!events || events.length === 0) {
        console.log('No events found to validate.');
        return;
    }

    console.log(`Total Events Scanned: ${events.length}`);

    let validCount = 0;
    let violationCount = 0;
    const violations: string[] = [];

    // 2. Iterate and Validate
    events.forEach((ev: MemoryEvent) => {
        const issues: string[] = [];

        // Check 1: Schema Integrity
        if (!ev.market) issues.push('Missing market');
        if (!ev.decision) issues.push('Missing decision');
        if (!ev.result) issues.push('Missing result');
        if (!ev.features) issues.push('Missing features');
        if (!ev.signal) issues.push('Missing signal');

        // Check 2: Logic Consistency
        if (ev.decision === 'BLOCKED') {
            if (ev.result !== 'NO_TRADE') issues.push(`BLOCKED decision has invalid result: ${ev.result}`);
            if (ev.pnl !== 0) issues.push(`BLOCKED decision has non-zero PnL: ${ev.pnl}`);
        }

        if (ev.result === 'WIN') {
            if (ev.pnl <= 0) issues.push(`WIN result has invalid PnL: ${ev.pnl}`);
        }

        if (ev.result === 'LOSS') {
            if (ev.pnl >= 0) issues.push(`LOSS result has positive PnL: ${ev.pnl}`);
        }

        if (issues.length > 0) {
            violationCount++;
            violations.push(`- Record ${ev.id}: ${issues.join(', ')}`);
        } else {
            validCount++;
        }
    });

    console.log(`Valid Records: ${validCount}`);
    console.log(`Violations: ${violationCount}`);

    if (violations.length > 0) {
        console.log('\n## Violations Detected');
        violations.forEach(v => console.log(v));
    } else {
        console.log('\n## Status: ✅ INTEGRITY VERIFIED');
        console.log('All records match logic and schema constraints.');
    }

    // 3. Replay Simulation (Sample)
    console.log('\n## Sample Replay (Last 5 Events)');
    const sample = events.slice(-5);
    sample.forEach(ev => {
        const action = ev.decision === 'BLOCKED' ? '🛑 Blocked' : `⚡ Executed (${ev.result})`;
        const confidence = ev.signal?.confidence?.toFixed(2) || 'N/A';
        const pnlStr = ev.pnl !== undefined ? `$${ev.pnl}` : '-';
        console.log(`[${ev.created_at}] ${ev.market} | Signal Conf: ${confidence} | Action: ${action} -> PnL: ${pnlStr}`);
    });
}

runValidation().catch(console.error);
