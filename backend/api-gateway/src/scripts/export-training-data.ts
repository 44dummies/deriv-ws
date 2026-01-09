 

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env via --env-file=.env flag

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(url, key);

async function exportTrainingData() {
    console.log('# Exporting Training Data (Snapshot v1)');
    console.log(`**Date**: ${new Date().toISOString()}`);

    // 1. Fetch Executed Trades (We have Ground Truth PnL)
    const { data: rawRows, error } = await supabase
        .from('trade_memory_events')
        .select('*')
        .eq('decision', 'EXECUTED')
        .order('created_at', { ascending: true }); // Chronological order is crucial for Time Series

    if (error) {
        console.error('Fetch Error:', error);
        process.exit(1);
    }

    if (!rawRows || rawRows.length === 0) {
        console.warn('Warning: No executed trades found. Dataset will be empty.');
    } else {
        console.log(`Fetched ${rawRows.length} records.`);
    }

    // 2. Transform to CSV Format
    const csvRows: string[] = [];

    // Header
    const featureKeys = ['rsi', 'adx', 'ema_fast', 'ema_slow', 'volatility', 'momentum'];
    const header = ['timestamp', 'market', ...featureKeys, 'target_win'].join(',');
    csvRows.push(header);

    rawRows?.forEach((r: any) => {
        const features = r.features || {};
        const isWin = r.result === 'WIN' ? 1 : 0;

        const rowData = [
            r.created_at,
            r.market,
            features.rsi || 0,
            features.adx || 0,
            features.ema_fast || 0,
            features.ema_slow || 0,
            features.volatility || 0,
            features.momentum || 0,
            isWin
        ];

        csvRows.push(rowData.join(','));
    });

    // 3. Write to File
    // Target: apps/ai-layer/datasets/training_snapshot_v1.csv
    // CWD is expected to be apps/api-gateway
    const targetDir = path.resolve(process.cwd(), '../ai-layer/datasets');
    if (!fs.existsSync(targetDir)) {
        console.log(`Creating directory: ${targetDir}`);
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const outputPath = path.resolve(targetDir, 'training_snapshot_v1.csv');

    fs.writeFileSync(outputPath, csvRows.join('\n'));
    console.log(`\n✅ Dataset saved to: ${outputPath}`);
    console.log(`Total Rows: ${csvRows.length - 1} (excluding header)`);
}

exportTrainingData().catch(console.error);
