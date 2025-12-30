
import { createClient } from '@supabase/supabase-js';

// Load env via --env-file=.env flag

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(url, key);

async function generateCalibration() {
    console.log('# Confidence Calibration Report');
    console.log(`**Date**: ${new Date().toISOString().split('T')[0]}\n`);

    // 1. Fetch Data
    const { data: rawRows, error } = await supabase
        .from('trade_memory_events')
        .select('*');

    if (error) {
        console.error('Fetch Error:', error);
        process.exit(1);
    }

    if (!rawRows || rawRows.length === 0) {
        console.log('_No data available._');
        return;
    }

    // Transform
    const rows = rawRows
        .filter((r: any) => r.decision === 'EXECUTED') // Calibrate on executed trades (Win/Loss)
        .map((r: any) => ({
            id: r.id,
            result: r.result, // WIN / LOSS
            regime: r.regime || 'UNKNOWN',
            confidence: parseFloat(r.signal?.confidence || r.ai_confidence || '0')
        }));

    // --- HELPER: BUCKETING ---
    const getBucket = (conf: number) => {
        if (conf < 0.5) return '0.00 - 0.49 (Ignore)';
        if (conf < 0.6) return '0.50 - 0.59 (Low)';
        if (conf < 0.7) return '0.60 - 0.69 (Med)';
        if (conf < 0.8) return '0.70 - 0.79 (High)';
        if (conf < 0.9) return '0.80 - 0.89 (Very High)';
        return '0.90 - 1.00 (Elite)';
    };

    const buckets = [
        '0.00 - 0.49 (Ignore)',
        '0.50 - 0.59 (Low)',
        '0.60 - 0.69 (Med)',
        '0.70 - 0.79 (High)',
        '0.80 - 0.89 (Very High)',
        '0.90 - 1.00 (Elite)'
    ];

    // --- 1. GLOBAL CALIBRATION CURVE ---
    console.log('### Global Calibration Curve');
    console.log('*Does "High Confidence" actually mean High Win Rate?*\n');
    console.log('| Confidence Bucket | Trades | Wins | Win Rate | Status |');
    console.log('| --- | --- | --- | --- | --- |');

    const globalStats = buckets.map(b => ({ bucket: b, total: 0, wins: 0 }));

    rows.forEach(r => {
        const b = getBucket(r.confidence);
        const stat = globalStats.find(s => s.bucket === b);
        if (stat) {
            stat.total++;
            if (r.result === 'WIN') stat.wins++;
        }
    });

    globalStats.forEach(s => {
        if (s.total === 0) return; // Skip empty buckets to reduce noise? Or show 0
        const wr = s.total > 0 ? (s.wins / s.total) : 0;
        const wrPct = (wr * 100).toFixed(1) + '%';

        // Status Check
        let status = '✅';
        // Simple logic: Very High should be > 70% WR approx
        if (s.bucket.includes('Very High') && wr < 0.6) status = '⚠️ OVERCONFIDENT';
        if (s.bucket.includes('Low') && wr > 0.7) status = '⚠️ UNDERCONFIDENT';

        console.log(`| ${s.bucket} | ${s.total} | ${s.wins} | ${wrPct} | ${status} |`);
    });
    console.log('');

    // --- 2. REGIME x CONFIDENCE HEATMAP ---
    console.log('### Regime Interaction Heatmap (Win Rates)');
    console.log('*Win Rate per Bucket, split by Regime*\n');

    // Get unique regimes
    const regimes = Array.from(new Set(rows.map(r => r.regime))).sort();

    console.log('| Regime | ' + buckets.map(b => b.split(' ')[0]).join(' | ') + ' |'); // Short header
    console.log('| --- | ' + buckets.map(() => '---').join(' | ') + ' |');

    regimes.forEach(reg => {
        const regimeRows = rows.filter(r => r.regime === reg);
        const rowOutput = [reg];

        buckets.forEach(b => {
            const inBucket = regimeRows.filter(r => getBucket(r.confidence) === b);
            if (inBucket.length === 0) {
                rowOutput.push('-');
            } else {
                const wins = inBucket.filter(r => r.result === 'WIN').length;
                const wr = Math.round((wins / inBucket.length) * 100);
                rowOutput.push(`${wr}% (${inBucket.length})`);
            }
        });
        console.log('| ' + rowOutput.join(' | ') + ' |');
    });
    console.log('');
}

generateCalibration().catch(console.error);
