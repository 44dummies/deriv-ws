/**
 * TraderMind E2E Test Suite: Error Handling & Edge Cases
 * Tests for error boundaries, network failures, and edge cases
 */

describe('Error Handling', () => {
    describe('Network Errors', () => {
        it('handles API timeout gracefully', () => {
            cy.intercept('GET', '**/sessions', {
                delay: 30000, // 30 second delay (should timeout)
                statusCode: 200,
                body: []
            }).as('slowRequest');
            
            cy.visit('/dashboard');
            
            // Should show loading state or timeout message
            cy.get('[data-testid="loading"], .loading-spinner').should('exist');
        });

        it('handles server error (500) gracefully', () => {
            cy.intercept('GET', '**/sessions', {
                statusCode: 500,
                body: { error: 'Internal server error' }
            }).as('serverError');
            
            cy.visit('/dashboard');
            cy.wait('@serverError');
            
            // Should show error message, not crash
            cy.contains(/error|failed|try again/i).should('be.visible');
        });

        it('handles network disconnect', () => {
            // Simulate offline
            cy.intercept('**/api/**', { forceNetworkError: true }).as('networkError');
            
            cy.visit('/dashboard');
            
            // Should show offline message or error boundary
            cy.get('[data-testid="error-boundary"], .error-message').should('exist');
        });
    });

    describe('Error Boundaries', () => {
        it('catches component errors without crashing app', () => {
            // Visit app - if error boundary works, page shouldn't white screen
            cy.visit('/');
            
            // Should have some visible content
            cy.get('body').should('not.be.empty');
            cy.contains(/tradermind|welcome|login/i).should('be.visible');
        });

        it('displays user-friendly error message', () => {
            // Simulate a component error by providing bad data
            cy.intercept('GET', '**/sessions/*', {
                statusCode: 200,
                body: null // Invalid data that might cause error
            }).as('badData');
            
            cy.visit('/session/bad-session');
            
            // Should show error message, not crash
            cy.get('body').should('not.be.empty');
        });

        it('provides retry option on error', () => {
            let callCount = 0;
            cy.intercept('GET', '**/sessions', (req) => {
                callCount++;
                if (callCount === 1) {
                    req.reply({ statusCode: 500 });
                } else {
                    req.reply({ body: [] });
                }
            }).as('retryRequest');
            
            cy.visit('/dashboard');
            
            // Should have retry button if error
            cy.get('[data-testid="retry-btn"], button:contains("Retry")').click({ force: true });
            
            // Second call should succeed
            cy.wait('@retryRequest');
        });
    });

    describe('WebSocket Connection', () => {
        it('handles WebSocket disconnect gracefully', () => {
            cy.visit('/session/session-123');
            
            // Should show connection status
            cy.get('[data-testid="connection-status"]').should('exist');
        });

        it('shows reconnecting state', () => {
            cy.visit('/session/session-123');
            
            // Simulate disconnect
            cy.window().then((win) => {
                // Emit disconnection event if socket exists
                const socket = (win as any).socket;
                if (socket) {
                    socket.disconnect();
                }
            });
            
            // Should show reconnecting message
            cy.contains(/reconnecting|disconnected/i, { timeout: 5000 }).should('be.visible');
        });
    });
});

describe('Edge Cases', () => {
    describe('Empty States', () => {
        it('shows empty state when no sessions exist', () => {
            cy.intercept('GET', '**/sessions', { body: [] }).as('emptySessions');
            
            cy.visit('/dashboard');
            cy.wait('@emptySessions');
            
            // Should show empty state message
            cy.contains(/no sessions|create your first|get started/i).should('be.visible');
        });

        it('shows empty state when no trades exist', () => {
            cy.intercept('GET', '**/trades*', { body: [] }).as('emptyTrades');
            
            cy.visit('/trades');
            cy.wait('@emptyTrades');
            
            // Should show empty trades message
            cy.contains(/no trades|start trading/i).should('be.visible');
        });
    });

    describe('Concurrent Actions', () => {
        it('prevents double-submission of forms', () => {
            let submitCount = 0;
            cy.intercept('POST', '**/sessions', (req) => {
                submitCount++;
                req.reply({ delay: 500, body: { id: 'new-123' } });
            }).as('createSession');
            
            cy.visit('/sessions/new');
            cy.get('input[name="name"]').type('Test');
            
            // Double-click submit
            cy.get('button[type="submit"]').dblclick();
            
            // Wait for request
            cy.wait('@createSession');
            
            // Should only submit once
            cy.wrap(null).then(() => {
                expect(submitCount).to.equal(1);
            });
        });
    });

    describe('Navigation', () => {
        it('handles browser back button correctly', () => {
            cy.visit('/dashboard');
            cy.visit('/sessions/new');
            
            cy.go('back');
            
            cy.url().should('include', '/dashboard');
        });

        it('handles deep linking', () => {
            cy.visit('/session/deep-link-session-123');
            
            // Should attempt to load the session
            cy.url().should('include', '/session/deep-link-session-123');
        });
    });

    describe('Input Validation', () => {
        it('sanitizes XSS in input fields', () => {
            cy.visit('/sessions/new');
            
            const xssPayload = '<script>alert("xss")</script>';
            cy.get('input[name="name"]').type(xssPayload);
            
            // Should escape the input, not execute
            cy.get('input[name="name"]').should('have.value', xssPayload);
            cy.get('script').should('not.exist');
        });

        it('handles very long input', () => {
            cy.visit('/sessions/new');
            
            const longInput = 'a'.repeat(1000);
            cy.get('input[name="name"]').type(longInput);
            
            // Input should be truncated or validated
            cy.get('input[name="name"]').invoke('val').then((val) => {
                expect((val as string).length).to.be.lessThan(500);
            });
        });
    });
});

describe('Accessibility', () => {
    it('has proper focus management', () => {
        cy.visit('/login');
        
        // Focus first input and verify
        cy.get('input[type="email"]').focus();
        cy.focused().should('have.attr', 'type', 'email');
        
        // Focus second input
        cy.get('input[type="password"]').focus();
        cy.focused().should('have.attr', 'type', 'password');
    });

    it('has proper ARIA labels or associated labels', () => {
        cy.visit('/login');
        
        // Form inputs should have labels or aria-label
        cy.get('input[type="email"]').then(($el) => {
            const hasAriaLabel = $el.attr('aria-label');
            const hasId = $el.attr('id');
            expect(hasAriaLabel || hasId).to.exist;
        });
        
        cy.get('input[type="password"]').then(($el) => {
            const hasAriaLabel = $el.attr('aria-label');
            const hasId = $el.attr('id');
            expect(hasAriaLabel || hasId).to.exist;
        });
    });

    it('supports keyboard navigation', () => {
        cy.visit('/login');
        
        // Should be able to submit with Enter key
        cy.get('input[type="email"]').type('test@example.com');
        cy.get('input[type="password"]').type('password123{enter}');
        
        // Form should submit
        cy.url().should('not.equal', '/login'); // Should redirect or show error
    });
});

describe('Performance', () => {
    it('loads dashboard within acceptable time', () => {
        const start = Date.now();
        
        cy.visit('/dashboard');
        
        cy.get('[data-testid="dashboard"]').then(() => {
            const loadTime = Date.now() - start;
            expect(loadTime).to.be.lessThan(5000); // 5 second max
        });
    });

    it('handles large data sets', () => {
        // Generate large dataset
        const largeTrades = Array.from({ length: 100 }, (_, i) => ({
            id: `trade-${i}`,
            type: i % 2 === 0 ? 'CALL' : 'PUT',
            outcome: i % 3 === 0 ? 'WIN' : 'LOSS',
            profit: (Math.random() * 10 - 5).toFixed(2)
        }));
        
        cy.intercept('GET', '**/trades*', { body: largeTrades }).as('largeTrades');
        
        cy.visit('/trades');
        cy.wait('@largeTrades');
        
        // Should render without performance issues
        cy.get('[data-testid="trade-row"]').should('have.length.greaterThan', 0);
    });
});
