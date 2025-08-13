// TOTP (Time-based One-Time Password) implementation
// Based on RFC 6238 specification

const DIGITS = 6
const PERIOD = 30 // seconds
const ALGORITHM = "SHA-1"

// Base32 encoding/decoding
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

export function generateSecret(): string {
  const bytes = new Uint8Array(20) // 160 bits
  crypto.getRandomValues(bytes)
  return encodeBase32(bytes)
}

function encodeBase32(bytes: Uint8Array): string {
  let result = ""
  let buffer = 0
  let bitsLeft = 0

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte
    bitsLeft += 8

    while (bitsLeft >= 5) {
      result += BASE32_CHARS[(buffer >>> (bitsLeft - 5)) & 31]
      bitsLeft -= 5
    }
  }

  if (bitsLeft > 0) {
    result += BASE32_CHARS[(buffer << (5 - bitsLeft)) & 31]
  }

  return result
}

function decodeBase32(encoded: string): Uint8Array {
  const cleanInput = encoded.toUpperCase().replace(/[^A-Z2-7]/g, "")
  const bytes: number[] = []
  let buffer = 0
  let bitsLeft = 0

  for (const char of cleanInput) {
    const value = BASE32_CHARS.indexOf(char)
    if (value === -1) continue

    buffer = (buffer << 5) | value
    bitsLeft += 5

    if (bitsLeft >= 8) {
      bytes.push((buffer >>> (bitsLeft - 8)) & 255)
      bitsLeft -= 8
    }
  }

  return new Uint8Array(bytes)
}

async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"])

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, data)
  return new Uint8Array(signature)
}

function intToBytes(num: number): Uint8Array {
  const bytes = new Uint8Array(8)
  for (let i = 7; i >= 0; i--) {
    bytes[i] = num & 0xff
    num = num >>> 8
  }
  return bytes
}

export async function generateTOTP(secret: string, timestamp?: number): Promise<string> {
  const time = Math.floor((timestamp || Date.now()) / 1000 / PERIOD)
  const key = decodeBase32(secret)
  const timeBytes = intToBytes(time)

  const hmac = await hmacSha1(key, timeBytes)
  const offset = hmac[hmac.length - 1] & 0x0f

  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    Math.pow(10, DIGITS)

  return code.toString().padStart(DIGITS, "0")
}

export async function verifyTOTP(secret: string, token: string, window = 1): Promise<boolean> {
  const now = Date.now()

  // Check current time and adjacent time windows
  for (let i = -window; i <= window; i++) {
    const testTime = now + i * PERIOD * 1000
    const expectedToken = await generateTOTP(secret, testTime)

    if (expectedToken === token) {
      return true
    }
  }

  return false
}

export function generateQRCodeURL(secret: string, accountName: string, issuer: string): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: ALGORITHM,
    digits: DIGITS.toString(),
    period: PERIOD.toString(),
  })

  const otpauthURL = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?${params}`

  // Using a public QR code service - in production, generate QR codes server-side
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthURL)}`
}

export function formatSecret(secret: string): string {
  // Format secret in groups of 4 for easier manual entry
  return secret.match(/.{1,4}/g)?.join(" ") || secret
}
