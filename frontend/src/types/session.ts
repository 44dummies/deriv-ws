export type SessionStatus =
    | 'CREATED'
    | 'PENDING'
    | 'ACTIVE'
    | 'RUNNING'
    | 'PAUSED'
    | 'COMPLETED';

export interface Session {
    id: string;
    status: SessionStatus;
    startTime?: string;
    endTime?: string;
    created_at?: string;
    started_at?: string | null;
    completed_at?: string | null;
    participants?: string[] | Record<string, any>;
    pnl?: number;
    config?: Record<string, any>;
    config_json?: Record<string, any>;
}
