/**
 * Security & Data Protection Utility (LGPD & Anti-Invasion Layer)
 * Instituição de Ensino Oswaldo Cruz
 */

/**
 * Sanitizes input text to prevent XSS (Cross-Site Scripting) attacks.
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Recursively sanitizes object properties against script injection.
 */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeInput(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized as T;
  }
  return obj;
}

/**
 * Masks CPF according to LGPD compliance guidelines.
 * Input: 123.456.789-00 -> Output: 123.***.***-00
 */
export function maskCpf(cpf?: string): string {
  if (!cpf) return '***.***.***-**';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return '***.***.***-**';
  return `${clean.slice(0, 3)}.***.***-${clean.slice(9)}`;
}

/**
 * Masks RG according to LGPD compliance guidelines.
 * Input: 12.345.678-x -> Output: 12.***.***-X
 */
export function maskRg(rg?: string): string {
  if (!rg) return '**.***.***-*';
  const clean = rg.trim();
  if (clean.length < 5) return '**.***.***-*';
  return `${clean.slice(0, 2)}.***.***-${clean.slice(-1)}`;
}

/**
 * Masks Email address.
 * Input: user.name@domain.com -> Output: u***e@domain.com
 */
export function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return '***@***.com';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0] || '*'}*@${domain}`;
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

/**
 * Masks Phone Number.
 * Input: (11) 98765-4321 -> Output: (11) 9****-4321
 */
export function maskPhone(phone?: string): string {
  if (!phone) return '(**) *****-****';
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 10) return '(**) *****-****';
  const ddd = clean.slice(0, 2);
  const last4 = clean.slice(-4);
  return `(${ddd}) 9****-${last4}`;
}

/**
 * Key used for lightweight client-side encryption of sensitive fields (CPF, RG, Financial values)
 */
const SECRET_SALT = 'OC_ACADEMIC_LGPD_SEC_2026_ENC';

/**
 * Encrypts sensitive string payload before saving into localStorage.
 */
export function encryptSensitiveField(text: string): string {
  if (!text) return '';
  try {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length);
      result += String.fromCharCode(charCode);
    }
    return 'ENC:' + btoa(unescape(encodeURIComponent(result)));
  } catch (e) {
    return text;
  }
}

/**
 * Decrypts sensitive string payload from localStorage.
 */
export function decryptSensitiveField(encrypted: string): string {
  if (!encrypted || !encrypted.startsWith('ENC:')) return encrypted;
  try {
    const raw = decodeURIComponent(escape(atob(encrypted.slice(4))));
    let result = '';
    for (let i = 0; i < raw.length; i++) {
      const charCode = raw.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    return encrypted;
  }
}

/**
 * Computes a robust checksum hash for data backups and security integrity checking.
 */
export async function computeIntegrityChecksum(payload: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(payload + SECRET_SALT);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    // Fallback if SubtleCrypto is unavailable
  }
  
  // Fallback FNV-1a 32-bit hash
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Anti-Brute Force Protection Tracker for Logins
 */
interface LoginAttemptRecord {
  attempts: number;
  lockoutUntil: number | null;
}

const loginAttemptsMap: Record<string, LoginAttemptRecord> = {};

export function checkLoginRateLimit(username: string): { allowed: boolean; waitSeconds?: number } {
  const record = loginAttemptsMap[username.toLowerCase()];
  if (!record) return { allowed: true };

  const now = Date.now();
  if (record.lockoutUntil && record.lockoutUntil > now) {
    const remainingSec = Math.ceil((record.lockoutUntil - now) / 1000);
    return { allowed: false, waitSeconds: remainingSec };
  }

  // Lockout expired, reset attempts
  if (record.lockoutUntil && record.lockoutUntil <= now) {
    record.attempts = 0;
    record.lockoutUntil = null;
  }

  return { allowed: true };
}

export function registerFailedLoginAttempt(username: string): { locked: boolean; attemptsLeft: number; waitSeconds?: number } {
  const key = username.toLowerCase();
  if (!loginAttemptsMap[key]) {
    loginAttemptsMap[key] = { attempts: 0, lockoutUntil: null };
  }

  const record = loginAttemptsMap[key];
  record.attempts += 1;

  const maxAttempts = 5;
  if (record.attempts >= maxAttempts) {
    const lockoutTimeMs = 5 * 60 * 1000; // 5 minutes lockout
    record.lockoutUntil = Date.now() + lockoutTimeMs;
    return { locked: true, attemptsLeft: 0, waitSeconds: 300 };
  }

  return { locked: false, attemptsLeft: maxAttempts - record.attempts };
}

export function resetLoginAttempts(username: string): void {
  delete loginAttemptsMap[username.toLowerCase()];
}
