import { SignJWT, jwtVerify } from 'jose';

// SECURITY: Lazy-load secret key to allow server startup for healthchecks
let SECRET_KEY: Uint8Array | null = null;

function getSecretKey(): Uint8Array {
    if (!SECRET_KEY) {
        const secret = process.env['SESSION_SECRET'];
        if (!secret) {
            throw new Error('FATAL: SESSION_SECRET environment variable is required. Generate with: openssl rand -hex 32');
        }
        SECRET_KEY = new TextEncoder().encode(secret);
    }
    return SECRET_KEY;
}

export const AuthService = {
    async generateSessionToken(payload: { userId: string, role: string, email: string }) {
        return await new SignJWT(payload)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(getSecretKey());
    },

    async verifySessionToken(token: string) {
        try {
            const { payload } = await jwtVerify(token, getSecretKey());
            return payload as { userId: string, role: string, email: string };
        } catch (error) {
            return null;
        }
    }
};
