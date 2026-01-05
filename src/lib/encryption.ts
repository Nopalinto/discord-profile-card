import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// Get encryption key from environment variable
function getEncryptionKey(): Buffer {
  // Use a dedicated encryption key or fallback to NextAuth secret
  // In production, ENCRYPTION_KEY should be set to a strong random string
  const secret = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  
  if (!secret) {
    throw new Error('CRITICAL SECURITY: ENCRYPTION_KEY or NEXTAUTH_SECRET is not set.');
  }
  
  // Ensure key is 32 bytes (256 bits) using SHA-256
  return createHash('sha256').update(String(secret)).digest();
}

export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    // 12 bytes (96 bits) IV is recommended for AES-GCM
    const iv = randomBytes(12);
    
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encrypted (all hex encoded)
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed');
    throw new Error('Failed to encrypt data');
  }
}

export function decrypt(encryptedText: string): string {
  try {
    const key = getEncryptionKey();
    
    // Check if the text is in the expected format (iv:authTag:ciphertext)
    // If not, it might be an old unencrypted key or invalid data
    if (!encryptedText.includes(':')) {
      // Try to return as is (migration path for unencrypted keys)
      // verify if it looks like a RAWG key (alphanumeric)
      if (/^[a-zA-Z0-9]+$/.test(encryptedText)) {
        return encryptedText;
      }
      throw new Error('Invalid encrypted format');
    }

    const parts = encryptedText.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data parts');
    }
    
    const [ivHex, authTagHex, contentHex] = parts;
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(contentHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed');
    // In case of error, return empty string or throw depending on needs. 
    // Throwing is safer to avoid using garbage data.
    throw new Error('Failed to decrypt data');
  }
}
