import { SignJWT, jwtVerify } from 'jose';

// SECURITY: No fallback allowed - must be explicitly configured
if (!process.env['SESSION_SECRET']) {
    throw new Error('FATAL: SESSION_SECRET environment variable is required. Generate with: openssl rand -hex 32');
}
const SECRET_KEY = new TextEncoder().encode(process.env['SESSION_SECRET']);

export const AuthService = {
    async generateSessionToken(payload: { userId: string, role: string, email: string }) {
        return await new SignJWT(payload)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(SECRET_KEY);
    },

    async verifySessionToken(token: string) {
        try {
            const { payload } = await jwtVerify(token, SECRET_KEY);
            return payload as { userId: string, role: string, email: string };
        } catch (error) {
            return null;
        }
    }
};
