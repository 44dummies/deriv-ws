 

import { createClient } from '@supabase/supabase-js';

// Load env via --env-file=.env flag

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(url, key);

interface Insight {
    category: 'PERFORMANCE' | 'RISK' | 'CALIBRATION';
    severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    text: string;
    evidence: { metric: string; value: any; sampleSize: number };
}

async function generateSynthesis() {
    console.log('# Insight Synthesis & Narratives');
    console.log(`**Date**: ${new Date().toISOString().split('T')[0]}\n`);

    // 1. Fetch Data
    const { data: rawRows, error } = await supabase.from('trade_memory_events').select('*');
    if (error || !rawRows) {
        console.error('Fetch Error:', error);
        return;
    }

    const trades = rawRows.filter((r: any) => r.decision === 'EXECUTED');
    const blocked = rawRows.filter((r: any) => r.decision === 'BLOCKED');

    const insights: Insight[] = [];

    // --- ANALYZER 1: REGIME PERFORMANCE ---
    const regimeStats: Record<string, { wins: number, total: number }> = {};
    trades.forEach((t: any) => {
        const r = t.regime || 'UNKNOWN';
        if (!regimeStats[r]) regimeStats[r] = { wins: 0, total: 0 };
        // Safe check mostly done by initialization line above, but valid TS check might fail if it thinks index access returns undefined.
        // It's strictly typed as Record<string, ...> so access matches.
        // The error was: Object is possibly 'undefined' at line 44: regimeStats[r].total++
        if (regimeStats[r]) {
            regimeStats[r]!.total++;
            if (t.result === 'WIN') regimeStats[r]!.wins++;
        }
    });

    Object.entries(regimeStats).forEach(([regime, stat]) => {
        const wr = (stat.wins / stat.total) * 100;
        if (wr === 100 && stat.total < 3) {
            insights.push({
                category: 'PERFORMANCE',
                severity: 'INFO',
                text: `Perfect start in ${regime} regime, but sample size is small.`,
                evidence: { metric: 'Win Rate', value: '100%', sampleSize: stat.total }
            });
        } else if (wr > 70) {
            insights.push({
                category: 'PERFORMANCE',
                severity: 'LOW',
                text: `Strong performance in ${regime} markets.`,
                evidence: { metric: 'Win Rate', value: `${wr.toFixed(1)}%`, sampleSize: stat.total }
            });
        } else if (wr < 40) {
            insights.push({
                category: 'PERFORMANCE',
                severity: 'HIGH',
                text: `Struggling in ${regime} markets. Consider disabling.`,
                evidence: { metric: 'Win Rate', value: `${wr.toFixed(1)}%`, sampleSize: stat.total }
            });
        }
    });

    // --- ANALYZER 2: RISK EFFICIENCY ---
    if (blocked.length > 0) {
        const highConfBlocked = blocked.filter((r: any) => parseFloat(r.signal?.confidence || r.ai_confidence || '0') > 0.8);
        if (highConfBlocked.length === 0) {
            insights.push({
                category: 'RISK',
                severity: 'LOW',
                text: 'RiskGuard is efficiently filtering noise. No high-confidence signals blocked.',
                evidence: { metric: 'Elite Signals Blocked', value: 0, sampleSize: blocked.length }
            });
        } else {
            insights.push({
                category: 'RISK',
                severity: 'MEDIUM',
                text: 'RiskGuard may be too strict. Some high-confidence signals are being blocked.',
                evidence: { metric: 'Elite Signals Blocked', value: highConfBlocked.length, sampleSize: blocked.length }
            });
        }
    }

    // --- OUTPUT: HUMAN REPORT ---
    console.log('## 1. Top Insights (Ranked by Impact)');
    const severityRank = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2, 'INFO': 3 };
    const sortedInsights = insights.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

    sortedInsights.forEach(i => {
        const icon = i.severity === 'HIGH' ? '🔴' : i.severity === 'MEDIUM' ? 'xC4' : i.severity === 'LOW' ? '🟢' : 'ℹ️';
        console.log(`### ${icon} ${i.text}`);
        console.log(`- **Category**: ${i.category}`);
        console.log(`- **Evidence**: ${i.evidence.metric} = ${i.evidence.value} (N=${i.evidence.sampleSize})`);
        console.log('');
    });

    // --- OUTPUT: MACHINE JSON ---
    console.log('## 2. Machine-Readable Output (JSON)');
    console.log('```json');
    console.log(JSON.stringify(sortedInsights, null, 2));
    console.log('```');
}

generateSynthesis().catch(console.error);
