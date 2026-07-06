// Dark-theme outreach templates for the creator sequence. Copy rules: no em/en
// dashes; · or commas only. Unsubscribe link required. Logo via hosted PNG.
const LOGO = 'https://bysolum.co.uk/email/solum-logo.png'
const UNSUB_BASE = 'https://gvfptmjluxpngfjendbi.supabase.co/functions/v1/creator-unsubscribe'
const APPLY_URL = 'https://bysolum.co.uk/?utm_source=email&utm_medium=email&utm_campaign=creator_outreach'

type Key = 'intro' | 'follow_up' | 'final'

const COPY: Record<Key, { subject: string; heading: string; body: string[] }> = {
  intro: {
    subject: 'SOLUM · creator collab',
    heading: 'We think you would be a great fit for SOLUM.',
    body: [
      'SOLUM is a men's body care ritual, head to toe, built for guys who want to be done right. Your content is exactly the tone we are building around, premium, real, no fluff.',
      'We are bringing on a small group of creators for paid UGC, affiliate, and partnership collabs. Reply to this email if you want in and we will send the details.',
    ],
  },
  follow_up: {
    subject: 'SOLUM · quick follow up',
    heading: 'Still keen to work with you.',
    body: [
      'Circling back on the SOLUM creator collab. We shoot dark, premium, cinematic, and your style matches it. Kits are going out to our first creators now.',
      'If it is a fit, just reply and we will sort the details, gifting, UGC rates, or affiliate, whatever suits you.',
    ],
  },
  final: {
    subject: 'SOLUM · last note',
    heading: 'Last one from us.',
    body: [
      'We will leave it here so we are not filling your inbox. The SOLUM creator collab is open if you want it, paid UGC, affiliate, or partnership.',
      'If now is not the time, no worries at all. Reply any time and we will pick it back up.',
    ],
  },
}

export function buildCreatorEmail(key: Key, creator: { name?: string | null; unsubscribe_token: string }) {
  const c = COPY[key]
  const greeting = creator.name ? `${creator.name},` : 'Hey,'
  const unsub = `${UNSUB_BASE}?token=${creator.unsubscribe_token}`
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${c.subject}</title><style>body,#bg{background-color:#08090B !important;}</style></head>
<body bgcolor="#08090B" style="margin:0;padding:0;background-color:#08090B;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table id="bg" width="100%" cellpadding="0" cellspacing="0" bgcolor="#08090B" style="background-color:#08090B;border-collapse:collapse;">
<tr><td align="center" style="padding:0;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-collapse:collapse;background-color:#08090B;">
  <tr><td style="padding:28px 36px 22px;">
    <img src="${LOGO}" alt="SOLUM" width="118" style="display:block;border:0;height:auto;" />
    <p style="margin:9px 0 0;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:600;">Creator collabs</p>
  </td></tr>
  <tr><td style="padding:6px 36px 8px;">
    <p style="margin:0 0 18px;font-size:22px;font-weight:700;color:#F0ECE2;line-height:1.3;">${greeting} ${c.heading}</p>
    ${c.body.map(p => `<p style="margin:0 0 16px;font-size:15px;color:rgba(240,236,226,0.75);line-height:1.75;">${p}</p>`).join('')}
    <table cellpadding="0" cellspacing="0" style="margin:14px 0 6px;"><tr><td bgcolor="#F0ECE2" style="background:#F0ECE2;">
      <a href="${APPLY_URL}" style="display:inline-block;background:#F0ECE2;color:#08090B;font-size:13px;letter-spacing:4px;text-transform:uppercase;font-weight:700;padding:16px 40px;text-decoration:none;">See SOLUM &rarr;</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:22px 36px 30px;">
    <p style="margin:0;font-size:14px;color:rgba(240,236,226,0.6);line-height:1.6;">Harsha<br/><span style="font-size:12px;color:rgba(240,236,226,0.3);">Founder, SOLUM</span></p>
  </td></tr>
  <tr><td bgcolor="#0c0e12" style="background:#0c0e12;border-top:1px solid #181c24;padding:18px 36px 22px;">
    <p style="margin:0 0 6px;font-size:11px;color:rgba(240,236,226,0.25);line-height:1.6;">You received this because we thought you would be a fit for SOLUM. Not interested? <a href="${unsub}" style="color:#4A8FC7;text-decoration:none;">Unsubscribe</a>.</p>
    <p style="margin:0;font-size:10px;color:rgba(240,236,226,0.15);letter-spacing:1px;">SOLUM · bysolum.co.uk</p>
  </td></tr>
</table></td></tr></table></body></html>`
  return { subject: c.subject, html }
}
