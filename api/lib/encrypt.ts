import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16
const KEY_LENGTH = 32

export type SealedPayload = {
  refreshToken: string
  email: string | null
  createdAt: number
}

export function hexKeyToBuffer(key: string): Buffer {
  const buf = Buffer.from(key, 'hex')
  if (buf.length !== KEY_LENGTH) {
    throw new Error(`TOKEN_ENC_KEY must be ${KEY_LENGTH} bytes in hex.`)
  }
  return buf
}

export function seal(payload: SealedPayload, keyHex: string): string {
  const key = hexKeyToBuffer(keyHex)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8')
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  const blob = Buffer.concat([iv, tag, ciphertext])
  return blob.toString('base64url')
}

export function open(blob: string, keyHex: string): SealedPayload {
  const key = hexKeyToBuffer(keyHex)
  const buf = Buffer.from(blob, 'base64url')
  if (buf.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Cookie blob is too short to be valid.')
  }
  const iv = buf.subarray(0, IV_LENGTH)
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])
  return JSON.parse(plaintext.toString('utf8')) as SealedPayload
}
