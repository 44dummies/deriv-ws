import crypto from "crypto";

const ALGO = "aes-256-gcm";

// Lazy-load key to allow server startup for healthchecks
let KEY: Buffer | null = null;

function getKey(): Buffer {
    if (!KEY) {
        const KEY_HEX = process.env.DERIV_TOKEN_KEY;
        if (!KEY_HEX) {
            throw new Error('FATAL: DERIV_TOKEN_KEY environment variable is required. Generate with: openssl rand -hex 32');
        }
        KEY = Buffer.from(KEY_HEX, "hex");
    }
    return KEY;
}

export function encrypt(text: string): string {
    const key = getKey();
    const iv = crypto.randomBytes(12);
    // Explicitly cast to any or correct type to satisfy TS if environment types conflict
    const cipher = crypto.createCipheriv(ALGO, key as any, iv as any);

    // Concatenate encrypted content
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()] as any[]);
    const tag = cipher.getAuthTag();

    // Return IV + Tag + Encrypted
    return Buffer.concat([iv, tag, encrypted] as any[]).toString("base64");
}

export function decrypt(payload: string): string {
    const key = getKey();
    const buf = Buffer.from(payload, "base64");

    // Extract parts
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const text = buf.subarray(28);

    const decipher = crypto.createDecipheriv(ALGO, key as any, iv as any);
    decipher.setAuthTag(tag as any);

    // Decrypt
    // Force string return
    return decipher.update(text as any) + decipher.final("utf8");
}
