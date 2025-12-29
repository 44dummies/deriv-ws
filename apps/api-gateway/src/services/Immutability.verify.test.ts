
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { ImmutableMemoryEvent } from './MemoryService.js';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase environment for real connection if specific user test, 
// BUT for Immutability Verification we want to run AGAINST THE DB if possible, 
// or at least verify the behavior effectively.
// Given strict environment, we might not have a real DB connection in test runner 
// unless we use the provided credentials in .env.

// If we cannot connect to real DB, we can't test RLS policies triggered by the DB.
// Tests usually mock the DB client.
// However, the USER REQUEST specifically asks for "Manual UPDATE/DELETE attempts fail".
// This implies a real DB test or detailed simulation.

// Since I have `npx vitest` and access to `.env`, I will try to use the REAL `MemoryService` 
// connecting to the REAL Supabase project IF credentials exist.
// If missing, I will simulate the logic or skip.

// NOTE: To test RLS enforcement, we MUST use a real connection.
// I will check if I can read .env.

import fs from 'fs';
import path from 'path';

// Manually load .env for testing environment if dotenv is unavailable
try {
    const envPath = path.resolve(process.cwd(), '.env');
    console.log('Loading .env from:', envPath);
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf-8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
                    value = value.replace(/^"|"$/g, '');
                }
                process.env[key] = value;
            }
        });
    } else {
        console.warn('.env file not found at', envPath);
    }
} catch (e) {
    console.warn('Failed to load .env manually', e);
}

console.log('SUPABASE_URL in test:', process.env.SUPABASE_URL ? 'Set' : 'Unset');
console.log('SUPABASE_KEY in test:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Unset');

const hasCreds = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;

describe.skipIf(!hasCreds)('Phase 9: Immutability Verification', () => {

    let memoryService: any;

    beforeAll(async () => {
        // Dynamically import service after env vars are set
        const mod = await import('./MemoryService.js');
        memoryService = mod.memoryService;
    });

    // We intentionally invoke the real service here to test the DB Trigger/RLS

    it('should allow INSERT of immutable event', async () => {
        const event: ImmutableMemoryEvent = {
            market: 'R_TEST_IMMUTABLE',
            features: { 'rsi': 50 },
            signal: { 'action': 'CALL' },
            decision: 'EXECUTED',
            result: 'WIN',
            pnl: 100,
            ai_confidence: 0.95,
            regime: 'TRENDING'
        };

        // We can't easily get the ID back from void function, but we can query it?
        // Or updated finalizeEvent to return ID?
        // memoryService.finalizeEvent returns void, but logs.

        // Let's modify the service to return ID for testing purposes? 
        // Or query it directly.
        await memoryService.finalizeEvent(event);

        // Query to confirm existence
        // We need direct client access to query
        const supabase = (memoryService as any).supabase;
        const { data, error } = await supabase
            .from('trade_memory_events')
            .select('*')
            .eq('market', 'R_TEST_IMMUTABLE')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.market).toBe('R_TEST_IMMUTABLE');

        return { id: data.id };
    });

    it('should BLOCK UPDATE of immutable event', async () => {
        // reuse the inserted record logic or insert new
        const supabase = (memoryService as any).supabase;

        // Insert a record directly
        const { data: inserted, error: insertError } = await supabase
            .from('trade_memory_events')
            .insert({
                market: 'R_TEST_FAIL_UPDATE',
                features: {},
                signal: {},
                decision: 'BLOCKED',
                result: 'NO_TRADE'
            })
            .select('id')
            .single();

        expect(insertError).toBeNull();
        const id = inserted.id;

        // Attempt Update
        const { error: updateError } = await supabase
            .from('trade_memory_events')
            .update({ result: 'WIN' })
            .eq('id', id);

        // Expect Error!
        // The Trigger raises EXCEPTION 'Updates are not allowed...'
        // Supabase returns this as an error object.
        expect(updateError).toBeDefined();
        expect(updateError?.message).toMatch(/Updates are not allowed/);
    });

    it('should BLOCK DELETE of immutable event', async () => {
        const supabase = (memoryService as any).supabase;

        // Insert a record
        const { data: inserted } = await supabase
            .from('trade_memory_events')
            .insert({
                market: 'R_TEST_FAIL_DELETE',
                features: {},
                signal: {},
                decision: 'BLOCKED',
                result: 'NO_TRADE'
            })
            .select('id')
            .single();

        const id = inserted.id;

        // Attempt Delete
        const { error: deleteError } = await supabase
            .from('trade_memory_events')
            .delete()
            .eq('id', id);

        expect(deleteError).toBeDefined();
        expect(deleteError?.message).toMatch(/Updates are not allowed/); // The trigger covers UPDATE OR DELETE
    });

});
