// ============================================================
// Crypto utilities using Web Crypto API (Cloudflare-compatible)
// Password hashing (PBKDF2), JWT signing/verification (HS256)
// ============================================================

const enc = new TextEncoder()
const dec = new TextDecoder()

function bufToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function base64url(input: string | Uint8Array): string {
  let str = ''
  if (typeof input === 'string') {
    str = btoa(unescape(encodeURIComponent(input)))
  } else {
    let bin = ''
    input.forEach((b) => (bin += String.fromCharCode(b)))
    str = btoa(bin)
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(input: string): string {
  input = input.replace(/-/g, '+').replace(/_/g, '/')
  while (input.length % 4) input += '='
  return decodeURIComponent(escape(atob(input)))
}

// ---------- Password Hashing (PBKDF2-SHA256) ----------
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  return { hash: bufToHex(bits), salt: bufToHex(salt.buffer) }
}

export async function verifyPassword(password: string, hash: string, saltHex: string): Promise<boolean> {
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  return bufToHex(bits) === hash
}

// ---------- JWT (HS256) ----------
async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return base64url(new Uint8Array(sig))
}

export async function signJWT(payload: Record<string, any>, secret: string, expiresInSec = 3600): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const body = { ...payload, iat: now, exp: now + expiresInSec }
  const headerB64 = base64url(JSON.stringify(header))
  const bodyB64 = base64url(JSON.stringify(body))
  const sig = await hmacSign(`${headerB64}.${bodyB64}`, secret)
  return `${headerB64}.${bodyB64}.${sig}`
}

export async function verifyJWT(token: string, secret: string): Promise<Record<string, any> | null> {
  try {
    const [headerB64, bodyB64, sig] = token.split('.')
    if (!headerB64 || !bodyB64 || !sig) return null
    const expected = await hmacSign(`${headerB64}.${bodyB64}`, secret)
    if (expected !== sig) return null
    const payload = JSON.parse(base64urlDecode(bodyB64))
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

// ---------- Random tokens ----------
export function randomToken(bytes = 32): string {
  return bufToHex(crypto.getRandomValues(new Uint8Array(bytes)).buffer)
}

export function randomOTP(digits = 6): string {
  const max = Math.pow(10, digits)
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % max
  return n.toString().padStart(digits, '0')
}

export function uuid(): string {
  return crypto.randomUUID()
}
