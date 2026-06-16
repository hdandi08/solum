# Founder Chat Widget — Design Spec
**Date:** 2026-06-16  
**Status:** Approved for implementation  
**Scope:** Dev only initially — do not deploy to prod until manually approved

---

## Problem

Visitors spend 30s–2 minutes on the site but don't convert. The site has no real social proof (no reviews yet) and no mechanism for visitors to get answers to the specific questions blocking their purchase. Trust is low on a new brand with no track record.

## Solution

An AI-powered chat widget in the bottom-right corner of the site, branded as Harsha (founder), using Claude Haiku to answer product questions in real time. Feels personal, not like a generic support bot. Escape hatch to email Harsha directly for anything the AI can't handle.

---

## User Experience

### Trigger
- After **30 seconds** on any page (FullSite, BuyPage, AthletePage), a bubble appears above the launcher:
  > *"Got a question about the kit? I built SOLUM — ask me anything."*
- Bubble has a **Dismiss** link. Dismissal stored in `sessionStorage` — won't re-appear this session.
- Launcher button (Harsha's photo, 48px circle) always visible in bottom-right corner once triggered.

### Open state
- Clicking launcher or bubble opens the chat panel (300px wide, fixed bottom-right).
- **Header:** Harsha's photo (`/harsha.jpg`), name, "Founder · SOLUM", green online dot.
- **Opening message:** *"Hey — I built SOLUM from scratch. What do you want to know?"*
- **Suggested questions** (chips below messages):
  - "Worth £65?"
  - "How long does it take?"
  - "What's in the kit?"
  - "Email Harsha →"
- **"Email Harsha →"** chip opens `mailto:harsha@bysolum.com` with subject pre-filled: `"Question about SOLUM"`.
- Input box at bottom, send on Enter or arrow button.
- AI replies stream in (typewriter effect if streaming, else instant on completion).

### Closing
- X button in header closes the panel. Launcher button remains visible.

---

## Architecture

### Frontend
- **New component:** `web/src/components/FounderChat.jsx`
- Mounted in `web/src/pages/FullSite.jsx` and `web/src/pages/BuyPage.jsx`
- All styles inline (no new CSS file) to keep it self-contained
- State: `open`, `messages[]`, `loading`, `dismissed` — local React state only, no global store

### Backend
- **New Supabase edge function:** `supabase/functions/founder-chat/index.ts`
- Receives: `{ message: string, history: { role, content }[] }`
- Calls Claude Haiku (`claude-haiku-4-5-20251001`) via Anthropic API
- System prompt built from SOLUM product/brand context (see below)
- Returns: `{ reply: string }`
- Auth: Supabase anon key (same as all other functions)
- **Dev only:** deployed to `rodvvmfzkyjsqbufkjbc` only until prod is manually approved

### Secrets required
- `ANTHROPIC_API_KEY` — set on dev Supabase project

---

## System Prompt

The system prompt fed to Claude will include:
- Harsha persona: founder, built SOLUM from scratch, direct and honest tone
- Full product lineup (all 10 products, what each does, origins, ingredients)
- Both rituals (daily 10 min, weekly 22 min) step by step
- Kit contents and pricing (GROUND £65/£38mo, RITUAL £85/£48mo, SOVEREIGN coming soon)
- Delivery: Royal Mail Tracked 48, free, 2 days, UK only
- Key objection answers (price, effort, "is this for me", returns)
- Brand rules: never say "soap", no orange/yellow, always direct
- Fallback: if the question is genuinely outside product knowledge, suggest emailing harsha@bysolum.com

---

## What's NOT in scope
- Streaming responses (simple request/response is fine for v1)
- Conversation persistence across sessions
- Admin view of chat transcripts (v2)
- Rate limiting (v1 — add if abuse occurs)
- Prod deployment (manual sign-off required)

---

## Files to create/modify
1. `supabase/functions/founder-chat/index.ts` — new edge function
2. `web/src/components/FounderChat.jsx` — new component
3. `web/src/pages/FullSite.jsx` — mount `<FounderChat />`
4. `web/src/pages/BuyPage.jsx` — mount `<FounderChat />`
