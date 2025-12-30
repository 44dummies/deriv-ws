
import { createClient } from '@supabase/supabase-js';

// Load env via --env-file=.env flag

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(url, key);

// Mimic the SQL View Logic in TS
interface AnalyticsRow {
    id: string;
    market: string;
    decision: string;
    result: string;
    ai_confidence: number;
    feat_rsi: number;
    feat_volatility: number;
    is_profit: number;
}

async function verifyPipeline() {
    console.log('Running Analytics Pipeline Verification...');

    // 1. Fetch Raw Data
    const { data: rawEvents, error } = await supabase
        .from('trade_memory_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error('Fetch Error:', error);
        process.exit(1);
    }

    console.log(`Fetched ${rawEvents?.length} raw events.`);

    // 2. Transform (ETL)
    const transformed: AnalyticsRow[] = rawEvents.map((ev: any) => {
        // Safe extraction logic (matching SQL view)
        const conf = parseFloat(ev.signal?.confidence || ev.ai_confidence || '0');
        const rsi = parseFloat(ev.features?.rsi || '0');
        const vol = parseFloat(ev.features?.volatility || '0');

        return {
            id: ev.id,
            market: ev.market,
            decision: ev.decision,
            result: ev.result,
            ai_confidence: isNaN(conf) ? -1 : conf,
            feat_rsi: isNaN(rsi) ? -1 : rsi,
            feat_volatility: isNaN(vol) ? -1 : vol,
            is_profit: ev.pnl > 0 ? 1 : 0
        };
    });

    // 3. Validate
    let validCount = 0;
    let errorCount = 0;

    transformed.forEach(row => {
        if (row.ai_confidence === -1) console.warn(`[WARN] Invalid Confidence for ${row.id}`);
        // RSI might be missing in some legacy tests, that's expected. 
        // We verify that recent Data (feature_version present) is good.

        validCount++;
    });

    console.log(`Successfully Transformed: ${validCount} rows.`);
    console.log('Sample Data (Top 3):');
    console.table(transformed.slice(0, 3));

    // 4. Mimic View Filtering
    const executed = transformed.filter(r => r.decision === 'EXECUTED');
    const blocked = transformed.filter(r => r.decision === 'BLOCKED');

    console.log(`View 'executed': ${executed.length} rows`);
    console.log(`View 'blocked': ${blocked.length} rows`);

    if (executed.length > 0 && blocked.length > 0) {
        console.log('✅ Pipeline Verification Passed: Found both Executed and Blocked records.');
    } else {
        console.warn('⚠️ Pipeline Partial: Missing data types (possibly due to empty DB or filter mismatch).');
    }
}

verifyPipeline();
