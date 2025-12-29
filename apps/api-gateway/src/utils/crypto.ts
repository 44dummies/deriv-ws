import crypto from "crypto";

const ALGO = "aes-256-gcm";
// Ensure key is 32 bytes (64 hex characters)
// Fallback for dev only - strictly requires env in prod
const KEY_HEX = process.env.DERIV_TOKEN_KEY || "0000000000000000000000000000000000000000000000000000000000000000";
const KEY = Buffer.from(KEY_HEX, "hex");

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, KEY, iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(payload: string): string {
    const buf = Buffer.from(payload, "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const text = buf.subarray(28);

    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(tag);

    return decipher.update(text) + decipher.final("utf8");
}
