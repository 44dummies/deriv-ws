/**
 * SessionRegistry Tests with State Transitions
 * Run: cd apps/api-gateway && pnpm exec tsx ../../tests/session-lifecycle.test.ts
 */

import { SessionRegistry } from '../apps/api-gateway/src/services/SessionRegistry.js';

const registry = new SessionRegistry();

interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void): void {
    try {
        fn();
        results.push({ name, passed: true });
        console.log(`✅ ${name}`);
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        results.push({ name, passed: false, error });
        console.log(`❌ ${name}: ${error}`);
    }
}

function expect(condition: boolean, message: string): void {
    if (!condition) throw new Error(message);
}

console.log('═══════════════════════════════════════════════');
console.log('  Session Lifecycle State Transition Tests');
console.log('═══════════════════════════════════════════════\n');

// =============================================================================
// STATE TRANSITION TESTS
// =============================================================================

console.log('--- Valid State Transitions ---\n');

test('PENDING → ACTIVE', () => {
    registry.clear();
    registry.createSession({ id: 'sess_1', status: 'PENDING' });
    const updated = registry.updateSessionStatus('sess_1', 'ACTIVE');
    expect(updated.status === 'ACTIVE', 'Status should be ACTIVE');
});

test('ACTIVE → RUNNING', () => {
    const updated = registry.updateSessionStatus('sess_1', 'RUNNING');
    expect(updated.status === 'RUNNING', 'Status should be RUNNING');
});

test('RUNNING → PAUSED', () => {
    const updated = registry.updateSessionStatus('sess_1', 'PAUSED');
    expect(updated.status === 'PAUSED', 'Status should be PAUSED');
});

test('PAUSED → RUNNING', () => {
    const updated = registry.updateSessionStatus('sess_1', 'RUNNING');
    expect(updated.status === 'RUNNING', 'Status should be RUNNING');
});

test('RUNNING → COMPLETED', () => {
    const updated = registry.updateSessionStatus('sess_1', 'COMPLETED');
    expect(updated.status === 'COMPLETED', 'Status should be COMPLETED');
    expect(updated.completed_at !== null, 'completed_at should be set');
});

console.log('\n--- Invalid State Transitions ---\n');

test('PENDING → RUNNING (invalid)', () => {
    registry.clear();
    registry.createSession({ id: 'sess_2', status: 'PENDING' });
    try {
        registry.updateSessionStatus('sess_2', 'RUNNING');
        throw new Error('Should have thrown');
    } catch (err) {
        expect((err as Error).message.includes('Invalid status transition'), 'Should reject invalid transition');
    }
});

test('ACTIVE → PENDING (invalid)', () => {
    registry.clear();
    registry.createSession({ id: 'sess_3', status: 'PENDING' });
    registry.updateSessionStatus('sess_3', 'ACTIVE');
    try {
        registry.updateSessionStatus('sess_3', 'PENDING');
        throw new Error('Should have thrown');
    } catch (err) {
        expect((err as Error).message.includes('Invalid status transition'), 'Should reject invalid transition');
    }
});

test('COMPLETED → ACTIVE (invalid)', () => {
    registry.clear();
    registry.createSession({ id: 'sess_4', status: 'PENDING' });
    registry.updateSessionStatus('sess_4', 'ACTIVE');
    registry.updateSessionStatus('sess_4', 'COMPLETED');
    try {
        registry.updateSessionStatus('sess_4', 'ACTIVE');
        throw new Error('Should have thrown');
    } catch (err) {
        expect((err as Error).message.includes('Invalid status transition'), 'Should reject invalid transition');
    }
});

// =============================================================================
// PARTICIPANT TESTS
// =============================================================================

console.log('\n--- Participant Management ---\n');

test('Add participant to session', () => {
    registry.clear();
    registry.createSession({ id: 'sess_5' });
    const p = registry.addParticipant('sess_5', 'user_1');
    expect(p.status === 'ACTIVE', 'Participant should be ACTIVE');
});

test('Max participants enforced', () => {
    registry.clear();
    registry.createSession({ id: 'sess_6', config_json: { max_participants: 2 } });
    registry.addParticipant('sess_6', 'user_1');
    registry.addParticipant('sess_6', 'user_2');
    try {
        registry.addParticipant('sess_6', 'user_3');
        throw new Error('Should have thrown');
    } catch (err) {
        expect((err as Error).message.includes('full'), 'Should reject when full');
    }
});

test('Remove participant from session', () => {
    registry.clear();
    registry.createSession({ id: 'sess_7' });
    registry.addParticipant('sess_7', 'user_1');
    registry.removeParticipant('sess_7', 'user_1');
    const p = registry.getParticipant('sess_7', 'user_1');
    expect(p?.status === 'REMOVED', 'Participant should be REMOVED');
});

test('Duplicate participant rejected', () => {
    registry.clear();
    registry.createSession({ id: 'sess_8' });
    registry.addParticipant('sess_8', 'user_1');
    try {
        registry.addParticipant('sess_8', 'user_1');
        throw new Error('Should have thrown');
    } catch (err) {
        expect((err as Error).message.includes('already'), 'Should reject duplicate');
    }
});

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n═══════════════════════════════════════════════');
const passed = results.filter(r => r.passed).length;
console.log(`  Results: ${passed}/${results.length} passed`);
console.log('═══════════════════════════════════════════════\n');

process.exit(passed === results.length ? 0 : 1);
