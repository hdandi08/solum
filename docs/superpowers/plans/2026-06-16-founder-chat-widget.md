# Founder Chat Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-powered chat widget to the site (dev only) where visitors can ask Harsha (founder) questions about SOLUM — backed by Claude Haiku via a Supabase edge function.

**Architecture:** A React component (`FounderChat.jsx`) handles all UI state (bubble → open chat). It calls a Supabase edge function (`founder-chat`) which holds the Anthropic API key and calls Claude Haiku with full SOLUM product context. No external chat SDK — self-contained component with inline styles.

**Tech Stack:** React, Supabase Edge Functions (Deno), Anthropic API (claude-haiku-4-5-20251001), existing `supabase` client from `web/src/lib/supabase.js`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/20260616000001_founder_chat_logs.sql` | Create | DB migration — `founder_chat_logs` table |
| `supabase/functions/founder-chat/index.ts` | Create | Edge function — receives message + history, calls Claude Haiku, logs exchange, returns reply |
| `web/src/components/FounderChat.jsx` | Create | Chat widget UI — bubble, open panel, messages, input |
| `web/src/pages/FullSite.jsx` | Modify | Mount `<FounderChat />` |
| `web/src/pages/BuyPage.jsx` | Modify | Mount `<FounderChat />` |

---

## Task 1: Create the `founder-chat` edge function

**Files:**
- Create: `supabase/functions/founder-chat/index.ts`

- [ ] **Step 1: Create the function file**

```typescript
// supabase/functions/founder-chat/index.ts

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are Harsha, the founder of SOLUM. You built SOLUM from scratch and know every detail about it. You are direct, honest, and never use fluffy marketing language. You answer questions concisely — 2-4 sentences max unless the question genuinely requires more. You never say "soap". If you can't answer something (e.g. a specific customer's order), tell them to email harsha@bysolum.com.

## SOLUM — What It Is
SOLUM is the first complete body care ritual built specifically for men. Not just products thrown together — a proper system with a daily ritual and a weekly deep clean. Sourced from Korea, Morocco, Turkey, and the UK.

## Products
- 01 · Body Wash 250ml — Amino acid formula, sulphate-free, pH balanced, cedarwood/vetiver scent. Made in UK by Cosmiko. £20.
- 02 · Exfoliating Mitt — Italian towel style, Korean bathhouse tradition, 100% viscose rayon. Made in China. £10.
- 03 · Back Scrub Cloth 70cm — Handles at each end, dual texture, cleans the back properly. Made in China. £12.
- 04 · Scalp Massager — Black silicone, SOLUM debossed. Made in South Korea by COOLFIN A. £12.
- 05 · Rhassoul Clay Body Mask 200g — Atlas Mountain clay, draws out impurities. Made in Morocco. £26.
- 06 · Argan Body Oil 50ml — 100% pure certified organic Argania Spinosa Kernel Oil. Made in Morocco. £34.
- 07 · Body Lotion 400ml — Fast absorb, cedarwood/vetiver scent. Apply within 3 minutes of towelling — skin absorbs 70% more moisture while still warm. Made in UK. £22.
- 08 · Bamboo Cloth — Coming soon.
- 09 · Turkish Kese Mitt — Artisan hand-woven Turkish raw silk. Coming soon (SOVEREIGN only).
- 10 · Beidi Black Soap — Turkey. Coming soon (SOVEREIGN only).

## Kits & Pricing
- GROUND Kit — Products 01, 02, 03, 04, 07. First box £65. Monthly subscription (consumables only) £38/mo. Best for: men who want the daily ritual.
- RITUAL Kit — Products 01, 02, 03, 04, 05, 06, 07. First box £85. Monthly subscription £48/mo. Best for: men who want everything — daily + weekly deep clean. Most popular.
- SOVEREIGN Kit — All 10 products including 09 and 10. First box £130. Monthly subscription £58/mo. Coming soon.

## The Two Rituals
Daily Ritual (10 minutes, every morning):
1. Scalp Massager — small firm circles, 2-3 min
2. Body Wash — apply to wet skin, chest down
3. Exfoliating Mitt — long circular strokes, medium pressure
4. Back Scrub Cloth — drape over shoulder, saw back and forth 60 seconds
5. Body Lotion — within 3 minutes of towelling, two pumps, press in

Weekly Deep Ritual (22 minutes, replaces daily):
1. Scalp Massager — 5 minutes, more pressure
2. Rhassoul Clay Mask — apply head to toe, leave 8-10 minutes
3. Kese Mitt + Back Cloth — firm slow strokes simultaneously
4. Argan Oil — stay damp, 10-15 drops pressed in, no lotion needed today

## Delivery & Practical Info
- Free UK delivery, Royal Mail Tracked 48, arrives in 2 days
- First box includes tools (last 6-12 months). Monthly refill is consumables only (01, 05, 06, 07).
- No subscription lock-in — cancel any time
- Small first batch — 100 kits only

## Common Objections
- "Is it worth £65?" — Most men spend £65/month on protein powder without thinking. This is a one-time purchase that changes your daily skin health permanently. The tools last 6-12 months.
- "I don't have time" — 10 minutes. That's the daily ritual. Less time than most men spend scrolling in bed.
- "Is this just for gym guys?" — No. SOLUM is for any man who showers but has never had a proper system. That's most men.
- "What if I don't like it?" — Email harsha@bysolum.com. We'll sort it.
- "I already use body wash" — Most body wash has sulphates that strip your skin barrier. SOLUM's amino acid formula doesn't. The mitt and back cloth are the bigger change — most men have never properly cleaned their back or exfoliated.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!anthropicKey) return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }), { status: 500, headers: corsHeaders })

  const { message, history = [], session_id: sessionId, page_path: pagePath } = await req.json()
  if (!message) return new Response(JSON.stringify({ error: 'message required' }), { status: 400, headers: corsHeaders })

  const messages = [
    ...history.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages,
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('anthropic_error', JSON.stringify(data))
    return new Response(JSON.stringify({ error: 'AI error' }), { status: 500, headers: corsHeaders })
  }

  const reply = data.content?.[0]?.text ?? 'Something went wrong — email harsha@bysolum.com and I\'ll get back to you.'

  // Log the exchange for customer research — fire and forget
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  fetch(`${supabaseUrl}/rest/v1/founder_chat_logs`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_id:   sessionId,
      user_message: message,
      ai_reply:     reply,
      page_path:    pagePath ?? null,
    }),
  }).catch(err => console.error('log_error', err))

  return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
```

- [ ] **Step 2: Set ANTHROPIC_API_KEY secret on dev project**

```bash
supabase secrets set ANTHROPIC_API_KEY=<your-key> --project-ref rodvvmfzkyjsqbufkjbc
```

Get your Anthropic API key from console.anthropic.com → API Keys.

- [ ] **Step 3: Deploy to dev only**

```bash
supabase functions deploy founder-chat --project-ref rodvvmfzkyjsqbufkjbc
```

Expected output: `Deployed Functions on project rodvvmfzkyjsqbufkjbc: founder-chat`

- [ ] **Step 4: Smoke test the function**

```bash
curl -s -X POST "https://rodvvmfzkyjsqbufkjbc.supabase.co/functions/v1/founder-chat" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvZHZ2bWZ6a3lqc3FidWZramJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDIwNjIsImV4cCI6MjA4OTYxODA2Mn0.qUlxSHMUiPBJRB11PbMiDovLjb5aDNLjAo_dBpHBGN8" \
  -H "Content-Type: application/json" \
  -d '{"message":"What is in the GROUND kit?","session_id":"test-session-1","page_path":"/"}'
```

Expected: `{"reply":"The GROUND kit contains..."}`

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/founder-chat/index.ts
git commit -m "feat: add founder-chat edge function (dev only)"
```

---

---

## Task 1b: Create the `founder_chat_logs` migration

**Files:**
- Create: `supabase/migrations/20260616000001_founder_chat_logs.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260616000001_founder_chat_logs.sql
create table if not exists founder_chat_logs (
  id          uuid primary key default gen_random_uuid(),
  session_id  text not null,
  user_message text not null,
  ai_reply    text not null,
  page_path   text,
  created_at  timestamptz default now()
);

-- No RLS needed — writes are service-role only from the edge function
```

- [ ] **Step 2: Apply the migration to dev**

```bash
supabase db push --project-ref rodvvmfzkyjsqbufkjbc
```

Expected: `Applying migration 20260616000001_founder_chat_logs.sql...`

- [ ] **Step 3: Verify table exists in Supabase dashboard**

Open https://supabase.com/dashboard/project/rodvvmfzkyjsqbufkjbc/editor → Table Editor → `founder_chat_logs`. Columns: id, session_id, user_message, ai_reply, page_path, created_at.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260616000001_founder_chat_logs.sql
git commit -m "feat: add founder_chat_logs migration"
```

---

## Task 2: Build the `FounderChat` component

**Files:**
- Create: `web/src/components/FounderChat.jsx`

- [ ] **Step 1: Create the component**

```jsx
// web/src/components/FounderChat.jsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.js';

const DISMISS_KEY = 'founder_chat_dismissed';
const SUGGESTED = [
  { label: 'Worth £65?', text: 'Is the GROUND kit worth £65?' },
  { label: 'How long does it take?', text: 'How long does the daily ritual take?' },
  { label: "What's in the kit?", text: 'What products are in the RITUAL kit?' },
];

function genId() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2); }

const CSS = `
.fc-launcher{
  position:fixed;bottom:24px;right:24px;z-index:9000;
  display:flex;align-items:center;gap:10px;
}
.fc-launcher-label{
  background:#181C24;border:1px solid #1e2530;
  border-radius:20px;padding:8px 14px;
  font-size:11px;letter-spacing:1px;
  color:rgba(240,236,226,0.6);
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
  white-space:nowrap;
}
.fc-avatar{
  width:48px;height:48px;border-radius:50%;
  border:2px solid #2E6DA4;
  object-fit:cover;object-position:center top;
  cursor:pointer;
  box-shadow:0 4px 20px rgba(46,109,164,0.4);
  flex-shrink:0;
  transition:transform .2s;
}
.fc-avatar:hover{transform:scale(1.05);}

.fc-bubble{
  position:fixed;bottom:86px;right:24px;z-index:9000;
  max-width:240px;
  background:#181C24;border:1px solid #2E6DA4;
  border-radius:12px 12px 0 12px;
  padding:14px 16px;
  font-size:13px;color:#F0ECE2;line-height:1.5;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
  animation:fc-fade-in .3s ease;
  box-shadow:0 4px 20px rgba(0,0,0,0.4);
}
.fc-bubble-dismiss{
  display:block;margin-top:10px;
  font-size:11px;color:rgba(240,236,226,0.4);
  background:none;border:none;cursor:pointer;padding:0;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
  text-align:left;
}
.fc-bubble-dismiss:hover{color:rgba(240,236,226,0.7);}

.fc-panel{
  position:fixed;bottom:86px;right:24px;z-index:9000;
  width:320px;max-width:calc(100vw - 32px);
  background:#08090B;border:1px solid #1e2530;
  border-radius:16px;overflow:hidden;
  box-shadow:0 8px 40px rgba(0,0,0,0.7);
  display:flex;flex-direction:column;
  animation:fc-fade-in .2s ease;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
}
@keyframes fc-fade-in{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}

.fc-header{
  background:#181C24;border-bottom:1px solid #1e2530;
  padding:14px 16px;display:flex;align-items:center;gap:10px;
  flex-shrink:0;
}
.fc-header-avatar{
  width:36px;height:36px;border-radius:50%;
  border:2px solid #2E6DA4;object-fit:cover;object-position:center top;flex-shrink:0;
}
.fc-header-name{font-size:13px;font-weight:600;color:#F0ECE2;}
.fc-header-title{font-size:10px;color:#4A8FC7;letter-spacing:1px;margin-top:1px;}
.fc-online{width:8px;height:8px;border-radius:50%;background:#22c55e;margin-left:auto;flex-shrink:0;}
.fc-close{
  background:none;border:none;color:rgba(240,236,226,0.4);
  font-size:18px;cursor:pointer;padding:0 0 0 8px;line-height:1;
  transition:color .2s;
}
.fc-close:hover{color:#F0ECE2;}

.fc-messages{
  flex:1;overflow-y:auto;padding:14px;
  display:flex;flex-direction:column;gap:10px;
  max-height:280px;min-height:160px;
}
.fc-msg-ai{
  background:#181C24;border-radius:12px 12px 12px 2px;
  padding:10px 12px;max-width:90%;
  font-size:13px;color:#F0ECE2;line-height:1.55;
}
.fc-msg-user{
  background:#1A4A78;border-radius:12px 12px 2px 12px;
  padding:10px 12px;max-width:90%;align-self:flex-end;
  font-size:13px;color:#fff;line-height:1.55;
}
.fc-typing{display:flex;gap:4px;align-items:center;padding:4px 0;}
.fc-dot{width:6px;height:6px;border-radius:50%;background:#4A8FC7;animation:fc-bounce .9s infinite;}
.fc-dot:nth-child(2){animation-delay:.15s;}
.fc-dot:nth-child(3){animation-delay:.3s;}
@keyframes fc-bounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-5px);}}

.fc-chips{
  padding:0 14px 10px;display:flex;flex-wrap:wrap;gap:6px;flex-shrink:0;
}
.fc-chip{
  background:#181C24;border:1px solid #1e2530;border-radius:20px;
  padding:5px 10px;font-size:11px;color:rgba(240,236,226,0.65);
  cursor:pointer;transition:border-color .2s,color .2s;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
}
.fc-chip:hover{border-color:#2E6DA4;color:#F0ECE2;}
.fc-chip-email{color:#4A8FC7;border-color:#1A4A78;}
.fc-chip-email:hover{border-color:#4A8FC7;}

.fc-input-row{
  border-top:1px solid #1e2530;padding:10px 14px;
  display:flex;gap:8px;align-items:center;flex-shrink:0;
}
.fc-input{
  flex:1;background:none;border:none;outline:none;
  font-size:13px;color:#F0ECE2;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
}
.fc-input::placeholder{color:rgba(240,236,226,0.3);}
.fc-send{
  width:30px;height:30px;border-radius:50%;
  background:#2E6DA4;border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;transition:background .2s;
}
.fc-send:hover{background:#4A8FC7;}
.fc-send:disabled{background:#1e2530;cursor:not-allowed;}
`;

export default function FounderChat() {
  const [open, setOpen]         = useState(false);
  const [bubble, setBubble]     = useState(false);
  const [dismissed, setDismiss] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey — I built SOLUM from scratch. What do you want to know?" }
  ]);
  const [input, setInput]   = useState('');
  const [loading, setLoad]  = useState(false);
  const bottomRef           = useRef(null);
  const sessionId           = useRef(genId());

  // Show bubble after 30s if not dismissed this session
  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    const t = setTimeout(() => setBubble(true), 30000);
    return () => clearTimeout(t);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismiss(true);
    setBubble(false);
  }

  function openChat() {
    setBubble(false);
    setOpen(true);
    sessionStorage.setItem(DISMISS_KEY, '1');
  }

  async function send(text) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    const next = [...messages, { role: 'user', content: msg }];
    setMessages(next);
    setLoad(true);
    try {
      const { data, error } = await supabase.functions.invoke('founder-chat', {
        body: {
          message:    msg,
          history:    next.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
          session_id: sessionId.current,
          page_path:  window.location.pathname,
        },
      });
      if (error) throw error;
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Something went wrong — email harsha@bysolum.com and I'll get back to you." }]);
    } finally {
      setLoad(false);
    }
  }

  function emailHarsha() {
    window.location.href = 'mailto:harsha@bysolum.com?subject=Question%20about%20SOLUM';
  }

  if (dismissed && !open) return null;

  return (
    <>
      <style>{CSS}</style>

      {/* Bubble prompt */}
      {bubble && !open && (
        <div className="fc-bubble">
          Got a question about the kit? I built SOLUM — ask me anything.
          <button className="fc-bubble-dismiss" onClick={dismiss}>Dismiss</button>
        </div>
      )}

      {/* Open panel */}
      {open && (
        <div className="fc-panel">
          <div className="fc-header">
            <img src="/harsha.jpg" alt="Harsha" className="fc-header-avatar" />
            <div>
              <div className="fc-header-name">Harsha</div>
              <div className="fc-header-title">Founder · SOLUM</div>
            </div>
            <div className="fc-online" />
            <button className="fc-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="fc-messages">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'fc-msg-user' : 'fc-msg-ai'}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="fc-msg-ai">
                <div className="fc-typing">
                  <span className="fc-dot" /><span className="fc-dot" /><span className="fc-dot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="fc-chips">
            {SUGGESTED.map(s => (
              <button key={s.label} className="fc-chip" onClick={() => send(s.text)}>{s.label}</button>
            ))}
            <button className="fc-chip fc-chip-email" onClick={emailHarsha}>Email Harsha →</button>
          </div>

          <div className="fc-input-row">
            <input
              className="fc-input"
              placeholder="Ask anything..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              autoFocus
            />
            <button className="fc-send" onClick={() => send()} disabled={!input.trim() || loading}>
              <span style={{ color: '#fff', fontSize: 13 }}>↑</span>
            </button>
          </div>
        </div>
      )}

      {/* Launcher */}
      {!open && (
        <div className="fc-launcher">
          {!bubble && !dismissed && <span className="fc-launcher-label">Ask Harsha</span>}
          <img src="/harsha.jpg" alt="Ask Harsha" className="fc-avatar" onClick={openChat} />
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify the file was created**

```bash
ls web/src/components/FounderChat.jsx
```

Expected: file exists.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/FounderChat.jsx
git commit -m "feat: add FounderChat component"
```

---

## Task 3: Mount on FullSite and BuyPage

**Files:**
- Modify: `web/src/pages/FullSite.jsx`
- Modify: `web/src/pages/BuyPage.jsx`

- [ ] **Step 1: Add import + mount to FullSite.jsx**

Add the import near the top with the other component imports:
```jsx
import FounderChat from '../components/FounderChat.jsx';
```

Add the component just before the closing `</> ` or at the end of the JSX return, alongside `<FathersDayPopup />`:
```jsx
<FounderChat />
```

- [ ] **Step 2: Add import + mount to BuyPage.jsx**

Add import at top of file:
```jsx
import FounderChat from '../components/FounderChat.jsx';
```

Add at end of the BuyPage JSX return, just before the final closing tag:
```jsx
<FounderChat />
```

- [ ] **Step 3: Start dev server and verify widget appears**

```bash
cd web && npm run dev
```

Open http://localhost:5173 in browser. Within 30 seconds a bubble should appear bottom-right above Harsha's photo. Click it — chat panel should open. Send a message — should get a reply from Claude.

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/FullSite.jsx web/src/pages/BuyPage.jsx
git commit -m "feat: mount FounderChat on FullSite and BuyPage"
```

---

## Task 4: Push dev branch

- [ ] **Step 1: Push to dev**

```bash
git push origin dev
```

Do NOT push to master / merge to prod until manually approved by Harsha.

- [ ] **Step 2: Verify on Amplify dev URL**

Open the Amplify dev deployment URL and confirm:
- Launcher (Harsha photo) appears bottom-right
- Bubble appears after 30s
- Chat opens, AI replies, email button works
- Dismissing bubble hides it for the session
