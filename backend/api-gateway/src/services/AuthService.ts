import { SignJWT, jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(process.env['SESSION_SECRET'] || 'super-secret-session-key-change-in-prod');

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
