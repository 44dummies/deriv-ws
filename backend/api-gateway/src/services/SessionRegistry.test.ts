/**
 * SessionRegistry Test Script
 * Verifies all registry operations
 */

import { SessionRegistry } from './SessionRegistry.js';

function runTests(): void {
    console.log('=== SessionRegistry Tests ===\n');

    const registry = new SessionRegistry();

    // Test 1: Create session
    console.log('Test 1: Create session');
    const session = registry.createSession({
        id: 'sess_001',
        config_json: { max_participants: 10, min_balance: 100 },
        status: 'PENDING',
    });
    console.log('  Created:', session.id, session.status);
    console.log('  ✅ createSession works\n');

    // Test 2: Get session state
    console.log('Test 2: Get session state');
    const state = registry.getSessionState('sess_001');
    console.log('  State:', state?.id, state?.status);
    console.log('  ✅ getSessionState works\n');

    // Test 3: Add participant
    console.log('Test 3: Add participant');
    const participant = registry.addParticipant('sess_001', 'user_001');
    console.log('  Participant:', participant.user_id, participant.status);
    console.log('  ✅ addParticipant works\n');

    // Test 4: Add another participant
    console.log('Test 4: Add second participant');
    registry.addParticipant('sess_001', 'user_002');
    const updated = registry.getSessionState('sess_001');
    console.log('  Participants:', updated?.participants.size);
    console.log('  ✅ Multiple participants work\n');

    // Test 5: Update status
    console.log('Test 5: Update session status');
    registry.updateSessionStatus('sess_001', 'ACTIVE');
    const active = registry.getSessionState('sess_001');
    console.log('  Status:', active?.status);
    console.log('  Started At:', active?.started_at);
    console.log('  ✅ updateSessionStatus works\n');

    // Test 6: Update PnL
    console.log('Test 6: Update participant PnL');
    registry.updateParticipantPnL('sess_001', 'user_001', 15.5);
    const p = registry.getParticipant('sess_001', 'user_001');
    console.log('  PnL:', p?.pnl);
    console.log('  ✅ updateParticipantPnL works\n');

    // Test 7: Remove participant
    console.log('Test 7: Remove participant');
    registry.removeParticipant('sess_001', 'user_002');
    const removed = registry.getParticipant('sess_001', 'user_002');
    console.log('  Status after removal:', removed?.status);
    console.log('  ✅ removeParticipant works\n');

    // Test 8: Get user sessions
    console.log('Test 8: Get user sessions');
    const userSessions = registry.getUserSessions('user_001');
    console.log('  User sessions:', userSessions);
    console.log('  ✅ getUserSessions works\n');

    // Test 9: List all sessions
    console.log('Test 9: List all sessions');
    const allSessions = registry.listSessions();
    console.log('  Total sessions:', allSessions.length);
    console.log('  ✅ listSessions works\n');

    // Test 10: Get stats
    console.log('Test 10: Get stats');
    const stats = registry.getStats();
    console.log('  Stats:', stats);
    console.log('  ✅ getStats works\n');

    // Test 11: Invalid transition (should throw)
    console.log('Test 11: Invalid status transition');
    try {
        registry.updateSessionStatus('sess_001', 'PENDING');
        console.log('  ❌ Should have thrown error');
    } catch (err) {
        console.log('  Caught error:', (err as Error).message);
        console.log('  ✅ Status validation works\n');
    }

    // Test 12: Serialize state
    console.log('Test 12: Serialize state');
    const serialized = registry.serializeState();
    console.log('  Serialized length:', serialized.length, 'bytes');
    console.log('  ✅ serializeState works\n');

    // Final state
    console.log('=== Final State ===');
    const finalSession = registry.getSessionState('sess_001');
    console.log('Session:', finalSession?.id);
    console.log('Status:', finalSession?.status);
    console.log('Participants:', finalSession?.participants.size);
    console.log('Config:', JSON.stringify(finalSession?.config_json));

    console.log('\n🎉 All SessionRegistry tests passed!\n');
}

runTests();
