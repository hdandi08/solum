# Creator Program Phase 2 — Public /creators Application Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A premium public `bysolum.co.uk/creators` landing page that pitches the SOLUM creator partnership and captures applications into the existing `creators` CRM, plus a confirmation email and a redirected outreach CTA.

**Architecture:** A new public React page (`CreatorsApplyPage.jsx`) with a pure validation helper (vitest-tested) posts to a new `submit-creator-application` edge function. The function reconciles by email against the existing `creators` table (update if the person was already cold-contacted, else insert as inbound `applied`), then sends a confirmation email via the `creators.bysolum.com` sender. The Phase 1 outreach templates get a new confirmation template and a CTA that now points at `/creators`. NO DB migration (form fields map onto existing columns).

**Tech Stack:** React (Vite), Vitest (node env) for the pure validation helper, Supabase edge function (Deno), Resend.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-06-creator-program-phase2-public-form.md`.
- Work on `dev`. Commit per task. Deploys/verification reserved for the CONTROLLER + user approval — subagents write + test + commit only; do NOT run `supabase functions deploy` or hit live projects.
- No DB migration — the `creators` table already has every column (`name, email, instagram_handle, tiktok_handle, follower_count, niches, portfolio_url, deal_types, notes, stage, source, sequence_status, sequence_step, next_email_at`).
- Copy rules: NO em/en/double dashes — `·` or commas only. Min font sizes 13px body / 11px labels. Palette: SOLUM Black `#08090B`, Charcoal `#181C24`, Deep Blue `#1A4A78`, Steel Blue `#2E6DA4`, Sky `#4A8FC7`, Bone `#F0ECE2`. Barlow Condensed / Bebas via existing site CSS. Logo via the embedded SVG wordmark component, never retyped.
- **Do NOT disclose payment amounts** anywhere in page or email copy. Use "paid collaborations" / "get rewarded".
- Confirmation + outreach emails send from `SOLUM Creators <hello@creators.bysolum.com>`, reply-to `contact@bysolum.com`. Never the `orders.bysolum.co.uk` sender.
- Inbound applicants are saved as `source='inbound'`, `stage='applied'`, `sequence_status='stopped'` (NOT auto-cold-emailed).
- Curly apostrophes (`’`, U+2019) inside single-quoted JS/TS strings (a straight `'` breaks the string).

---

### Task 1: Pure application-validation helper + tests

**Files:**
- Create: `web/src/lib/creatorApplication.js`
- Test: `web/src/lib/creatorApplication.test.js`

**Interfaces:**
- Produces: `validateApplication(form: object): { valid: boolean, errors: Record<string,string> }` and `NICHE_OPTIONS: string[]`, `DEAL_OPTIONS: string[]`.

- [ ] **Step 1: Write the failing test**

Create `web/src/lib/creatorApplication.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { validateApplication, NICHE_OPTIONS, DEAL_OPTIONS } from './creatorApplication.js';

const ok = { name: 'Sam', email: 'sam@example.com', instagram_handle: '@sam',
  portfolio_url: 'https://insta.com/reel/1', follower_count: '12000', niche: 'grooming' };

describe('validateApplication', () => {
  it('passes a complete valid form', () => {
    const r = validateApplication(ok);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual({});
  });
  it('requires name, email, instagram, portfolio, followers, niche', () => {
    const r = validateApplication({});
    expect(r.valid).toBe(false);
    for (const f of ['name','email','instagram_handle','portfolio_url','follower_count','niche'])
      expect(r.errors[f]).toBeTruthy();
  });
  it('rejects a malformed email', () => {
    expect(validateApplication({ ...ok, email: 'nope' }).errors.email).toBeTruthy();
  });
  it('rejects a non-numeric follower count', () => {
    expect(validateApplication({ ...ok, follower_count: 'lots' }).errors.follower_count).toBeTruthy();
  });
  it('accepts couples as a niche', () => {
    expect(NICHE_OPTIONS).toContain('couples');
    expect(validateApplication({ ...ok, niche: 'couples' }).valid).toBe(true);
  });
  it('exposes deal options', () => {
    expect(DEAL_OPTIONS).toEqual(['ugc', 'affiliate', 'partnership']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npm run test:unit -- creatorApplication`
Expected: FAIL — cannot resolve `./creatorApplication.js`.

- [ ] **Step 3: Write the implementation**

Create `web/src/lib/creatorApplication.js`:
```js
// Pure validation for the public /creators application form.
export const NICHE_OPTIONS = ['grooming', 'fitness', 'lifestyle', 'couples', 'everyday'];
export const DEAL_OPTIONS = ['ugc', 'affiliate', 'partnership'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateApplication(form) {
  const f = form || {};
  const errors = {};
  if (!f.name || !String(f.name).trim()) errors.name = 'Your name is required.';
  if (!f.email || !EMAIL_RE.test(String(f.email).trim())) errors.email = 'A valid email is required.';
  if (!f.instagram_handle || !String(f.instagram_handle).trim()) errors.instagram_handle = 'Your Instagram handle is required.';
  if (!f.portfolio_url || !String(f.portfolio_url).trim()) errors.portfolio_url = 'A link to your content is required.';
  const fc = String(f.follower_count ?? '').replace(/[,\s]/g, '');
  if (!fc || !/^\d+$/.test(fc)) errors.follower_count = 'Enter your follower count as a number.';
  if (!f.niche || !NICHE_OPTIONS.includes(f.niche)) errors.niche = 'Pick your niche.';
  return { valid: Object.keys(errors).length === 0, errors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npm run test:unit -- creatorApplication`
Expected: PASS — 6/6.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/creatorApplication.js web/src/lib/creatorApplication.test.js
git commit -m "feat(creators): public application form validation helper + tests"
```

---

### Task 2: Confirmation template + outreach CTA redirect in creatorEmails.ts

**Files:**
- Modify: `supabase/functions/_shared/creatorEmails.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `buildCreatorEmail` now accepts key `'application_received'` in addition to `'intro'|'follow_up'|'final'`. The three outreach templates' CTA points at `/creators`.

- [ ] **Step 1: Add the application_received copy + change the outreach CTA constant + rewrite outreach body copy**

In `supabase/functions/_shared/creatorEmails.ts`:

1. Change the `APPLY_URL` constant to the creators page:
```ts
const APPLY_URL = 'https://bysolum.co.uk/creators?utm_source=email&utm_medium=email&utm_campaign=creator_outreach'
```

2. Widen the `Key` type and add the new entry to `COPY`:
```ts
type Key = 'intro' | 'follow_up' | 'final' | 'application_received'
```
Add to the `COPY` object (use curly apostrophes; no dashes):
```ts
  application_received: {
    subject: 'SOLUM · application received',
    heading: 'Thanks, we’ve got your application.',
    body: [
      'Thanks for applying to create with SOLUM. We review every application by hand and look closely at your content, so give us a few days.',
      'If it is a fit, we will be in touch with the next steps, the kit, and how the collab works. Either way, we appreciate you putting yourself forward.',
    ],
  },
```

3. Rewrite the three outreach templates' body copy to lead with the guided-system USP (replace the existing `intro`/`follow_up`/`final` `heading`+`body`). Use exactly:
```ts
  intro: {
    subject: 'SOLUM · creator collab',
    heading: 'We think you would be a great fit for SOLUM.',
    body: [
      'SOLUM is a guided body care system for men, head to toe. Most guys own a random bottle or two and still neglect their back, their skin, their scalp. SOLUM is the guided routine that tells you what to use, where, and when. That is the whole point.',
      'Your content is the tone we are building around, premium, real, no fluff. We run paid collaborations, affiliate, and partnerships with a small group of creators. If you are interested, apply below and we will take it from there.',
    ],
  },
  follow_up: {
    subject: 'SOLUM · quick follow up',
    heading: 'Still keen to work with you.',
    body: [
      'Circling back on the SOLUM creator collab. SOLUM is a guided body care system for men, head to toe, and we shoot it dark, premium, cinematic, which matches your style.',
      'If it is a fit, apply below and we will sort the details, the kit, and how the collab works.',
    ],
  },
  final: {
    subject: 'SOLUM · last note',
    heading: 'Last one from us.',
    body: [
      'We will leave it here so we are not filling your inbox. The SOLUM creator collab is open, a guided body care system for men, and your content is exactly the fit we want.',
      'If now is the time, apply below. If not, no worries at all, the door stays open.',
    ],
  },
```

4. Change the CTA button label in the shared template shell from `See SOLUM` to `Apply to create` (the anchor already uses `${APPLY_URL}`). Find `>See SOLUM &rarr;<` and replace the visible text with `Apply to create &rarr;`.

- [ ] **Step 2: Verify it parses + no forbidden dashes**

Run:
```bash
node --experimental-strip-types --input-type=module -e "import('./supabase/functions/_shared/creatorEmails.ts').then(m=>{const k=['intro','follow_up','final','application_received']; k.forEach(x=>{const r=m.buildCreatorEmail(x,{name:'Sam',unsubscribe_token:'t'}); if(!r.subject||!r.html.includes('Apply to create')) throw new Error('bad '+x)}); console.log('ok all 4 templates + CTA')}).catch(e=>{console.log('ERR',e.message);process.exit(1)})" 2>/dev/null
grep -nE "—|–|--" supabase/functions/_shared/creatorEmails.ts | grep -v "https" || echo "clean"
```
Expected: `ok all 4 templates + CTA` then `clean`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/creatorEmails.ts
git commit -m "feat(creators): application-received email + outreach CTA to /creators + guided-system copy"
```

---

### Task 3: `submit-creator-application` edge function

**Files:**
- Create: `supabase/functions/submit-creator-application/index.ts`

**Interfaces:**
- Consumes: `buildCreatorEmail` from `../_shared/creatorEmails.ts` (key `'application_received'`).
- Produces: `POST` endpoint. Body `{ name, email, instagram_handle, tiktok_handle?, portfolio_url, follower_count, niche, deal_types?, notes?, utm_source?, utm_medium?, utm_campaign? }`. Returns `{ ok: true }` or `{ ok:false, error }`.

- [ ] **Step 1: Write the implementation**

Create `supabase/functions/submit-creator-application/index.ts`:
```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCreatorEmail } from '../_shared/creatorEmails.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const FROM = 'SOLUM Creators <hello@creators.bysolum.com>'
const REPLY_TO = 'contact@bysolum.com'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
function clean(v: unknown): string | null {
  const s = (v ?? '').toString().trim()
  return s ? s : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const b = await req.json().catch(() => ({}))
    const email = (b.email ?? '').toString().trim().toLowerCase()
    const name = clean(b.name)
    const instagram = clean(b.instagram_handle)
    const portfolio = clean(b.portfolio_url)
    const followerRaw = (b.follower_count ?? '').toString().replace(/[,\s]/g, '')
    const niche = clean(b.niche)

    if (!name || !email || !EMAIL_RE.test(email) || !instagram || !portfolio || !/^\d+$/.test(followerRaw) || !niche) {
      return json({ ok: false, error: 'Please complete all required fields.' }, 400)
    }

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const fields = {
      name,
      instagram_handle: instagram,
      tiktok_handle: clean(b.tiktok_handle),
      portfolio_url: portfolio,
      follower_count: Number(followerRaw),
      niches: [niche],
      deal_types: Array.isArray(b.deal_types) ? b.deal_types : [],
      notes: clean(b.notes),
      stage: 'applied',
      source: 'inbound',
      sequence_status: 'stopped',
      updated_at: new Date().toISOString(),
    }

    // Reconcile by case-insensitive email (unique index is on lower(email)).
    const { data: existing } = await db.from('creators').select('id, unsubscribe_token').ilike('email', email).limit(1)
    let unsubToken: string | null = null
    if (existing && existing[0]) {
      const { error } = await db.from('creators').update(fields).eq('id', existing[0].id)
      if (error) throw error
      unsubToken = existing[0].unsubscribe_token
    } else {
      const { data: ins, error } = await db.from('creators')
        .insert({ email, sequence_step: 0, next_email_at: null, ...fields })
        .select('unsubscribe_token').single()
      if (error) throw error
      unsubToken = ins?.unsubscribe_token ?? null
    }

    // Confirmation email (do not fail the submit if this errors).
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey && unsubToken) {
      const { subject, html } = buildCreatorEmail('application_received', { name, unsubscribe_token: unsubToken })
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: FROM, reply_to: REPLY_TO, to: [email], subject, html }),
        })
        if (!res.ok) console.error('confirmation email failed', await res.text())
      } catch (e) { console.error('confirmation email error', e) }
    }

    return json({ ok: true })
  } catch (err) {
    console.error(err)
    return json({ ok: false, error: 'Something went wrong. Please try again.' }, 500)
  }
})
```

- [ ] **Step 2: Verify imports match the shared module (inspection; no deno CLI locally)**

Run: `grep -n "export function buildCreatorEmail" supabase/functions/_shared/creatorEmails.ts`
Confirm the call `buildCreatorEmail('application_received', { name, unsubscribe_token })` matches the exported signature, and that `application_received` is a valid `Key` (added in Task 2).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/submit-creator-application/index.ts
git commit -m "feat(creators): submit-creator-application intake (reconcile by email + confirmation)"
```

---

### Task 4: Public `/creators` page + route

**Files:**
- Create: `web/src/pages/CreatorsApplyPage.jsx`
- Modify: `web/src/App.jsx` (import + `/creators` route)

**Interfaces:**
- Consumes: `validateApplication`, `NICHE_OPTIONS`, `DEAL_OPTIONS` from `../lib/creatorApplication.js`; the `submit-creator-application` function from Task 3.

**Design note for the implementer:** This is a premium marketing page. After the mechanical build below compiles and works, invoke the **frontend-design skill** and refine the visual design (typography scale, spacing, hero imagery, section rhythm) to match the SOLUM brand — keep the section structure, form fields, submit logic, and copy constraints intact. Use existing shoot imagery already on the CDN (e.g. `https://bysolum.co.uk/email/hero-products.jpg` or a `/`-hosted asset) for the hero.

- [ ] **Step 1: Create the page**

Create `web/src/pages/CreatorsApplyPage.jsx`:
```jsx
import { useState } from 'react';
import { validateApplication, NICHE_OPTIONS, DEAL_OPTIONS } from '../lib/creatorApplication.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const EMPTY = { name: '', email: '', instagram_handle: '', tiktok_handle: '',
  portfolio_url: '', follower_count: '', niche: '', deal_types: [], notes: '' };

const CSS = `
.cr-page{background:#08090B;color:#F0ECE2;font-family:'Barlow Condensed',sans-serif;min-height:100vh;}
.cr-wrap{max-width:760px;margin:0 auto;padding:0 20px;}
.cr-hero{padding:88px 0 40px;text-align:center;}
.cr-eyebrow{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:600;}
.cr-h1{font-family:'Bebas Neue',sans-serif;letter-spacing:0.04em;font-size:56px;line-height:0.98;margin:14px 0 16px;text-transform:uppercase;}
.cr-sub{font-size:17px;color:rgba(240,236,226,0.72);line-height:1.7;max-width:520px;margin:0 auto;}
.cr-offer{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:32px 0;}
.cr-card{background:#181C24;border:1px solid #1e2530;padding:22px;}
.cr-card h3{font-size:15px;font-weight:600;color:#F0ECE2;margin:0 0 6px;letter-spacing:1px;text-transform:uppercase;}
.cr-card p{font-size:13px;color:rgba(240,236,226,0.6);line-height:1.6;margin:0;}
.cr-sec{padding:26px 0;border-top:1px solid #1e2530;}
.cr-sec h2{font-family:'Bebas Neue',sans-serif;letter-spacing:0.04em;font-size:30px;margin:0 0 14px;text-transform:uppercase;}
.cr-sec p,.cr-step{font-size:15px;color:rgba(240,236,226,0.72);line-height:1.7;}
.cr-step{margin:0 0 8px;}
.cr-form{padding:26px 0 90px;border-top:1px solid #1e2530;}
.cr-field{margin:0 0 14px;}
.cr-field label{display:block;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(240,236,226,0.55);margin:0 0 5px;}
.cr-field input,.cr-field select,.cr-field textarea{width:100%;box-sizing:border-box;background:#0c0e12;border:1px solid #1e2530;color:#F0ECE2;font-size:15px;padding:12px 14px;font-family:inherit;}
.cr-field .err{color:#e05c5c;font-size:12px;margin-top:4px;}
.cr-deals{display:flex;gap:16px;flex-wrap:wrap;font-size:14px;}
.cr-submit{width:100%;background:#F0ECE2;color:#08090B;border:none;font-size:14px;letter-spacing:3px;text-transform:uppercase;font-weight:700;padding:18px;cursor:pointer;font-family:inherit;}
.cr-submit:disabled{opacity:0.5;cursor:default;}
.cr-thanks{text-align:center;padding:120px 0;}
.cr-thanks h2{font-family:'Bebas Neue',sans-serif;font-size:40px;letter-spacing:0.04em;text-transform:uppercase;margin:0 0 12px;}
@media(max-width:600px){.cr-offer{grid-template-columns:1fr;}.cr-h1{font-size:40px;}}
`;

export default function CreatorsApplyPage() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleDeal = (d) => setForm(f => ({ ...f, deal_types: f.deal_types.includes(d) ? f.deal_types.filter(x => x !== d) : [...f.deal_types, d] }));

  async function submit(e) {
    e.preventDefault();
    const { valid, errors } = validateApplication(form);
    setErrors(errors);
    if (!valid) return;
    setSubmitting(true); setServerError('');
    try {
      const params = new URLSearchParams(window.location.search);
      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-creator-application`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
        body: JSON.stringify({
          ...form,
          email: form.email.trim().toLowerCase(),
          utm_source: params.get('utm_source'), utm_medium: params.get('utm_medium'), utm_campaign: params.get('utm_campaign'),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) { setServerError(data.error || 'Something went wrong. Please try again.'); return; }
      try { window.posthog?.capture?.('creator_application_submitted', { niche: form.niche }); } catch { /* ignore */ }
      setDone(true);
      window.scrollTo(0, 0);
    } catch { setServerError('Something went wrong. Please try again.'); }
    finally { setSubmitting(false); }
  }

  if (done) return (
    <div className="cr-page"><style>{CSS}</style><div className="cr-wrap cr-thanks">
      <p className="cr-eyebrow">Application received</p>
      <h2>Thanks. We will review your content.</h2>
      <p className="cr-sub">We look at every application by hand. If it is a fit, we will be in touch with the next steps. Check your inbox for a confirmation.</p>
    </div></div>
  );

  return (
    <div className="cr-page"><style>{CSS}</style><div className="cr-wrap">
      <section className="cr-hero">
        <p className="cr-eyebrow">Create with SOLUM</p>
        <h1 className="cr-h1">Get paid to<br/>create with SOLUM.</h1>
        <p className="cr-sub">SOLUM is a guided body care system for men, head to toe. We work with premium creators and couples on paid collaborations, a free kit, and ongoing affiliate. If your content is dark, premium, and real, we want to hear from you.</p>
      </section>

      <section className="cr-offer">
        <div className="cr-card"><h3>Get paid</h3><p>Paid collaborations for the right creators. We sort the details once we have seen your work.</p></div>
        <div className="cr-card"><h3>Free premium kit</h3><p>The full guided SOLUM system, yours to keep and film with.</p></div>
        <div className="cr-card"><h3>Ongoing affiliate</h3><p>Your own code and commission on every sale you drive.</p></div>
      </section>

      <section className="cr-sec">
        <h2>Who we want</h2>
        <p>Premium male creators and couples who shoot dark, cinematic content. Grooming, fitness, lifestyle, or just real and well shot. The bar is quality, not follower count.</p>
      </section>

      <section className="cr-sec">
        <h2>How it works</h2>
        <p className="cr-step">1. Apply below with a link to your best content.</p>
        <p className="cr-step">2. We review your work by hand.</p>
        <p className="cr-step">3. If it is a fit, we send a kit and a brief.</p>
        <p className="cr-step">4. You create. You get paid.</p>
      </section>

      <form className="cr-form" onSubmit={submit} noValidate>
        <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", letterSpacing: '0.04em', fontSize: 30, margin: '0 0 18px', textTransform: 'uppercase' }}>Apply</h2>
        {[
          ['name', 'Name', 'text'], ['email', 'Email', 'email'],
          ['instagram_handle', 'Instagram handle', 'text'], ['portfolio_url', 'Link to your best content', 'url'],
          ['follower_count', 'Follower count', 'text'], ['tiktok_handle', 'TikTok handle (optional)', 'text'],
        ].map(([k, label, type]) => (
          <div className="cr-field" key={k}>
            <label>{label}</label>
            <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} />
            {errors[k] && <div className="err">{errors[k]}</div>}
          </div>
        ))}
        <div className="cr-field">
          <label>Niche</label>
          <select value={form.niche} onChange={e => set('niche', e.target.value)}>
            <option value="">Select</option>
            {NICHE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          {errors.niche && <div className="err">{errors.niche}</div>}
        </div>
        <div className="cr-field">
          <label>Interested in (optional)</label>
          <div className="cr-deals">
            {DEAL_OPTIONS.map(d => (
              <label key={d} style={{ letterSpacing: 0, textTransform: 'capitalize' }}>
                <input type="checkbox" checked={form.deal_types.includes(d)} onChange={() => toggleDeal(d)} /> {d}
              </label>
            ))}
          </div>
        </div>
        <div className="cr-field">
          <label>Anything else (optional)</label>
          <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
        {serverError && <div className="err" style={{ color: '#e05c5c', margin: '0 0 12px' }}>{serverError}</div>}
        <button className="cr-submit" type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Apply to create'}</button>
      </form>
    </div></div>
  );
}
```

- [ ] **Step 2: Add the route**

In `web/src/App.jsx`, add the import near the other page imports:
```jsx
import CreatorsApplyPage from './pages/CreatorsApplyPage';
```
Add the route inside `<Routes>` (next to `/athletes`):
```jsx
<Route path="/creators" element={<CreatorsApplyPage />} />
```

- [ ] **Step 3: Build + unit tests**

Run: `cd web && npm run build && npm run test:unit`
Expected: build succeeds; all unit tests pass (including Task 1's).

- [ ] **Step 4: Refine the design (frontend-design skill)**

Invoke the **frontend-design skill** and polish the page visually against the SOLUM brand (hero image, type scale, spacing, mobile). Keep the sections, fields, submit logic, copy rules, and no-dash/font-size constraints. Re-run `npm run build` after.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/CreatorsApplyPage.jsx web/src/App.jsx
git commit -m "feat(creators): public /creators application page + route"
```

---

## Self-review notes

- **Spec coverage:** page structure (T4), offer/who/how sections + form fields required (T1 validation + T4 form), submit reconcile-by-email + inbound applied + confirmation email (T3), application_received template + outreach CTA to /creators + guided-system copy (T2), tracking event (T4), no-migration (all tasks). No amounts disclosed (T2/T4 copy). All covered.
- **Deferred (not this plan):** customer/lead recruitment email blast; paid ad creative; Phase 1 unsubscribe broken-HTML bug (separate); admin CRM changes (applied rows already render in the Phase 1 Creators page).
- **Live ops** (deploy `submit-creator-application` to dev+prod, deploy web, e2e verify) = CONTROLLER + user approval, after the code is reviewed.
