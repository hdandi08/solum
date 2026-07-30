export const AWIN_CHANNELS = ['aw', 'display', 'ppc', 'email'] as const;

type AwinChannel = typeof AWIN_CHANNELS[number];

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
