import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set Env
process.env.SUPABASE_URL = 'http://mock-mem';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();

const mockFrom = vi.fn(() => ({
    insert: mockInsert,
    update: mockUpdate
}));

mockInsert.mockReturnValue({
    select: mockSelect
});

mockSelect.mockReturnValue({
    single: mockSingle
});

mockUpdate.mockReturnValue({
    eq: mockEq
});

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({ from: mockFrom })
}));

describe('Phase 8: Memory Service Verification', () => {
    let memoryService: any;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Reset mocks default behavior
        mockSingle.mockResolvedValue({ data: { id: 'mem-123' }, error: null });
        mockEq.mockResolvedValue({ data: null, error: null });

        const mod = await import('./MemoryService.js');
        memoryService = mod.memoryService;
    });

    it('should record decision successfully (Completeness)', async () => {
        const record = {
            session_id: 'sess-1',
            market: 'R_100',
            timestamp: new Date().toISOString(),
            technicals: { rsi: 50 },
            signal: { type: 'CALL' },
            risk_check: { approved: true }
        };

        const id = await memoryService.recordDecision(record);

        expect(id).toBe('mem-123');
        expect(mockFrom).toHaveBeenCalledWith('memories');
        expect(mockInsert).toHaveBeenCalledWith(record);
    });

    it('should fail gracefully if DB error (Non-blocking)', async () => {
        mockSingle.mockResolvedValue({ data: null, error: { message: 'DB Down' } });

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        const id = await memoryService.recordDecision({} as any);

        expect(id).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to record memory'), 'DB Down');
        consoleSpy.mockRestore();
    });

    it('should update outcome successfully', async () => {
        const update = {
            trade_id: 'trade-1',
            result: 'WIN',
            pnl: 100,
            settled_at: new Date().toISOString()
        } as const;

        await memoryService.updateOutcome('mem-123', update);

        expect(mockUpdate).toHaveBeenCalledWith({
            outcome: {
                result: update.result,
                pnl: update.pnl,
                settled_at: update.settled_at
            },
            trade_id: 'trade-1'
        });
        expect(mockEq).toHaveBeenCalledWith('id', 'mem-123');
    });
});
