# SOLUM — Pre-Launch Checklist

> Items that must be completed before bysolum.com goes live to the public.
> Update this file as items are completed.

---

## 🏢 Business & Legal

- [ ] **Add business address to Terms & Conditions** — appears in 4 places in `/terms` marked `[Business address — to be completed on registration]`
- [ ] **Add business address to Privacy Policy** — appears in 2 places in `/privacy` marked `[Business address — to be completed]`
- [ ] **Register SOLUM as LTD company** — currently sole trader. Update T&Cs and Privacy Policy once registered (company number, registered office)
- [ ] **Register as Data Controller with the ICO** — required before collecting personal data. Register at ico.org.uk/registration (~£40/year). Add ICO registration number to Privacy Policy
- [ ] **Update VAT status** — T&Cs note "not currently VAT registered". Update if/when VAT registered

---

## 💄 Compliance

- [ ] **Receive INCI lists from Cosmiko** (Products 01 + 07) — needed before CPSR submission
- [ ] **Receive INCI lists from Moroccan supplier** (Products 05 + 06)
- [ ] **Submit CPSR for all 4 cosmetic products** — Larchwood Consulting / Bellis Safety / Cosmetag. Budget £800–1,000
- [ ] **Notify all 4 cosmetic products on UK Submit (SCPN)** — required before any product is placed on market
- [ ] **Stability testing** — required for CPSR
- [ ] **Microbial testing** — required for Product 05 (clay paste)
- [ ] **Confirm "Made in Republic of Korea"** on Product 04 hang tag is correct and matches supplier documentation

---

## 💳 Payments — Stripe Live Mode ✅

- [x] **Register live Stripe webhook** with all 18 events
- [x] **`STRIPE_WEBHOOK_SECRET`** updated in Supabase secrets
- [x] **`STRIPE_SECRET_KEY`** in Supabase set to `sk_live_...`
- [x] **`VITE_STRIPE_PUBLISHABLE_KEY`** in `amplify.yml` set to `pk_live_...`
- [ ] **Do one live test order** with a real card — confirm row in `customers` table, confirmation email arrives, lead marked `completed`

---

## 📧 Email ✅

- [x] **`orders.bysolum.co.uk` domain verified in Resend**
- [x] **Confirmation email working**
- [ ] **Build shipping confirmation email** with tracking number (not yet built)

---

## 🌐 Domain & Infrastructure ✅

- [x] **bysolum.com domain registered**
- [x] **Supabase auth URL configuration set**

---

## 🔍 SEO & Analytics

- [ ] **Set up Google Search Console** — register bysolum.com and submit `bysolum.com/sitemap.xml` on launch day
- [ ] **Register Google Business Profile** for bysolum.com
- [ ] **Confirm Plausible Analytics** is tracking correctly on the live domain

---

## 🧪 QA

- [ ] **E2E tests passing** — run Playwright suite against dev URL before switching to live
- [ ] **Test checkout flow end-to-end** with a real card (see Payments above)
- [ ] **Test account portal** — magic link login, subscription view, address update, cancellation
- [ ] **Test /guide pages** — all 7 articles render correctly, meta titles update per article
- [ ] **Test /terms and /privacy** — all links resolve, address placeholders replaced
- [ ] **Mobile QA** — check /checkout, /guide, /terms, /privacy on mobile viewport

---

## 📦 Inventory

- [ ] **Place Morocco order** (Fatima's Garden — clay + argan, MOQ 12)
- [ ] **Place Korea order** (Italy Towel + back cloth + scalp massager — COOLFIN A)
- [ ] **Place UK lotion order** (Cosmiko, after INCI confirmed)
- [ ] **Contact Jennifer's Hamam** (jennifershamam@gmail.com) — Kese Mitt, MOQ 30–50
- [ ] **Order box samples** — Alibaba (A4 footprint, 8cm + 10cm depth, matte black magnetic debossed) and Foldabox
- [ ] **Confirm lotion bottle dimensions** from Cosmiko before ordering box samples

---

## 📸 Content

- [ ] **OG image deployed** ✅ (done — `/web/public/og-image.jpg`)
- [ ] **Product photography** — needed for website product cards before full launch
- [ ] **Abandoned checkout email flow** — leads table is ready, email flow not yet built

---

*Last updated: 11 April 2026*
