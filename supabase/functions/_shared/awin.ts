export const AWIN_CHANNELS = ['aw', 'display', 'ppc', 'email'] as const;

export type AwinChannel = typeof AWIN_CHANNELS[number];

export type AwinCheckoutAttributionInput = {
  awc?: unknown;
  token?: unknown;
  channel?: unknown;
  secret: string;
  now?: () => number;
};

export type AwinS2sInput = {
  live: boolean;
  amountPence: number;
  orderRef: string;
  awc?: string;
  channel?: unknown;
};

export function normalizeOrderSource(value: unknown): 'first_batch' | 'gift' | 'tiktok_shop' {
  if (value === 'tiktok') return 'tiktok_shop';
  return value === 'gift' || value === 'tiktok_shop' || value === 'first_batch'
    ? value
    : 'first_batch';
}

export function normalizeAwinChannel(value: unknown): AwinChannel | undefined {
  return AWIN_CHANNELS.includes(value as AwinChannel) ? value as AwinChannel : undefined;
}

function normalizeAwc(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const awc = value.trim();
  return awc.length >= 1 && awc.length <= 500 && /^[A-Za-z0-9._~-]+$/.test(awc)
    ? awc
    : undefined;
}

function decodeBase64Url(value: string): Uint8Array | undefined {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) return undefined;
  try {
    const padded = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(
      value.length + ((4 - value.length % 4) % 4),
      '=',
    );
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return undefined;
  }
}

export async function resolveAwinCheckoutAttribution({
  awc,
  token,
  channel,
  secret,
  now = Date.now,
}: AwinCheckoutAttributionInput): Promise<{ awc?: string; channel?: AwinChannel }> {
  const directAwc = normalizeAwc(awc);
  const normalizedChannel = normalizeAwinChannel(channel);
  if (directAwc) {
    return {
      awc: directAwc,
      ...(normalizedChannel ? { channel: normalizedChannel } : {}),
    };
  }

  if (typeof token !== 'string' || typeof secret !== 'string' || secret.length === 0) return {};
  const packed = decodeBase64Url(token);
  if (!packed || packed.length <= 28) return {};

  try {
    const keyBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
    const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: packed.slice(0, 12) },
      key,
      packed.slice(12),
    );
    const payload = JSON.parse(new TextDecoder().decode(plaintext));
    const resolvedAwc = normalizeAwc(payload?.awc);
    const nowSeconds = Math.floor(now() / 1000);
    if (
      payload?.v !== 1 ||
      !resolvedAwc ||
      !Number.isInteger(payload.exp) ||
      payload.exp <= nowSeconds ||
      payload.exp > nowSeconds + 300
    ) return {};

    return {
      awc: resolvedAwc,
      ...(normalizedChannel ? { channel: normalizedChannel } : {}),
    };
  } catch {
    return {};
  }
}

export function buildAwinS2sUrl(input: AwinS2sInput): string | undefined {
  const channel = normalizeAwinChannel(input.channel);
  if (
    input.live !== true ||
    typeof input.awc !== 'string' || input.awc.trim() === '' ||
    !channel ||
    !Number.isFinite(input.amountPence) || input.amountPence <= 0 ||
    typeof input.orderRef !== 'string' || input.orderRef.trim() === ''
  ) {
    return undefined;
  }

  const amount = (input.amountPence / 100).toFixed(2);
  const url = new URL('https://www.awin1.com/sread.php');
  url.search = new URLSearchParams({
    tt: 'ss',
    tv: '2',
    merchant: '129171',
    amount,
    parts: `DEFAULT:${amount}`,
    cr: 'GBP',
    ref: input.orderRef,
    ch: channel,
    cks: input.awc,
  }).toString();
  return url.toString();
}
