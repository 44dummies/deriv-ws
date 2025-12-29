describe('Live Session Authentication', () => {
    it('redirects unauthenticated users to login', () => {
        cy.visit('/session/test-session-123');
        cy.url().should('include', '/login');
        cy.contains('Sign in to access').should('be.visible');
    });

    it('renders login form correctly', () => {
        cy.visit('/login');
        cy.get('input[type="email"]').should('be.visible');
        cy.get('input[type="password"]').should('be.visible');
        cy.get('button[type="submit"]').should('contain', 'Sign In');
    });

    it('shows error on invalid login', () => {
        cy.visit('/login');
        cy.get('input[type="email"]').type('badUser@example.com');
        cy.get('input[type="password"]').type('wrongPassword');
        cy.get('button[type="submit"]').click();

        // Expect error message container to verify error handling works
        // The actual message depends on Supabase response (Network Error vs Invalid Creds)
        cy.get('.text-red-500').should('be.visible');
    });
});
