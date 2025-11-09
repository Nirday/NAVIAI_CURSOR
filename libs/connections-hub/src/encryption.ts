/**
 * Token Encryption/Decryption Utilities
 * Encrypts OAuth tokens before storing in database
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits

/**
 * Gets encryption key from environment variable
 * Falls back to a default for development (not secure for production)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  
  if (!key) {
    // For V1 development - in production, this must be set
    console.warn('ENCRYPTION_KEY not set, using default (INSECURE FOR PRODUCTION)')
    return Buffer.from('default-key-32-chars-long-for-dev!!', 'utf8')
  }
  
  // Ensure key is 32 bytes
  if (key.length < KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be at least ${KEY_LENGTH} characters`)
  }
  
  return Buffer.from(key.substring(0, KEY_LENGTH), 'utf8')
}

/**
 * Encrypts a token string
 */
export function encryptToken(token: string): string {
  try {
    const key = getEncryptionKey()
    const iv = randomBytes(16)
    
    const cipher = createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(token, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    // Return IV + AuthTag + Encrypted data (all hex encoded)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  } catch (error: any) {
    throw new Error(`Token encryption failed: ${error.message}`)
  }
}

/**
 * Decrypts an encrypted token string
 */
export function decryptToken(encryptedToken: string): string {
  try {
    const key = getEncryptionKey()
    const parts = encryptedToken.split(':')
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format')
    }
    
    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]
    
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error: any) {
    throw new Error(`Token decryption failed: ${error.message}`)
  }
}

