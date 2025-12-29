import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import { vi, describe, it, expect } from 'vitest';

// Mock Supabase and Store
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            signInWithPassword: vi.fn(),
            getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
            onAuthStateChange: vi.fn(),
        },
    },
}));

vi.mock('../stores/useAuthStore', () => ({
    useAuthStore: () => ({
        initialize: vi.fn(),
        loading: false,
        user: null,
    }),
}));

describe('Login Component', () => {
    it('renders login form', () => {
        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );
        expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    });

    it('handles input changes', () => {
        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );
        const emailInput = screen.getByPlaceholderText(/name@example.com/i);
        const passwordInput = screen.getByPlaceholderText(/••••••••/i);

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });

        expect(emailInput).toHaveValue('test@example.com');
        expect(passwordInput).toHaveValue('password123');
    });
});
