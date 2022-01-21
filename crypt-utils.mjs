import crypto from 'crypto'
import { config } from 'dotenv'

config()

const KEY = crypto.createHash('sha256')
  .update(String(process.env.FCM_ENCRYPTION_KEY))
  .digest('base64')
  .substr(0, 32)

const ALGORITHM = 'aes-256-ctr'

export const encrypt = (buffer) => {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  return Buffer.concat([iv, cipher.update(buffer), cipher.final()])
}

export const decrypt = (encrypted) => {
  const iv = encrypted.slice(0, 16)
  encrypted = encrypted.slice(16)
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  return Buffer.concat([decipher.update(encrypted), decipher.final()])
}