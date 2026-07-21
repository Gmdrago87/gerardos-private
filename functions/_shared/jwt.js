/**
 * JWT utilities using Web Crypto API (compatible with Cloudflare Workers)
 * Uses HMAC-SHA256 for signing and verification
 */

// Cache for crypto keys to avoid repeated imports
const keyCache = new Map();

/**
 * Base64 URL encode without padding
 * @param {ArrayBuffer} arrayBuffer - Data to encode
 * @returns {string} Base64 URL encoded string
 */
function base64UrlEncode(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const len = bytes.byteLength;
    let binary = "";
    const CHUNK_SIZE = 0x8000;
    for (let i = 0; i < len; i += CHUNK_SIZE) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE));
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Base64 URL decode
 * @param {string} str - Base64 URL encoded string
 * @returns {ArrayBuffer} Decoded data
 */
function base64UrlDecode(str) {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) {
        base64 += "=".repeat(4 - pad);
    }
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Get or create a crypto key from secret
 * @param {string} secret - The secret key
 * @returns {Promise<CryptoKey>} The crypto key
 */
async function getCryptoKey(secret) {
    const cacheKey = `jwt_${secret.length}`;
    let key = keyCache.get(cacheKey);
    
    if (!key) {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        key = await crypto.subtle.importKey(
            "raw",
            keyData,
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign", "verify"]
        );
        keyCache.set(cacheKey, key);
    }
    
    return key;
}

/**
 * Sign a JWT token
 * @param {Object} payload - The JWT payload
 * @param {string} secret - The secret key
 * @param {number} [expiresIn] - Expiration time in seconds (default: 30 minutes)
 * @returns {Promise<string>} The signed JWT token
 */
export async function signJwt(payload, secret, expiresIn = 1800) {
    const header = { alg: "HS256", typ: "JWT" };
    const encoder = new TextEncoder();
    
    // Add expiration if not provided
    const now = Math.floor(Date.now() / 1000);
    const finalPayload = {
        iat: now,
        exp: now + expiresIn,
        ...payload
    };
    
    const part1 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
    const part2 = base64UrlEncode(encoder.encode(JSON.stringify(finalPayload)));
    
    const key = await getCryptoKey(secret);
    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(`${part1}.${part2}`)
    );
    
    const part3 = base64UrlEncode(signature);
    return `${part1}.${part2}.${part3}`;
}

/**
 * Verify a JWT token
 * @param {string} token - The JWT token to verify
 * @param {string} secret - The secret key
 * @returns {Promise<Object|null>} The decoded payload or null if invalid
 */
export async function verifyJwt(token, secret) {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        
        const [part1, part2, part3] = parts;
        const encoder = new TextEncoder();
        
        const key = await getCryptoKey(secret);
        const signatureBytes = base64UrlDecode(part3);
        
        const isValid = await crypto.subtle.verify(
            "HMAC",
            key,
            signatureBytes,
            encoder.encode(`${part1}.${part2}`)
        );
        
        if (!isValid) return null;
        
        const payloadJson = new TextDecoder().decode(base64UrlDecode(part2));
        const payload = JSON.parse(payloadJson);
        
        // Validate required claims
        const now = Math.floor(Date.now() / 1000);
        
        // Check expiration
        if (!Number.isInteger(payload.exp) || payload.exp <= now) {
            return null;
        }
        
        // Check issued at (allow 60 seconds clock skew)
        if (!Number.isInteger(payload.iat) || payload.iat > now + 60) {
            return null;
        }
        
        // Check not before if present
        if (payload.nbf && (!Number.isInteger(payload.nbf) || payload.nbf > now + 60)) {
            return null;
        }
        
        // Check subject
        if (typeof payload.sub !== "string" || payload.sub.length === 0) {
            return null;
        }
        
        return payload;
    } catch (e) {
        console.error('JWT verification error:', e.message);
        return null;
    }
}

/**
 * Clear the key cache (useful for testing)
 */
export function clearKeyCache() {
    keyCache.clear();
}
