 

import { createClient } from '@supabase/supabase-js';

// Load env via --env-file=.env flag

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(url, key);

interface AnalyticsRow {
    id: string;
    market: string;
    decision: string;
    result: string;
    pnl: number;
    regime: string;
    ai_confidence: number;
    feat_rsi: number;
    direction: string;
    is_profit: number;
}

async function generateReport() {
    console.log('# Win/Loss Attribution Report');
    console.log(`**Date**: ${new Date().toISOString().split('T')[0]}\n`);

    // 1. Fetch Data (Client-side Transformation for Demo)
    const { data: rawRows, error } = await supabase
        .from('trade_memory_events')
        .select('*');

    if (error) {
        console.error('Fetch Error:', error);
        process.exit(1);
    }

    if (!rawRows || rawRows.length === 0) {
        console.log('> [!IMPORTANT]\n> No executed trades found for analysis.');
        return;
    }

    // Transform raw rows to match Analytics Validation schema
    const rows: AnalyticsRow[] = rawRows
        .filter((r: any) => r.decision === 'EXECUTED')
        .map((r: any) => ({
            id: r.id,
            market: r.market,
            decision: r.decision,
            result: r.result,
            pnl: r.pnl,
            regime: r.regime || 'UNKNOWN',
            ai_confidence: parseFloat(r.signal?.confidence || '0'),
            direction: r.signal?.type || 'UNKNOWN',
            feat_rsi: parseFloat(r.features?.rsi || '0'),
            is_profit: r.pnl > 0 ? 1 : 0
        }));

    const totalTrades = rows.length;
    console.log(`**Total Trades Analyzed**: ${totalTrades}\n`);

    // --- HELPER FUNCTIONS ---
    const calcMetrics = (subset: any[]) => {
        const count = subset.length;
        if (count === 0) return { count: 0, winRate: 0, avgPnL: 0 };
        const wins = subset.filter(r => r.result === 'WIN').length;
        const totalPnL = subset.reduce((sum, r) => sum + (r.pnl || 0), 0);
        return {
            count,
            winRate: (wins / count * 100).toFixed(1) + '%',
            avgPnL: '$' + (totalPnL / count).toFixed(2)
        };
    };

    const printTable = (title: string, data: any[]) => {
        console.log(`### ${title}`);
        if (data.length === 0) {
            console.log('_No data available._\n');
            return;
        }

        // Headers
        const headers = Object.keys(data[0]);
        console.log('| ' + headers.join(' | ') + ' |');
        console.log('| ' + headers.map(() => '---').join(' | ') + ' |');

        // Rows
        data.forEach(row => {
            console.log('| ' + Object.values(row).join(' | ') + ' |');
        });
        console.log('');
    };

    // --- 1. REGIME ANALYSIS ---
    const regimeGroups = new Map<string, any[]>();
    rows.forEach((r: any) => {
        const key = r.regime || 'UNKNOWN';
        if (!regimeGroups.has(key)) regimeGroups.set(key, []);
        regimeGroups.get(key)?.push(r);
    });

    const regimeTable: any[] = [];
    regimeGroups.forEach((subset, regime) => {
        const m = calcMetrics(subset);
        regimeTable.push({ Regime: regime, ...m });
    });
    printTable('Performance by Market Regime', regimeTable);

    // --- 2. SIGNAL TYPE ANALYSIS ---
    const signalGroups = new Map<string, any[]>();
    rows.forEach((r: any) => {
        const key = r.direction || 'UNKNOWN';
        if (!signalGroups.has(key)) signalGroups.set(key, []);
        signalGroups.get(key)?.push(r);
    });

    const signalTable: any[] = [];
    signalGroups.forEach((subset, dir) => {
        const m = calcMetrics(subset);
        signalTable.push({ Direction: dir, ...m });
    });
    printTable('Performance by Signal Direction', signalTable);

    // --- 3. FEATURE BUCKET (RSI) ---
    const rsiBuckets = {
        'Oversold (<30)': rows.filter((r: any) => r.feat_rsi < 30),
        'Neutral (30-70)': rows.filter((r: any) => r.feat_rsi >= 30 && r.feat_rsi <= 70),
        'Overbought (>70)': rows.filter((r: any) => r.feat_rsi > 70)
    };

    const rsiTable: any[] = [];
    Object.entries(rsiBuckets).forEach(([bucket, subset]) => {
        const m = calcMetrics(subset as any[]);
        rsiTable.push({ 'RSI Range': bucket, ...m });
    });
    printTable('RSI Impact Analysis', rsiTable);

    // --- 4. OPPORTUNITY COST (BLOCKED) ---
    // Need to fetch blocked trades
    const { data: blockedRows } = await supabase.from('view_analytics_blocked').select('*');
    if (blockedRows && blockedRows.length > 0) {
        console.log('### Missed Opportunities (Blocked Signals)');
        console.log(`Total Blocked: ${blockedRows.length}`);

        // Count by Reason (assuming reason is in signal data, simpler to just list count for now)
        // Group by Regime
        const blockedByRegime: Record<string, number> = {};
        blockedRows.forEach((r: any) => {
            const k = r.regime || 'UNKNOWN';
            blockedByRegime[k] = (blockedByRegime[k] || 0) + 1;
        });

        console.log('| Regime | Blocked Count |');
        console.log('| --- | --- |');
        Object.entries(blockedByRegime).forEach(([reg, count]) => {
            console.log(`| ${reg} | ${count} |`);
        });
        console.log('');
    }
}

generateReport().catch(console.error);
