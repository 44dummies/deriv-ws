import { encrypt, decrypt } from './crypto.js';

console.log('Testing Crypto Utils...');

const original = "deriv_token_secret_123";
const encrypted = encrypt(original);

console.log('Original:', original);
console.log('Encrypted:', encrypted);

if (encrypted === original) {
    console.error('❌ Encryption failed: Output matches input');
    process.exit(1);
}

const decrypted = decrypt(encrypted);
console.log('Decrypted:', decrypted);

if (decrypted !== original) {
    console.error(`❌ Decryption failed: Expected ${original}, got ${decrypted}`);
    process.exit(1);
}

console.log('✅ Crypto Test Passed');
