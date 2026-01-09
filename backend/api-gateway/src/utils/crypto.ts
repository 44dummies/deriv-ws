import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

// Lazy-load key to allow server startup for healthchecks
let KEY: Buffer | null = null;

function getKey(): Buffer {
    if (!KEY) {
        const KEY_HEX = process.env.DERIV_TOKEN_KEY;
        if (!KEY_HEX) {
            throw new Error('FATAL: DERIV_TOKEN_KEY environment variable is required. Generate with: openssl rand -hex 32');
        }
        KEY = Buffer.from(KEY_HEX, "hex");
        if (KEY.length !== 32) {
            throw new Error('FATAL: DERIV_TOKEN_KEY must be exactly 32 bytes (64 hex characters)');
        }
    }
    return KEY;
}

export function encrypt(text: string): string {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGO, key, iv);

    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Return IV + Tag + Encrypted as base64
    return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(payload: string): string {
    const key = getKey();
    const buf = Buffer.from(payload, "base64");

    // Extract parts
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);

    // Decrypt and return as string
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
