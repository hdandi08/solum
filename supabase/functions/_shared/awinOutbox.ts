export const MAX_ATTEMPTS = 8;

export type AwinOutboxState =
  | "pending"
  | "processing"
  | "sent"
  | "retry"
  | "dead_letter"
  | "suppressed";

export type RetryDecisionInput = {
  status?: number | null;
  attempt: number;
  jitterMs?: number;
};

export type RetryDecision =
  | { state: "retry"; nextAttemptMs: number }
  | { state: "dead_letter" };

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const MAX_AWC_LENGTH = 500;
const MAX_BACKOFF_MS = 900_000;
const BASE_BACKOFF_MS = 15_000;
const MAX_JITTER_MS = 15_000;

function requireAwc(awc: string): string {
  if (
    typeof awc !== "string" ||
    awc.length < 1 ||
    awc.length > MAX_AWC_LENGTH ||
    !/^[A-Za-z0-9._~-]+$/.test(awc)
  ) {
    throw new TypeError("awc must be a valid non-empty checksum");
  }
  return awc;
}

function requireSecret(secret: string): string {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new TypeError("secret must contain at least 32 characters");
  }
  return secret;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(
    /=+$/,
    "",
  );
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) {
    throw new TypeError("encrypted AWC envelope is malformed");
  }

  try {
    const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
      value.length + ((4 - value.length % 4) % 4),
      "=",
    );
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    throw new TypeError("encrypted AWC envelope is malformed");
  }
}

async function importEncryptionKey(
  secret: string,
  usage: KeyUsage,
): Promise<CryptoKey> {
  const keyBytes = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(requireSecret(secret)),
  );
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, [usage]);
}

export async function encryptAwc(awc: string, secret: string): Promise<string> {
  const plaintext = requireAwc(awc);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await importEncryptionKey(secret, "encrypt");
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(plaintext),
    ),
  );

  return `v1.${base64UrlEncode(iv)}.${base64UrlEncode(ciphertext)}`;
}

export async function decryptAwc(
  ciphertext: string,
  secret: string,
): Promise<string> {
  if (typeof ciphertext !== "string") {
    throw new TypeError("encrypted AWC envelope is malformed");
  }

  const parts = ciphertext.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") {
    throw new TypeError("encrypted AWC envelope is malformed");
  }

  const iv = base64UrlDecode(parts[1]);
  const encryptedBytes = base64UrlDecode(parts[2]);
  if (iv.length !== IV_BYTES || encryptedBytes.length <= AUTH_TAG_BYTES) {
    throw new TypeError("encrypted AWC envelope is malformed");
  }

  const key = await importEncryptionKey(secret, "decrypt");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedBytes,
  );
  return requireAwc(decoder.decode(plaintext));
}

export async function hashAwc(awc: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(requireAwc(awc))),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function randomJitterMs(): number {
  return crypto.getRandomValues(new Uint16Array(1))[0] % MAX_JITTER_MS;
}

export function retryDecision(input: RetryDecisionInput): RetryDecision {
  if (
    !Number.isSafeInteger(input.attempt) || input.attempt < 1 ||
    input.attempt > MAX_ATTEMPTS
  ) {
    throw new TypeError(
      `attempt must be an integer between 1 and ${MAX_ATTEMPTS}`,
    );
  }
  if (
    input.status !== undefined &&
    input.status !== null &&
    (!Number.isSafeInteger(input.status) || input.status < 100 ||
      input.status > 599)
  ) {
    throw new TypeError("status must be an HTTP status between 100 and 599");
  }

  const jitterMs = input.jitterMs ?? randomJitterMs();
  if (
    !Number.isSafeInteger(jitterMs) || jitterMs < 0 || jitterMs >= MAX_JITTER_MS
  ) {
    throw new TypeError(
      `jitterMs must be an integer between 0 and ${MAX_JITTER_MS - 1}`,
    );
  }

  const transient = input.status === undefined || input.status === null ||
    input.status === 408 || input.status === 425 || input.status === 429 ||
    input.status >= 500;

  if (!transient || input.attempt >= MAX_ATTEMPTS) {
    return { state: "dead_letter" };
  }

  return {
    state: "retry",
    nextAttemptMs: Math.min(
      MAX_BACKOFF_MS,
      BASE_BACKOFF_MS * 2 ** (input.attempt - 1),
    ) + jitterMs,
  };
}
