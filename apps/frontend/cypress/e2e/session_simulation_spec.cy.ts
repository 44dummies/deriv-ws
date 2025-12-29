describe('Session Flow Simulation', () => {
    const sessionId = 'sim-session-001';

    beforeEach(() => {
        // 1. Visit Session Page with Test Mode Flag
        // This prevents useAuthStore.initialize() from overwriting our injected state
        cy.visit(`/session/${sessionId}`, {
            onBeforeLoad: (win: any) => {
                win.__CYPRESS_TEST_MODE__ = true;
            }
        });

        // Set viewport to ensure visibility of all elements
        cy.viewport(1920, 1080);

        // 2. Inject Authenticated State via AuthStore
        cy.window().should('have.property', 'useAuthStore');
        cy.window().then((win: any) => {
            win.useAuthStore.setState({
                user: { id: 'test-user-id', email: 'test@tradermind.app' },
                session: { access_token: 'fake-jwt', refresh_token: 'fake-refresh' },
                isAdmin: true, // Simulate Admin to avoid permissions issues
                loading: false // Important to stop loading spinner
            });
        });

        // 3. Wait for RealTimeStore
        cy.window().should('have.property', 'useRealTimeStore');

        // Debug assertions
        cy.url().should('include', `/session/${sessionId}`); // Ensure no redirect
        cy.get('body').then($body => {
            if ($body.find('form').length > 0) {
                cy.log('Showing Login Form!');
            }
        });
        cy.contains('Live Session Monitor', { timeout: 10000 }).should('be.visible');
        cy.contains('No events yet...').should('exist');
        cy.contains('Current Balance').parents('.glass-panel').contains('$10,000.00').should('be.visible');
        cy.contains('Total PnL').parents('.glass-panel').contains('+0.00').should('have.class', 'text-green-400');
    });

    it('simulates a full trading session lifecycle', () => {
        // 2. Simulate Signal Reception
        cy.window().then((win: any) => {
            const store = win.useRealTimeStore;
            store.getState().addSignal({
                market: 'EUR/USD',
                type: 'CALL',
                confidence: 0.85,
                reason: 'RSI Divergence',
                expiry: 60,
                timestamp: Date.now()
            });
        });

        // Verify Signal UI
        cy.contains('Signals Generated').parents('.glass-panel').within(() => {
            cy.contains('EUR/USD').should('exist');
            cy.contains('CALL').should('exist');
            cy.contains('85.0%').should('exist');
            cy.contains('RSI Divergence').should('exist');
        });

        // 3. Simulate Trade Execution (Profit)
        cy.window().then((win: any) => {
            const store = win.useRealTimeStore;
            store.getState().addTrade({
                tradeId: 'trade-001',
                userId: 'user-001',
                sessionId: sessionId,
                status: 'SUCCESS',
                profit: 150.00,
                executedAt: Date.now(),
                metadata_json: {
                    market: 'EUR/USD',
                    entryPrice: 1.0500,
                    reason: 'Signal Match',
                    risk_confidence: 0.95
                }
            });
        });

        // Verify Trade UI
        cy.contains('Executed Trades').parents('.glass-panel').within(() => {
            cy.contains('EUR/USD').should('exist');
            cy.contains('150.00').should('exist');
        });

        // Verify Balance Update (10000 + 150)
        cy.contains('Current Balance').parents('.glass-panel').contains('$10,150.00');

        // 4. Simulate Trade Execution (Loss)
        cy.window().then((win: any) => {
            const store = win.useRealTimeStore;
            store.getState().addTrade({
                tradeId: 'trade-002',
                userId: 'user-001',
                sessionId: sessionId,
                status: 'SUCCESS', // Executed successfully, but resulted in loss? 
                // Wait, logic in store adds profit. If profit is negative, it handles it.
                profit: -50.00,
                executedAt: Date.now(),
                metadata_json: {
                    market: 'GBP/USD',
                    entryPrice: 1.2500,
                    reason: 'Signal Match',
                    risk_confidence: 0.90
                }
            });
        });

        // Verify Balance Update (10150 - 50 = 10100)
        cy.contains('Current Balance').parents('.glass-panel').contains('$10,100.00');

        // 5. Simulate Session Pause
        cy.window().then((win: any) => {
            win.useRealTimeStore.getState().setSessionStatus('PAUSED');
        });

        // Verify Overlay
        cy.contains('Session Paused').should('be.visible');
        cy.contains('Trading is currently paused correctly').should('be.visible');

        // 6. Simulate Session Resume
        cy.window().then((win: any) => {
            win.useRealTimeStore.getState().setSessionStatus('ACTIVE');
        });

        cy.contains('Session Paused').should('not.exist');
    });
});
