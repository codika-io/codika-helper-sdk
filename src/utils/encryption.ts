/**
 * Encryption Utilities (Node.js port)
 *
 * Hybrid encryption (RSA-OAEP + AES-GCM) for integration tokens and secrets.
 * This is a Node.js port of the browser-based encryption from
 * codika-app/src/lib/services/integrations/utils/integrationEncryption.ts
 *
 * Compatibility:
 * - Uses WebCrypto API (crypto.subtle) available in Node 18+
 * - AES-GCM output includes the 16-byte auth tag appended to the ciphertext,
 *   matching the browser WebCrypto behavior
 * - The backend (functions/src/utils/crypto/decryption.ts) splits the last 16 bytes
 *   as the auth tag when decrypting
 * - RSA-OAEP with SHA-256 matches backend's RSA_PKCS1_OAEP_PADDING + oaepHash 'sha256'
 * - Serialization format: JSON.stringify({ encryptedKey, encryptedData, iv }) all base64
 */

import { webcrypto } from 'crypto';

const subtle = webcrypto.subtle;

// ========================================
// CONSTANTS
// ========================================

const DEFAULT_PUBLIC_KEY_URL = 'https://app.codika.io/encryption/public.pem';

// ========================================
// TYPES
// ========================================

/**
 * Encrypted data structure containing all components needed for decryption.
 * This matches the structure expected by the backend's `deserializeAndDecrypt()`.
 */
export interface EncryptedData {
	/** RSA-OAEP encrypted AES-256 key, base64-encoded */
	encryptedKey: string;
	/** AES-GCM encrypted data with 16-byte auth tag appended, base64-encoded */
	encryptedData: string;
	/** 96-bit initialization vector for AES-GCM, base64-encoded */
	iv: string;
}

/**
 * Encrypted field representation for storage in Firestore.
 * The `value` field contains the JSON-serialized EncryptedData.
 */
export interface EncryptedField {
	/** JSON.stringify(EncryptedData) */
	value: string;
	/** Always true for encrypted fields */
	encrypted: boolean;
	/** Optional human-readable description of the secret */
	description?: string;
}

// ========================================
// PUBLIC KEY CACHE
// ========================================

/** In-memory cache for fetched public keys, keyed by URL */
const publicKeyCache = new Map<string, string>();

/**
 * Fetch the RSA public key (PEM format) from the Codika platform.
 *
 * The key is cached in memory for the lifetime of the process to avoid
 * redundant network requests.
 *
 * @param publicKeyUrl - URL to fetch the public key from.
 *   Defaults to `CODIKA_PUBLIC_KEY_URL` env var, or the platform's hosted key.
 * @returns The public key in PEM format
 * @throws If the key cannot be fetched
 */
export async function fetchPublicKey(publicKeyUrl?: string): Promise<string> {
	const url = publicKeyUrl ?? process.env.CODIKA_PUBLIC_KEY_URL ?? DEFAULT_PUBLIC_KEY_URL;

	const cached = publicKeyCache.get(url);
	if (cached) {
		return cached;
	}

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch public key from ${url}: ${response.status} ${response.statusText}`);
	}

	const pem = await response.text();

	if (!pem.includes('-----BEGIN PUBLIC KEY-----')) {
		throw new Error(`Invalid public key format from ${url}: missing PEM header`);
	}

	publicKeyCache.set(url, pem);
	return pem;
}

// ========================================
// INTERNAL HELPERS
// ========================================

/**
 * Convert a PEM-encoded public key to an ArrayBuffer (DER format).
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
	const base64 = pem
		.replace('-----BEGIN PUBLIC KEY-----', '')
		.replace('-----END PUBLIC KEY-----', '')
		.replace(/\s/g, '');

	const buffer = Buffer.from(base64, 'base64');
	return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/**
 * Convert an ArrayBuffer to a base64 string.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
	return Buffer.from(buffer).toString('base64');
}

// ========================================
// ENCRYPTION
// ========================================

/**
 * Encrypt a plaintext secret using RSA-OAEP + AES-GCM hybrid encryption.
 *
 * The encryption process:
 * 1. Fetches the RSA public key from the Codika platform (cached per process)
 * 2. Generates a random 256-bit AES key
 * 3. Generates a random 96-bit IV
 * 4. Encrypts the plaintext with AES-256-GCM (output includes 16-byte auth tag)
 * 5. Encrypts the AES key with RSA-OAEP (SHA-256)
 * 6. Returns an {@link EncryptedField} ready for Firestore storage
 *
 * The output is compatible with the backend's `deserializeAndDecrypt()` function
 * which uses Node.js `crypto.privateDecrypt()` for the RSA step and
 * `crypto.createDecipheriv('aes-256-gcm')` for the AES step, splitting the
 * last 16 bytes of `encryptedData` as the GCM auth tag.
 *
 * @param plaintext - The secret value to encrypt
 * @param description - Optional description of the secret (stored unencrypted)
 * @param publicKeyUrl - Optional URL override for the public key.
 *   Defaults to `CODIKA_PUBLIC_KEY_URL` env var, or the platform's hosted key.
 * @returns An {@link EncryptedField} with the serialized encrypted data
 * @throws If encryption fails (e.g., public key unavailable, crypto error)
 *
 * @example
 * ```ts
 * const field = await encryptSecret('sk-my-api-key', 'OpenAI API Key');
 * // field.value is JSON with { encryptedKey, encryptedData, iv }
 * // field.encrypted is true
 * // Store field in Firestore
 * ```
 */
export async function encryptSecret(
	plaintext: string,
	description?: string,
	publicKeyUrl?: string
): Promise<EncryptedField> {
	try {
		// 1. Fetch and import the RSA public key
		const pem = await fetchPublicKey(publicKeyUrl);

		const publicKey = await subtle.importKey(
			'spki',
			pemToArrayBuffer(pem),
			{
				name: 'RSA-OAEP',
				hash: { name: 'SHA-256' }
			},
			false,
			['encrypt']
		);

		// 2. Generate a random 256-bit AES key
		const aesKey = await subtle.generateKey(
			{
				name: 'AES-GCM',
				length: 256
			},
			true, // extractable — we need to export it for RSA encryption
			['encrypt']
		);

		const aesKeyRaw = await subtle.exportKey('raw', aesKey);

		// 3. Generate a random 96-bit IV (recommended for AES-GCM)
		const iv = new Uint8Array(12);
		webcrypto.getRandomValues(iv);

		// 4. Encrypt the plaintext with AES-GCM
		// WebCrypto AES-GCM automatically appends the 16-byte auth tag to the ciphertext.
		// This is critical: the backend expects this format and splits the last 16 bytes.
		const encoder = new TextEncoder();
		const plaintextBytes = encoder.encode(plaintext);

		const encryptedDataBuffer = await subtle.encrypt(
			{
				name: 'AES-GCM',
				iv: iv
			},
			aesKey,
			plaintextBytes
		);

		// 5. Encrypt the AES key with RSA-OAEP
		const encryptedKeyBuffer = await subtle.encrypt(
			{
				name: 'RSA-OAEP'
			},
			publicKey,
			aesKeyRaw
		);

		// 6. Build the encrypted data structure (all base64)
		const encryptedData: EncryptedData = {
			encryptedKey: arrayBufferToBase64(encryptedKeyBuffer),
			encryptedData: arrayBufferToBase64(encryptedDataBuffer),
			iv: arrayBufferToBase64(iv.buffer)
		};

		// 7. Build the encrypted field
		const field: EncryptedField = {
			value: JSON.stringify(encryptedData),
			encrypted: true
		};

		if (description) {
			field.description = description;
		}

		return field;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		throw new Error(`Failed to encrypt secret: ${message}`);
	}
}
