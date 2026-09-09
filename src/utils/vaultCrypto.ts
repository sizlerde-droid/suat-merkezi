// AES-256-GCM + PBKDF2 Web Crypto Vault Helper
// Ensures NO plain text is ever stored in localStorage or sent across network.

export interface EncryptedVaultPayload {
  v: number;
  salt: number[];
  iv: number[];
  data: number[];
  hint?: string;
  createdAt: string;
}

// Derive a 256-bit AES-GCM key from user's Master Password using PBKDF2 (100,000 rounds)
async function deriveKey(masterPassword: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt data with Master Password into encrypted payload string
export async function encryptVaultData(
  data: unknown,
  masterPassword: string,
  hint?: string
): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(masterPassword, salt);

  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(data));

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    plaintext
  );

  const payload: EncryptedVaultPayload = {
    v: 1,
    salt: Array.from(salt),
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(ciphertext)),
    hint: hint || '',
    createdAt: new Date().toISOString(),
  };

  return JSON.stringify(payload);
}

// Decrypt payload string with Master Password back to original object
export async function decryptVaultData<T>(
  encryptedString: string,
  masterPassword: string
): Promise<T> {
  try {
    const payload: EncryptedVaultPayload = JSON.parse(encryptedString);
    if (!payload.salt || !payload.iv || !payload.data) {
      throw new Error('Geçersiz şifreli kasa formatı.');
    }

    const salt = new Uint8Array(payload.salt);
    const iv = new Uint8Array(payload.iv);
    const data = new Uint8Array(payload.data);

    const key = await deriveKey(masterPassword, salt);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decrypted)) as T;
  } catch (err: unknown) {
    throw new Error('Hatalı Ana Parola! Lütfen parolanızı kontrol edip tekrar deneyiniz.');
  }
}

// Password Generator Options
export function generateRandomPassword(length = 12, includeSymbols = true): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*()_+~';

  let pool = letters + numbers;
  if (includeSymbols) pool += symbols;

  let result = '';
  const randomBytes = window.crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    result += pool[randomBytes[i] % pool.length];
  }
  return result;
}

// Senior-friendly memorable Turkish passphrase generator (e.g. "Karanfil-Mavi-1954!")
export function generateMemorablePassphrase(): string {
  const adjectives = [
    'Mavi', 'Yesil', 'Huzurlu', 'Sicak', 'Guzel', 'Sari', 'Beyaz', 'Tatli',
    'Nostaljik', 'Mutlu', 'Sevgi', 'Canim', 'Gunesli', 'Ruzgarli'
  ];
  const nouns = [
    'Karanfil', 'Lale', 'Bahce', 'Deniz', 'Kahve', 'Cinar', 'Mugla', 'Koy',
    'Torun', 'Ev', 'Kapi', 'Zeytin', 'Papatya', 'Cicek', 'Sarkilar'
  ];
  const symbols = ['!', '*', '#', '$', '+'];

  const randAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randYear = Math.floor(Math.random() * 50) + 1950;
  const randSym = symbols[Math.floor(Math.random() * symbols.length)];

  return `${randAdj}-${randNoun}-${randYear}${randSym}`;
}
