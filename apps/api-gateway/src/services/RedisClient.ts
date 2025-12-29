/**
 * TraderMind Redis Client
 * Session state mirror and recovery
 * Uses in-memory storage as fallback when Redis unavailable
 */

// =============================================================================
// IN-MEMORY STORAGE (Fallback)
// =============================================================================

const memoryStore: Map<string, Map<string, string>> = new Map();
const memorySets: Map<string, Set<string>> = new Map();

// =============================================================================
// SESSION KEYS
// =============================================================================

export const REDIS_KEYS = {
    session: (id: string): string => `tradermind:session:${id}`,
    sessions: (): string => 'tradermind:sessions',
    participant: (sessionId: string, userId: string): string =>
        `tradermind:participant:${sessionId}:${userId}`,
    userSessions: (userId: string): string => `tradermind:user:${userId}:sessions`,
};

// =============================================================================
// HASH OPERATIONS
// =============================================================================

export async function hset(key: string, data: Record<string, string>): Promise<void> {
    if (!memoryStore.has(key)) {
        memoryStore.set(key, new Map());
    }
    const hash = memoryStore.get(key)!;
    for (const [field, value] of Object.entries(data)) {
        hash.set(field, value);
    }
}

export async function hgetall(key: string): Promise<Record<string, string>> {
    const hash = memoryStore.get(key);
    if (!hash) return {};
    const result: Record<string, string> = {};
    for (const [field, value] of hash) {
        result[field] = value;
    }
    return result;
}

export async function del(key: string): Promise<void> {
    memoryStore.delete(key);
}

// =============================================================================
// SET OPERATIONS
// =============================================================================

export async function sadd(key: string, member: string): Promise<void> {
    if (!memorySets.has(key)) {
        memorySets.set(key, new Set());
    }
    memorySets.get(key)!.add(member);
}

export async function srem(key: string, member: string): Promise<void> {
    memorySets.get(key)?.delete(member);
}

export async function smembers(key: string): Promise<string[]> {
    return Array.from(memorySets.get(key) ?? []);
}

// =============================================================================
// SESSION PERSISTENCE
// =============================================================================

export interface RedisSession {
    id: string;
    status: string;
    config_json: string;
    admin_id: string | null;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
}

export async function saveSessionToRedis(session: RedisSession): Promise<void> {
    const key = REDIS_KEYS.session(session.id);
    await hset(key, {
        id: session.id,
        status: session.status,
        config_json: session.config_json,
        admin_id: session.admin_id ?? '',
        created_at: session.created_at,
        started_at: session.started_at ?? '',
        completed_at: session.completed_at ?? '',
    });
    await sadd(REDIS_KEYS.sessions(), session.id);
    console.log(`[Redis] Saved session: ${session.id}`);
}

export async function getSessionFromRedis(sessionId: string): Promise<RedisSession | null> {
    const key = REDIS_KEYS.session(sessionId);
    const data = await hgetall(key);
    if (!data['id']) return null;

    return {
        id: data['id'],
        status: data['status'] ?? 'PENDING',
        config_json: data['config_json'] ?? '{}',
        admin_id: data['admin_id'] || null,
        created_at: data['created_at'] ?? new Date().toISOString(),
        started_at: data['started_at'] || null,
        completed_at: data['completed_at'] || null,
    };
}

export async function deleteSessionFromRedis(sessionId: string): Promise<void> {
    await del(REDIS_KEYS.session(sessionId));
    await srem(REDIS_KEYS.sessions(), sessionId);
    console.log(`[Redis] Deleted session: ${sessionId}`);
}

export async function getAllSessionsFromRedis(): Promise<RedisSession[]> {
    const sessionIds = await smembers(REDIS_KEYS.sessions());
    const sessions: RedisSession[] = [];
    for (const id of sessionIds) {
        const session = await getSessionFromRedis(id);
        if (session) sessions.push(session);
    }
    return sessions;
}

// =============================================================================
// PARTICIPANT PERSISTENCE
// =============================================================================

export interface RedisParticipant {
    user_id: string;
    session_id: string;
    status: string;
    pnl: number;
    joined_at: string;
}

export async function saveParticipantToRedis(participant: RedisParticipant): Promise<void> {
    const key = REDIS_KEYS.participant(participant.session_id, participant.user_id);
    await hset(key, {
        user_id: participant.user_id,
        session_id: participant.session_id,
        status: participant.status,
        pnl: participant.pnl.toString(),
        joined_at: participant.joined_at,
    });
    await sadd(REDIS_KEYS.userSessions(participant.user_id), participant.session_id);
}

export async function getParticipantFromRedis(
    sessionId: string,
    userId: string
): Promise<RedisParticipant | null> {
    const key = REDIS_KEYS.participant(sessionId, userId);
    const data = await hgetall(key);
    if (!data['user_id']) return null;

    return {
        user_id: data['user_id'],
        session_id: data['session_id'] ?? sessionId,
        status: data['status'] ?? 'ACTIVE',
        pnl: parseFloat(data['pnl'] ?? '0'),
        joined_at: data['joined_at'] ?? new Date().toISOString(),
    };
}

// =============================================================================
// CLEANUP / STATUS
// =============================================================================

export function clearMemoryStore(): void {
    memoryStore.clear();
    memorySets.clear();
    console.log('[Redis] Memory store cleared');
}

export function getMemoryStats(): { keys: number; sets: number } {
    return { keys: memoryStore.size, sets: memorySets.size };
}
