import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from './crypto.js';

describe('Crypto Utils', () => {
    it('should encrypt and decrypt a string correctly', () => {
        const original = "deriv_token_secret_123";
        const encrypted = encrypt(original);

        expect(encrypted).not.toBe(original);
        expect(encrypted.length).toBeGreaterThan(0);

        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(original);
    });

    it('should generate different random IVs for same input', () => {
        const input = "same_input";
        const enc1 = encrypt(input);
        const enc2 = encrypt(input);

        expect(enc1).not.toBe(enc2);
    });
});
