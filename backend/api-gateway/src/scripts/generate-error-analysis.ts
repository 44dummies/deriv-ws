
import { createClient } from '@supabase/supabase-js';

// Load env via --env-file=.env flag

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(url, key);

async function generateErrorAnalysis() {
    console.log('# Error Attribution & Missed Opps Report');
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
    const rows = rawRows.map((r: any) => ({
        id: r.id,
        decision: r.decision,
        result: r.result, // WIN / LOSS / NO_TRADE
        pnl: r.pnl,
        regime: r.regime || 'UNKNOWN',
        confidence: parseFloat(r.signal?.confidence || r.ai_confidence || '0')
    }));

    // --- 1. FALSE POSITIVES (Executed Losses) ---
    const executedLosses = rows.filter(r => r.decision === 'EXECUTED' && (r.result === 'LOSS' || r.pnl < 0));

    console.log(`### 1. False Positives (Type I Errors)`);
    console.log(`**Total Losses**: ${executedLosses.length}`);

    if (executedLosses.length > 0) {
        // Group by Regime
        const lossByRegime: Record<string, number> = {};
        executedLosses.forEach(r => {
            lossByRegime[r.regime] = (lossByRegime[r.regime] || 0) + 1;
        });

        console.log('\n**Loss Distribution by Regime**:');
        console.log('| Regime | Loss Count |');
        console.log('| --- | --- |');
        Object.entries(lossByRegime).forEach(([reg, count]) => {
            console.log(`| ${reg} | ${count} |`);
        });

        // Detailed Loss Table (Top 5)
        console.log('\n**Recent Losses (Detail)**:');
        console.log('| ID | Regime | Confidence | PnL |');
        console.log('| --- | --- | --- | --- |');
        executedLosses.slice(0, 5).forEach(r => {
            console.log(`| ${r.id.slice(0, 8)}... | ${r.regime} | ${r.confidence} | ${r.pnl} |`);
        });
    } else {
        console.log('> ✅ No executed losses found in dataset.');
    }
    console.log('');

    // --- 2. MISSED OPPORTUNITIES (Blocked Signals) ---
    const blockedSignals = rows.filter(r => r.decision === 'BLOCKED');

    // Heuristic: High Confidence (>0.8) Blocked = Regret
    const highConfBlocked = blockedSignals.filter(r => r.confidence >= 0.8);
    const lowConfBlocked = blockedSignals.filter(r => r.confidence < 0.8);

    console.log(`### 2. Blocked Signals (Type II Analysis)`);
    console.log(`**Total Blocked**: ${blockedSignals.length}`);
    console.log(`- **High Confidence (>0.8) - Potentially Missed**: ${highConfBlocked.length}`);
    console.log(`- **Low/Med Confidence (<0.8) - Correctly Filtered**: ${lowConfBlocked.length}`);

    if (highConfBlocked.length > 0) {
        console.log('\n**CRITICAL: High Confidence Signals Blocked**');
        console.log('*Investigate if Risk Rules are too strict*');
        console.log('| ID | Regime | Confidence |');
        console.log('| --- | --- | --- |');
        highConfBlocked.forEach(r => {
            console.log(`| ${r.id.slice(0, 8)}... | ${r.regime} | ${r.confidence} |`);
        });
    } else {
        console.log('\n> ✅ Good News: No high-confidence signals were blocked.');
    }

    console.log('');
    console.log('---');
    console.log('**Status**: Analysis Complete.');
}

generateErrorAnalysis().catch(console.error);
