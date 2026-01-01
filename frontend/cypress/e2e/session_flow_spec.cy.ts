/**
 * TraderMind E2E Test Suite: Trading Session Flow
 * Tests for session creation, joining, and trading lifecycle
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('Trading Session Lifecycle', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
        
        // Mock authenticated user for protected routes
        cy.intercept('GET', '**/auth/user', {
            statusCode: 200,
            body: {
                id: 'test-user-123',
                email: 'test@example.com',
                role: 'authenticated'
            }
        }).as('getUser');
    });

    describe('Session Creation', () => {
        it('displays session creation form', () => {
            cy.visit('/sessions/new');
            
            // Should have form elements for session config
            cy.get('[data-testid="session-name"], input[name="name"]').should('exist');
        });

        it('validates required fields', () => {
            cy.visit('/sessions/new');
            
            // Try to submit empty form
            cy.get('button[type="submit"]').click();
            
            // Should show validation errors
            cy.get('.text-red-500, [role="alert"]').should('exist');
        });

        it('creates session with valid data', () => {
            cy.intercept('POST', '**/sessions', {
                statusCode: 201,
                body: {
                    id: 'session-new-123',
                    name: 'Test Session',
                    status: 'PENDING',
                    created_at: new Date().toISOString()
                }
            }).as('createSession');
            
            cy.visit('/sessions/new');
            cy.get('input[name="name"]').type('Test Session');
            cy.get('button[type="submit"]').click();
            
            cy.wait('@createSession');
            
            // Should redirect to new session
            cy.url().should('include', '/session/');
        });
    });

    describe('Session Joining', () => {
        it('displays join session interface', () => {
            cy.intercept('GET', '**/sessions/*', {
                statusCode: 200,
                body: {
                    id: 'session-123',
                    name: 'Active Session',
                    status: 'ACTIVE',
                    participants: []
                }
            }).as('getSession');
            
            cy.visit('/session/session-123');
            cy.wait('@getSession');
            
            // Should show session details
            cy.contains('Active Session').should('be.visible');
        });

        it('shows participant list in session', () => {
            cy.intercept('GET', '**/sessions/*', {
                statusCode: 200,
                body: {
                    id: 'session-123',
                    name: 'Active Session',
                    status: 'ACTIVE',
                    participants: [
                        { id: 'p1', user_id: 'u1', status: 'ACTIVE' },
                        { id: 'p2', user_id: 'u2', status: 'ACTIVE' }
                    ]
                }
            }).as('getSession');
            
            cy.visit('/session/session-123');
            cy.wait('@getSession');
            
            // Should display participants
            cy.get('[data-testid="participant-list"]').should('exist');
        });

        it('handles session not found', () => {
            cy.intercept('GET', '**/sessions/*', {
                statusCode: 404,
                body: { error: 'Session not found' }
            }).as('getSession');
            
            cy.visit('/session/nonexistent-123');
            cy.wait('@getSession');
            
            // Should show error or redirect
            cy.contains(/not found|error/i).should('be.visible');
        });
    });

    describe('Session Controls', () => {
        it('displays pause/resume controls for active session', () => {
            cy.intercept('GET', '**/sessions/*', {
                statusCode: 200,
                body: {
                    id: 'session-123',
                    name: 'Active Session',
                    status: 'RUNNING',
                    host_id: 'test-user-123'
                }
            }).as('getSession');
            
            cy.visit('/session/session-123');
            cy.wait('@getSession');
            
            // Host should see control buttons
            cy.get('[data-testid="pause-btn"], button:contains("Pause")').should('exist');
        });

        it('allows host to pause session', () => {
            cy.intercept('GET', '**/sessions/*', {
                body: { id: 'session-123', status: 'RUNNING', host_id: 'test-user-123' }
            });
            cy.intercept('POST', '**/sessions/*/pause', {
                body: { id: 'session-123', status: 'PAUSED' }
            }).as('pauseSession');
            
            cy.visit('/session/session-123');
            cy.get('[data-testid="pause-btn"], button:contains("Pause")').first().click();
            
            cy.wait('@pauseSession');
        });
    });
});

describe('Trading Interface', () => {
    beforeEach(() => {
        cy.intercept('GET', '**/auth/user', { body: { id: 'test-user-123' } });
        cy.intercept('GET', '**/sessions/*', {
            body: { id: 'session-123', status: 'RUNNING' }
        });
    });

    describe('Signal Display', () => {
        it('displays incoming signals', () => {
            cy.visit('/session/session-123');
            
            // Mock WebSocket signal by triggering custom event
            cy.document().then((doc: any) => {
                const event = new CustomEvent('tradermind:signal', {
                    detail: {
                        type: 'CALL',
                        confidence: 0.85,
                        market: 'R_100',
                        reason: 'Strong momentum detected'
                    }
                });
                doc.dispatchEvent(event);
            });
            
            // Signal should appear in UI
            cy.get('[data-testid="signal-card"]').should('exist');
        });
    });

    describe('Market Data', () => {
        it('displays live market data', () => {
            cy.visit('/session/session-123');
            
            // Should show market data section
            cy.get('[data-testid="market-data"], .market-chart').should('exist');
        });
    });

    describe('Trade History', () => {
        it('displays executed trades', () => {
            cy.intercept('GET', '**/trades*', {
                body: [
                    { id: 't1', type: 'CALL', outcome: 'WIN', profit: 1.5 },
                    { id: 't2', type: 'PUT', outcome: 'LOSS', profit: -1.0 }
                ]
            }).as('getTrades');
            
            cy.visit('/session/session-123');
            cy.wait('@getTrades');
            
            // Should show trade history
            cy.get('[data-testid="trade-history"]').should('exist');
        });
    });
});
