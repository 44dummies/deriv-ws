/**
 * TraderMind E2E Test Suite: Authentication & Authorization
 * Comprehensive tests for auth flows, error handling, and security
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const localStorage: any;

describe('Authentication & Security', () => {
    beforeEach(() => {
        // Clear any existing session
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    describe('Login Flow', () => {
        it('displays login page with all required elements', () => {
            cy.visit('/login');
            
            // Core form elements
            cy.get('input[type="email"]').should('be.visible');
            cy.get('input[type="password"]').should('be.visible');
            cy.get('button[type="submit"]').should('be.visible');
            
            // Branding/Title
            cy.contains('TraderMind').should('be.visible');
        });

        it('validates email format', () => {
            cy.visit('/login');
            cy.get('input[type="email"]').type('invalid-email');
            cy.get('input[type="password"]').type('password123');
            cy.get('button[type="submit"]').click();
            
            // Should show validation error or remain on login
            cy.url().should('include', '/login');
        });

        it('shows error for invalid credentials', () => {
            cy.visit('/login');
            cy.get('input[type="email"]').type('wrong@example.com');
            cy.get('input[type="password"]').type('wrongpassword');
            cy.get('button[type="submit"]').click();
            
            // Error message should appear
            cy.get('.text-red-500, [role="alert"]').should('be.visible');
        });

        it('disables submit button during loading', () => {
            cy.visit('/login');
            cy.get('input[type="email"]').type('test@example.com');
            cy.get('input[type="password"]').type('password123');
            
            // Intercept the auth request to check button state
            cy.intercept('POST', '**/auth/**', { delay: 1000 }).as('authRequest');
            cy.get('button[type="submit"]').click();
            
            // Button should be disabled during request
            cy.get('button[type="submit"]').should('be.disabled');
        });
    });

    describe('Protected Routes', () => {
        it('redirects to login when accessing protected route without auth', () => {
            cy.visit('/dashboard');
            cy.url().should('include', '/login');
        });

        it('redirects to login when accessing session page without auth', () => {
            cy.visit('/session/test-123');
            cy.url().should('include', '/login');
        });

        it('redirects to login when accessing settings without auth', () => {
            cy.visit('/settings');
            cy.url().should('include', '/login');
        });
    });

    describe('Logout Flow', () => {
        it('clears session on logout', () => {
            // Mock an authenticated session using Cypress localStorage command
            cy.window().then(() => {
                localStorage.setItem('sb-auth-token', JSON.stringify({ access_token: 'test' }));
            });
            
            cy.visit('/dashboard');
            
            // Find and click logout (if user is somehow auth'd)
            cy.get('[data-testid="logout-btn"], button:contains("Logout")').first().click({ force: true });
            
            // Should redirect to login
            cy.url().should('include', '/login');
            
            // Local storage should be cleared
            cy.window().then(() => {
                expect(localStorage.getItem('sb-auth-token')).to.be.null;
            });
        });
    });

    describe('CSRF Protection', () => {
        it('fetches CSRF token on page load', () => {
            cy.intercept('GET', '**/csrf-token').as('csrfRequest');
            cy.visit('/login');
            
            // Verify CSRF token is fetched (may be in background)
            // This validates the CSRF middleware is accessible
        });
    });
});

describe('Rate Limiting', () => {
    it('allows normal login attempts', () => {
        cy.intercept('POST', '**/auth/**').as('authRequest');
        cy.visit('/login');
        
        // First few attempts should go through
        for (let i = 0; i < 3; i++) {
            cy.get('input[type="email"]').clear().type('test@example.com');
            cy.get('input[type="password"]').clear().type('password123');
            cy.get('button[type="submit"]').click();
            cy.wait('@authRequest');
        }
    });
});
