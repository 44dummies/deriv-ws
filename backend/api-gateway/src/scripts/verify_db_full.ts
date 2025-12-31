
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from one level up or root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || '', {
    auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
    console.log('Starting Database Zero-Trust Verification...');
    console.log(`Target: ${SUPABASE_URL}`);

    const runId = `verify_${Date.now()}`;
    let errors = 0;

    // 1. Connectivity Check
    try {
        console.log('\n[1/5] Checking Connectivity (Admin)...');
        const start = performance.now();
        const { data, error } = await adminClient.from('sessions').select('count', { count: 'exact', head: true });
        const lat = performance.now() - start;
        if (error) throw error;
        console.log(`✅ Admin Connected (${lat.toFixed(2)}ms). Row count: ${data}`);
    } catch (e: any) {
        console.error('❌ Admin Connect Failed:', e.message);
        errors++;
        process.exit(1); // Fatal
    }

    // 2. RLS / Permission Check
    try {
        console.log('\n[2/5] Checking RLS Policies...');

        // Attempt Anon Insert (Should Fail)
        const { error: errorAnon } = await anonClient.from('sessions').insert({
            id: `${runId}_anon`,
            status: 'PENDING',
            config_json: {}
        });

        if (errorAnon) {
            console.log(`✅ Anon Insert Blocked (Expected): ${errorAnon.message}`);
        } else {
            console.error('❌ CRITICAL: Anon Insert Allowed! RLS Failure.');
            // Clean up if it actually worked
            await adminClient.from('sessions').delete().eq('id', `${runId}_anon`);
            errors++;
        }

        // Attempt Admin Insert (Should Succeed)
        const { data: dataAdmin, error: errorAdmin } = await adminClient.from('sessions').insert({
            id: `${runId}_admin`,
            status: 'PENDING',
            config_json: { test: true }
        }).select().single();

        if (errorAdmin) {
            console.error('❌ Admin Insert Failed:', errorAdmin.message);
            errors++;
        } else {
            console.log(`✅ Admin Insert Success: ${dataAdmin.id}`);
        }

    } catch (e: any) {
        console.error('❌ RLS Check Exception:', e.message);
        errors++;
    }

    // 3. Vulnerability Probe (RLS Disabled Check)
    try {
        console.log('\n[3/6] Probing RLS Vulnerabilities...');

        // Target: price_history (RLS Disabled reported)
        // Attempt Anon Insert
        const { error: phError } = await anonClient.from('price_history').insert({
            symbol: 'TEST_PROBE',
            price: 123.45,
            timestamp: new Date().toISOString()
        });

        if (!phError) {
            console.error('❌ CRITICAL: Anon Insert to `price_history` SUCCEEDED (RLS Disabled)');
            // Cleanup
            await adminClient.from('price_history').delete().eq('symbol', 'TEST_PROBE');
            errors++;
        } else {
            console.log(`✅ price_history Protected: ${phError.message}`);
        }

        // Target: shadow_signals (RLS Disabled reported)
        const { error: ssError } = await anonClient.from('shadow_signals').insert({
            session_id: 'probe',
            signal: { test: true }
        });

        if (!ssError) {
            console.error('❌ CRITICAL: Anon Insert to `shadow_signals` SUCCEEDED (RLS Disabled)');
            errors++;
            // Cleanup might fail if we don't know the keys, but it shows the hole.
        } else {
            console.log(`✅ shadow_signals Protected: ${ssError.message}`);
        }

        // Target: threshold_versions (RLS Disabled reported)
        const { error: tvError } = await anonClient.from('threshold_versions').insert({
            version: 'probe_v1',
            config: { test: true }
        });

        if (!tvError) {
            console.error('❌ CRITICAL: Anon Insert to `threshold_versions` SUCCEEDED (RLS Disabled)');
            errors++;
            // Cleanup might fail if we don't know the keys, but it shows the hole.
        } else {
            console.log(`✅ threshold_versions Protected: ${tvError.message}`);
        }

    } catch (e: any) {
        console.error('❌ Vulnerability Probe Exception:', e.message);
        errors++;
    }

    // 4. Realtime Check
    try {
        console.log('\n[4/6] Verifying Realtime Subscriptions...');
        if (!SUPABASE_ANON_KEY) {
            console.warn('⚠️ No Anon Key, skipping Realtime check (client-side feature).');
        } else {
            // We use a standalone client for realtime to simulate a user
            const rtClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

            const eventPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Realtime timeout (5s)')), 5000);

                const channel = rtClient
                    .channel('db-changes')
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${runId}_admin` }, (payload) => {
                        clearTimeout(timeout);
                        console.log('   -> Received Realtime Event:', payload.eventType);
                        resolve(true);
                    })
                    .subscribe((status) => {
                        if (status === 'SUBSCRIBED') {
                            console.log('   -> Subscribed to channel');
                            // Trigger update after subscription is ready
                            adminClient.from('sessions').update({ status: 'ACTIVE' }).eq('id', `${runId}_admin`).then();
                        }
                    });
            });

            await eventPromise;
            console.log('✅ Realtime Event Verified.');
            await rtClient.removeAllChannels();
        }
    } catch (e: any) {
        console.error('❌ Realtime Verification Failed:', e.message);
        errors++;
    }

    // 5. Performance / Latency
    try {
        console.log('\n[5/6] Load / Latency Test (10 parallel reads)...');
        const pStart = performance.now();
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(adminClient.from('sessions').select('id').limit(1));
        }
        await Promise.all(promises);
        const pTotal = performance.now() - pStart;
        console.log(`✅ 10 Requests completed in ${pTotal.toFixed(2)}ms (Avg: ${(pTotal / 10).toFixed(2)}ms)`);

        if (pTotal > 1000) {
            console.warn('⚠️ High Latency Detected (>100ms avg)');
        }
    } catch (e: any) {
        console.error('❌ Load Test Failed:', e.message);
        errors++;
    }

    // 5. Cleanup
    try {
        console.log('\n[5/5] Cleanup...');
        await adminClient.from('sessions').delete().like('id', `verify_%`);
        console.log('✅ Test Data Cleaned.');
    } catch (e) {
        console.error('⚠️ Cleanup failed (manual check needed)');
    }

    // Summary
    console.log('\n=======================================');
    if (errors === 0) {
        console.log('🏆 VERDICT: SAFE FOR PRODUCTION');
    } else {
        console.error(`💥 VERDICT: UNSAFE (${errors} errors found)`);
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Unhandled:', err);
    process.exit(1);
});
