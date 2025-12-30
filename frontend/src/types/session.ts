export type SessionStatus = 'CREATED' | 'ACTIVE' | 'PAUSED' | 'TERMINATED';

export interface Session {
    id: string;
    startTime: string;
    endTime?: string;
    status: SessionStatus;
    participants: string[]; // User IDs
    pnl: number;
    config?: Record<string, any>;
}
