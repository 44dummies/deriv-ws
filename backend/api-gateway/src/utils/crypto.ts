import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

// Lazy-load key to allow server startup for healthchecks
let KEY: Uint8Array | null = null;

function getKey(): Uint8Array {
    if (!KEY) {
        const KEY_HEX = process.env.DERIV_TOKEN_KEY;
        if (!KEY_HEX) {
            throw new Error('FATAL: DERIV_TOKEN_KEY environment variable is required. Generate with: openssl rand -hex 32');
        }
        const keyBuf = Buffer.from(KEY_HEX, "hex");
        if (keyBuf.length !== 32) {
            throw new Error('FATAL: DERIV_TOKEN_KEY must be exactly 32 bytes (64 hex characters)');
        }
        KEY = new Uint8Array(keyBuf);
    }
    return KEY;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
    let total = 0;
    for (const chunk of chunks) {
        total += chunk.length;
    }

    const combined = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
    }
    return combined;
}

export function encrypt(text: string): string {
    const key = getKey();
    const iv = new Uint8Array(crypto.randomBytes(IV_LENGTH));
    const cipher = crypto.createCipheriv(ALGO, key, iv);

    const encrypted = new Uint8Array(cipher.update(text, "utf8"));
    const finalChunk = new Uint8Array(cipher.final());
    const tag = new Uint8Array(cipher.getAuthTag());

    // Return IV + Tag + Encrypted as base64
    const payload = concatBytes([iv, tag, encrypted, finalChunk]);
    return Buffer.from(payload).toString("base64");
}

export function decrypt(payload: string): string {
    const key = getKey();
    const data = new Uint8Array(Buffer.from(payload, "base64"));

    // Extract parts
    const iv = data.subarray(0, IV_LENGTH);
    const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);

    // Decrypt and return as string
    const decrypted = concatBytes([
        new Uint8Array(decipher.update(encrypted)),
        new Uint8Array(decipher.final())
    ]);
    return Buffer.from(decrypted).toString("utf8");
}
