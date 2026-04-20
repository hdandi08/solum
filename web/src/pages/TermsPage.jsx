import { useEffect } from 'react';
import Nav from '../components/Nav';
import SolumFooter from '../components/SolumFooter';

const LAST_UPDATED = '11 April 2026';

const CSS = `
.terms-page { background: var(--black); min-height: 100vh; padding-top: 64px; }

/* Hero */
.terms-hero {
  border-bottom: 1px solid var(--line);
  padding: 64px 48px 48px;
  max-width: 1000px;
  margin: 0 auto;
}
.terms-hero-eyebrow {
  font-size: 11px; letter-spacing: 5px; text-transform: uppercase;
  color: var(--blit); font-weight: 600; margin-bottom: 16px; display: block;
}
.terms-hero-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(44px, 5vw, 72px);
  letter-spacing: 0.04em; line-height: 0.9;
  color: var(--bone); margin-bottom: 20px;
}
.terms-hero-meta {
  font-size: 12px; letter-spacing: 3px; text-transform: uppercase;
  color: var(--stone); opacity: 0.5; margin-bottom: 24px;
}
.terms-hero-intro {
  font-size: 16px; font-weight: 300; line-height: 1.7;
  color: var(--stone); max-width: 640px;
}

/* Layout */
.terms-outer {
  max-width: 1000px; margin: 0 auto;
  padding: 56px 48px 96px;
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 64px;
  align-items: start;
}

/* Sidebar TOC */
.terms-toc {
  position: sticky; top: 96px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}
.terms-toc-label {
  font-size: 10px; letter-spacing: 4px; text-transform: uppercase;
  color: var(--blit); font-weight: 600; opacity: 0.7;
  margin-bottom: 16px; display: block;
}
.terms-toc-list { list-style: none; padding: 0; margin: 0; }
.terms-toc-list li { border-bottom: 1px solid var(--line); }
.terms-toc-list a {
  display: block; padding: 9px 0;
  font-size: 12px; font-weight: 400; line-height: 1.4;
  color: var(--stone); text-decoration: none;
  transition: color 0.2s;
}
.terms-toc-list a:hover { color: var(--bone); }

/* Main content */
.terms-body { min-width: 0; }

/* Section */
.terms-section {
  margin-bottom: 56px;
  padding-bottom: 56px;
  border-bottom: 1px solid var(--line);
}
.terms-section:last-child { border-bottom: none; }

.terms-section-num {
  font-size: 10px; letter-spacing: 4px; text-transform: uppercase;
  color: var(--blit); font-weight: 600; opacity: 0.6;
  margin-bottom: 10px; display: block;
}
.terms-section-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 32px; letter-spacing: 0.04em;
  color: var(--bone); margin-bottom: 24px;
}

/* Text */
.terms-p {
  font-size: 15px; font-weight: 300; line-height: 1.8;
  color: var(--stone); margin-bottom: 16px;
}
.terms-p strong { font-weight: 600; color: var(--bone); }
.terms-p:last-child { margin-bottom: 0; }

.terms-h3 {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 14px; font-weight: 700;
  letter-spacing: 3px; text-transform: uppercase;
  color: var(--bone); opacity: 0.9;
  margin: 28px 0 12px;
}
.terms-h3:first-child { margin-top: 0; }

/* Callout box */
.terms-callout {
  border-left: 3px solid var(--blue);
  background: rgba(46,109,164,0.07);
  padding: 16px 20px;
  margin: 20px 0;
}
.terms-callout p {
  font-size: 14px; font-weight: 400; line-height: 1.7;
  color: var(--bone); opacity: 0.9; margin: 0;
}
.terms-callout p + p { margin-top: 8px; }
.terms-callout strong { font-weight: 700; }

/* Warning box */
.terms-warning {
  border-left: 3px solid #e85d4a;
  background: rgba(232,93,74,0.06);
  padding: 16px 20px;
  margin: 20px 0;
}
.terms-warning p {
  font-size: 14px; font-weight: 400; line-height: 1.7;
  color: var(--bone); opacity: 0.85; margin: 0;
}
.terms-warning p + p { margin-top: 8px; }
.terms-warning strong { font-weight: 700; color: #e85d4a; }

/* List */
.terms-list {
  list-style: none; padding: 0; margin: 12px 0 20px;
  display: flex; flex-direction: column; gap: 8px;
}
.terms-list li {
  font-size: 15px; font-weight: 300; line-height: 1.6;
  color: var(--stone); padding-left: 20px; position: relative;
}
.terms-list li::before {
  content: '—';
  position: absolute; left: 0;
  color: var(--blue); opacity: 0.7;
}

/* Info table */
.terms-info-block {
  background: var(--char);
  border: 1px solid var(--line);
  padding: 24px 28px;
  margin: 20px 0;
  display: flex; flex-direction: column; gap: 12px;
}
.terms-info-row {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 16px;
  font-size: 14px;
}
.terms-info-label {
  font-weight: 600; letter-spacing: 2px; text-transform: uppercase;
  font-size: 11px; color: var(--blit); opacity: 0.7;
  padding-top: 2px;
}
.terms-info-value {
  font-weight: 300; color: var(--bone); line-height: 1.5;
}

@media (max-width: 768px) {
  .terms-outer { grid-template-columns: 1fr; gap: 32px; padding: 32px 24px 64px; }
  .terms-toc { display: none; }
  .terms-hero { padding: 40px 24px 32px; }
}
`;

export default function TermsPage() {
  useEffect(() => {
    document.title = 'Terms & Conditions | SOLUM';
    let meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Terms and conditions for SOLUM — men\'s body care subscription. Your statutory rights, subscription terms, cosmetic product safety, returns, and governing law.');
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <Nav />
      <div className="terms-page">

        <div className="terms-hero">
          <span className="terms-hero-eyebrow">SOLUM · Legal</span>
          <h1 className="terms-hero-title">Terms &amp; Conditions</h1>
          <div className="terms-hero-meta">Last updated: {LAST_UPDATED}</div>
          <p className="terms-hero-intro">
            These terms govern your use of bysolum.co.uk and any purchases or subscriptions you make. Please read them carefully. Your statutory rights under UK consumer law are not affected by anything in this document.
          </p>
        </div>

        <div className="terms-outer">

          {/* TOC */}
          <nav className="terms-toc">
            <span className="terms-toc-label">Contents</span>
            <ul className="terms-toc-list">
              {[
                ['#s1', '1. About SOLUM'],
                ['#s2', '2. The Products'],
                ['#s3', '3. Placing an Order'],
                ['#s4', '4. Pricing & Payment'],
                ['#s5', '5. Subscription Terms'],
                ['#s6', '6. Delivery'],
                ['#s7', '7. Right to Cancel & Returns'],
                ['#s8', '8. Cosmetic Product Safety'],
                ['#s9', '9. Responsible Person'],
                ['#s10', '10. Your Statutory Rights'],
                ['#s11', '11. Our Liability'],
                ['#s12', '12. Intellectual Property'],
                ['#s13', '13. Data Protection'],
                ['#s14', '14. Changes to Terms'],
                ['#s15', '15. Governing Law'],
                ['#s16', '16. Contact & Complaints'],
              ].map(([href, label]) => (
                <li key={href}><a href={href}>{label}</a></li>
              ))}
            </ul>
          </nav>

          {/* Body */}
          <main className="terms-body">

            {/* 1 — About SOLUM */}
            <section className="terms-section" id="s1">
              <span className="terms-section-num">Section 01</span>
              <h2 className="terms-section-title">About SOLUM</h2>
              <p className="terms-p">SOLUM is a men's body care brand operated as a sole trader by <strong>Harsha Dandi</strong> ("we", "us", "our"). The business trades under the name SOLUM via the website <strong>bysolum.co.uk</strong>.</p>
              <p className="terms-p">As a sole trader, SOLUM is not a limited company and does not have a separate legal personality. Harsha Dandi is personally responsible for the obligations of the business.</p>
              <div className="terms-info-block">
                <div className="terms-info-row">
                  <span className="terms-info-label">Trading Name</span>
                  <span className="terms-info-value">SOLUM</span>
                </div>
                <div className="terms-info-row">
                  <span className="terms-info-label">Trader</span>
                  <span className="terms-info-value">Harsha Dandi (sole trader)</span>
                </div>
                <div className="terms-info-row">
                  <span className="terms-info-label">Address</span>
                  <span className="terms-info-value">[Business address — to be completed on registration]</span>
                </div>
                <div className="terms-info-row">
                  <span className="terms-info-label">Email</span>
                  <span className="terms-info-value">contact@bysolum.com</span>
                </div>
                <div className="terms-info-row">
                  <span className="terms-info-label">Phone</span>
                  <span className="terms-info-value">07748 370419</span>
                </div>
                <div className="terms-info-row">
                  <span className="terms-info-label">Website</span>
                  <span className="terms-info-value">bysolum.co.uk</span>
                </div>
                <div className="terms-info-row">
                  <span className="terms-info-label">VAT</span>
                  <span className="terms-info-value">Not currently VAT registered. All prices shown are VAT-inclusive. [Update on registration]</span>
                </div>
              </div>
              <p className="terms-p">These Terms and Conditions, together with any order confirmation and our Privacy Policy, form the entire agreement between you and SOLUM. By placing an order, you agree to be bound by these terms.</p>
            </section>

            {/* 2 — The Products */}
            <section className="terms-section" id="s2">
              <span className="terms-section-num">Section 02</span>
              <h2 className="terms-section-title">The Products</h2>
              <p className="terms-p">SOLUM sells a system of men's body care products comprising physical tools and cosmetic products. Products are numbered 01–09 and sold as kits (GROUND, RITUAL, SOVEREIGN) or as subscription refills.</p>

              <div className="terms-h3">Cosmetic Products (regulated under UK Cosmetics Regulation)</div>
              <p className="terms-p">The following products are cosmetic products within the meaning of the UK Cosmetics Regulation (retained EU Regulation (EC) No 1223/2009) and have been assessed under a Cosmetic Product Safety Report (CPSR):</p>
              <ul className="terms-list">
                <li><strong>Product 01 — Amino Acid Body Wash 250ml</strong> — rinse-off cosmetic, made in UK</li>
                <li><strong>Product 05 — Rhassoul Clay Body Mask 200g</strong> — rinse-off cosmetic, sourced from Morocco</li>
                <li><strong>Product 06 — Organic Argan Body Oil 50ml</strong> — leave-on cosmetic, sourced from Morocco</li>
                <li><strong>Product 07 — Fast-Absorb Body Lotion 400ml</strong> — leave-on cosmetic, made in UK</li>
              </ul>

              <div className="terms-h3">Physical Tools (non-cosmetic)</div>
              <ul className="terms-list">
                <li><strong>Product 02 — Exfoliating Mitt</strong> — 100% viscose rayon textile tool</li>
                <li><strong>Product 03 — Back Scrub Cloth 70cm</strong> — 100% viscose textile tool</li>
                <li><strong>Product 04 — Silicone Scalp Massager</strong> — silicone grooming tool, made in South Korea</li>
                <li><strong>Product 08 — Bamboo Cloth</strong> — textile tool</li>
              </ul>

              <p className="terms-p">All products are intended for personal care use only and are not medical devices or medicinal products. See Section 8 for full safety information.</p>
              <p className="terms-p">Product images shown on the website are for illustration purposes. Actual product appearance, including labels and packaging, may vary slightly. We will notify you of any material changes to product formulation.</p>
            </section>

            {/* 3 — Placing an Order */}
            <section className="terms-section" id="s3">
              <span className="terms-section-num">Section 03</span>
              <h2 className="terms-section-title">Placing an Order</h2>
              <p className="terms-p">By completing the checkout process on bysolum.co.uk, you make an offer to purchase the selected products or subscription. A contract is formed when we send you an order confirmation by email.</p>

              <div className="terms-h3">Order Process</div>
              <ul className="terms-list">
                <li>Select your kit (GROUND, RITUAL, or SOVEREIGN)</li>
                <li>Enter your delivery address and payment details via our secure Stripe checkout</li>
                <li>Review your order and confirm</li>
                <li>You will receive an order confirmation email immediately. This is acknowledgement of your order, not acceptance</li>
                <li>A second email confirming dispatch constitutes our acceptance of your order and forms the contract</li>
              </ul>

              <div className="terms-h3">Right to Decline Orders</div>
              <p className="terms-p">We reserve the right to decline any order at our discretion, including where a product is out of stock, where we suspect fraudulent activity, or where there has been a pricing error. If we decline your order, you will receive a full refund within 5 business days.</p>

              <div className="terms-h3">Eligibility</div>
              <p className="terms-p">You must be at least 18 years old and a UK resident to place an order. By placing an order, you confirm that you meet these requirements and that the information you provide is accurate and complete.</p>
            </section>

            {/* 4 — Pricing & Payment */}
            <section className="terms-section" id="s4">
              <span className="terms-section-num">Section 04</span>
              <h2 className="terms-section-title">Pricing &amp; Payment</h2>

              <div className="terms-h3">Prices</div>
              <p className="terms-p">All prices are shown in pounds sterling (GBP) and are inclusive of any applicable taxes. Delivery charges are shown separately at checkout and are not included in the product price.</p>
              <p className="terms-p">Current pricing:</p>
              <div className="terms-info-block">
                <div className="terms-info-row">
                  <span className="terms-info-label">GROUND Kit</span>
                  <span className="terms-info-value">£65 first box · £38/month subscription</span>
                </div>
                <div className="terms-info-row">
                  <span className="terms-info-label">RITUAL Kit</span>
                  <span className="terms-info-value">£85 first box · £48/month subscription</span>
                </div>
                <div className="terms-info-row">
                  <span className="terms-info-label">SOVEREIGN Kit</span>
                  <span className="terms-info-value">£130 first box · £58/month subscription (available when all products are live)</span>
                </div>
                <div className="terms-info-row">
                  <span className="terms-info-label">Delivery</span>
                  <span className="terms-info-value">£3.85 per box (Royal Mail Tracked 48)</span>
                </div>
              </div>

              <div className="terms-h3">Payment Processing</div>
              <p className="terms-p">Payments are processed securely by <strong>Stripe</strong>, a third-party payment processor. SOLUM does not store your card details. By providing payment information, you agree to Stripe's terms of service and privacy policy.</p>
              <p className="terms-p">We accept major debit and credit cards. Payment is taken at the time of placing your order and at each subsequent monthly renewal.</p>

              <div className="terms-h3">Failed Payments</div>
              <p className="terms-p">If a subscription renewal payment fails, we will attempt to collect payment up to three times over a 7-day period. If payment remains unsuccessful, your subscription will be paused and we will contact you. We will not dispatch goods for which payment has not been received.</p>

              <div className="terms-h3">Pricing Changes</div>
              <p className="terms-p">We may change our prices from time to time. For subscription customers, any price increase will be communicated to you by email at least 30 days before it takes effect. If you do not accept a price increase, you may cancel your subscription before the new price applies.</p>

              <div className="terms-callout">
                <p><strong>Founding Member Pricing Lock:</strong> Customers who subscribed as Founding Members (first 100) have their launch price locked permanently to their account. This commitment is honoured regardless of any subsequent price increases to new customers.</p>
              </div>
            </section>

            {/* 5 — Subscription Terms */}
            <section className="terms-section" id="s5">
              <span className="terms-section-num">Section 05</span>
              <h2 className="terms-section-title">Subscription Terms</h2>
              <p className="terms-p">When you purchase a SOLUM kit, you are entering into a subscription agreement. Your subscription consists of a first box (containing both tools and consumable products) and monthly refill boxes thereafter (consumable products only, as tools last 6–12 months).</p>

              <div className="terms-h3">How the Subscription Works</div>
              <ul className="terms-list">
                <li><strong>First box:</strong> Your full kit — tools and consumables — dispatched within 3–5 business days of your order</li>
                <li><strong>Monthly refill:</strong> Consumable products (body wash, body lotion, and applicable products for your kit tier) dispatched each month on the anniversary of your first order</li>
                <li>Your monthly payment is taken automatically on your renewal date via Stripe</li>
              </ul>

              <div className="terms-h3">Renewal Reminders</div>
              <p className="terms-p">We will send you a reminder email <strong>5–7 days before each monthly renewal</strong>. The reminder will include:</p>
              <ul className="terms-list">
                <li>The date your renewal payment will be taken</li>
                <li>The amount you will be charged</li>
                <li>Any changes from the previous payment</li>
                <li>Clear instructions on how to cancel before the renewal</li>
              </ul>

              <div className="terms-h3">Cancellation of Subscription</div>
              <p className="terms-p">You may cancel your subscription at any time by:</p>
              <ul className="terms-list">
                <li>Logging into your account at bysolum.co.uk and selecting 'Cancel Subscription'</li>
                <li>Emailing contact@bysolum.com with the subject line "Cancel Subscription"</li>
              </ul>
              <p className="terms-p">Cancellation takes effect from your next billing date. You will not be charged for any renewal after your cancellation is confirmed. You will continue to receive any box already paid for. We will acknowledge your cancellation by email within 24 hours.</p>

              <div className="terms-h3">Pausing Your Subscription</div>
              <p className="terms-p">You may pause your subscription for up to 3 months by contacting us at contact@bysolum.com. During a pause, no payments will be taken and no boxes will be dispatched.</p>

              <div className="terms-h3">Subscription Cooling-Off</div>
              <p className="terms-p">You have the right to cancel your subscription within 14 days of entering into the subscription agreement (your first order date) without giving any reason. See Section 7 for full cancellation rights.</p>

              <div className="terms-h3">Product Changes</div>
              <p className="terms-p">Where a product in your monthly refill is temporarily unavailable or has been reformulated, we may substitute an equivalent product of the same or greater value. We will notify you of any substitution. If you are not satisfied, you may return the substituted item for a full refund without cancelling your subscription.</p>
            </section>

            {/* 6 — Delivery */}
            <section className="terms-section" id="s6">
              <span className="terms-section-num">Section 06</span>
              <h2 className="terms-section-title">Delivery</h2>

              <div className="terms-h3">Delivery Service</div>
              <p className="terms-p">All orders are delivered within the United Kingdom via <strong>Royal Mail Tracked 48</strong>. We currently do not offer international delivery.</p>

              <div className="terms-info-block">
                <div className="terms-info-row">
                  <span className="terms-info-label">Service</span>
                  <span className="terms-info-value">Royal Mail Tracked 48</span>
                </div>
                <div className="terms-info-row">
                  <span className="terms-info-label">Cost</span>
                  <span className="terms-info-value">£3.85 per box</span>
                </div>
                <div className="terms-info-row">
                  <span className="terms-info-label">Estimated Time</span>
                  <span className="terms-info-value">2–3 working days from dispatch</span>
                </div>
                <div className="terms-info-row">
                  <span className="terms-info-label">Tracking</span>
                  <span className="terms-info-value">Tracking number provided by email on dispatch</span>
                </div>
              </div>

              <div className="terms-h3">Dispatch Times</div>
              <p className="terms-p">First boxes are dispatched within 3–5 business days of your order being confirmed. Monthly subscription refills are dispatched within 2 business days of your renewal date.</p>

              <div className="terms-h3">Risk of Loss</div>
              <p className="terms-p">Risk in the goods passes to you when they are delivered to the address provided at checkout. If you are not present at delivery, Royal Mail will follow their standard redelivery or collection process.</p>

              <div className="terms-h3">Delivery Failures</div>
              <p className="terms-p">If your delivery is delayed beyond 5 working days from dispatch, please contact us at contact@bysolum.com. If goods are lost in transit, we will arrange a replacement or refund. Claims for lost parcels must be raised within 28 days of the expected delivery date.</p>
              <p className="terms-p">If you provide an incorrect delivery address, we are not liable for non-delivery but will attempt to assist you. Additional postage costs may apply for redelivery.</p>
            </section>

            {/* 7 — Right to Cancel & Returns */}
            <section className="terms-section" id="s7">
              <span className="terms-section-num">Section 07</span>
              <h2 className="terms-section-title">Right to Cancel &amp; Returns</h2>

              <div className="terms-h3">Your 14-Day Right to Cancel</div>
              <p className="terms-p">Under the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013, you have the right to cancel your order within <strong>14 days</strong> of receiving your goods, without giving any reason.</p>
              <p className="terms-p">To exercise this right, you must notify us clearly before the 14-day period expires. You can do this by:</p>
              <ul className="terms-list">
                <li>Emailing contact@bysolum.com with "Order Cancellation" as the subject, including your order number and name</li>
                <li>Using the cancellation option in your account at bysolum.co.uk</li>
              </ul>
              <p className="terms-p">After notifying us, you must return the goods to us within 14 days. Return postage is at your cost unless the goods are faulty or were sent in error.</p>

              <div className="terms-warning">
                <p><strong>Important — Cosmetic Products Exception:</strong> Under Regulation 28(3) of the Consumer Contracts Regulations, you lose your right to cancel a sealed cosmetic product if you unseal it after delivery. Our cosmetic products (Products 01, 05, 06, 07) are sealed for hygiene and health protection reasons.</p>
                <p>Once you open the packaging of a cosmetic product, that product cannot be returned unless it is faulty. This does not affect your right to cancel <strong>unopened</strong> cosmetic products within 14 days.</p>
              </div>

              <div className="terms-h3">Physical Tools — Returns</div>
              <p className="terms-p">Physical tools (Products 02, 03, 04, 08) may be returned unused within 14 days for a full refund. Tools that have been used cannot be returned unless they are faulty.</p>

              <div className="terms-h3">Refund Process</div>
              <p className="terms-p">Once we receive and inspect your return, we will process your refund within <strong>14 days</strong>. Refunds are made to the original payment method (via Stripe). We cannot refund to a different card or account unless you consent to an alternative.</p>

              <div className="terms-h3">Faulty or Incorrect Goods</div>
              <p className="terms-p">If your goods arrive faulty, damaged, or not as described, you have additional rights under the Consumer Rights Act 2015 (see Section 10). Please contact us within 30 days of receipt at contact@bysolum.com with a description and photograph of the issue. We will arrange a replacement or full refund, including return postage, at no cost to you.</p>

              <div className="terms-callout">
                <p><strong>Model Cancellation Form:</strong> You may use the following to notify cancellation:</p>
                <p style={{marginTop: '10px', fontStyle: 'italic', opacity: 0.8}}>
                  "To SOLUM (Harsha Dandi), contact@bysolum.com — I/We hereby give notice that I/We cancel my/our contract of sale of the following goods: [describe goods], ordered on [date], received on [date], Order Number [number]. Name: [name], Address: [address], Date: [date]."
                </p>
              </div>
            </section>

            {/* 8 — Cosmetic Product Safety */}
            <section className="terms-section" id="s8">
              <span className="terms-section-num">Section 08</span>
              <h2 className="terms-section-title">Cosmetic Product Safety</h2>

              <div className="terms-h3">CPSR — Cosmetic Product Safety Reports</div>
              <p className="terms-p">All four SOLUM cosmetic products (Products 01, 05, 06, 07) have been assessed under a <strong>Cosmetic Product Safety Report (CPSR)</strong> in accordance with the UK Cosmetics Regulation (retained Regulation (EC) No 1223/2009). The CPSR evaluates ingredient safety, stability, microbiological quality, and safety under foreseeable conditions of use.</p>
              <p className="terms-p">Product Information Files (PIFs) are maintained for a minimum of 10 years from the date the last batch of each product is placed on the market, and are available to the relevant UK authority upon request.</p>

              <div className="terms-h3">UK Cosmetics Safety Notification</div>
              <p className="terms-p">All cosmetic products are notified on the UK Submit system (SCPN — UK Cosmetic Product Notification Portal) before being placed on the UK market, in accordance with Article 13 of the UK Cosmetics Regulation.</p>

              <div className="terms-h3">Ingredients and Allergens</div>
              <p className="terms-p">Full ingredient lists are declared on each product label in INCI (International Nomenclature of Cosmetic Ingredients) format. Known allergens are highlighted in the ingredient list in accordance with UK labelling requirements.</p>
              <p className="terms-p">If you have known allergies or sensitivities to any cosmetic ingredients, please review the full ingredient list on the product label before use. Contact us at contact@bysolum.com if you need ingredient information before purchase.</p>

              <div className="terms-h3">Patch Test Recommendation</div>
              <div className="terms-callout">
                <p><strong>We strongly recommend conducting a patch test before full use of any cosmetic product.</strong> Apply a small amount to a small area of skin (such as the inside of the forearm or behind the ear) and wait 24–48 hours to check for any adverse reaction, redness, itching, or irritation before applying to a wider area.</p>
              </div>

              <div className="terms-h3">Safety Instructions</div>
              <ul className="terms-list">
                <li>For external use only</li>
                <li>Avoid contact with eyes. If contact occurs, rinse thoroughly with water</li>
                <li>Discontinue use immediately if irritation, redness, swelling, or allergic reaction occurs</li>
                <li>If a severe reaction occurs, cease use and seek medical advice</li>
                <li>Store in a cool, dry place away from direct sunlight</li>
                <li>Keep out of reach of children</li>
                <li>Do not use on broken, inflamed, or infected skin without medical advice</li>
              </ul>

              <div className="terms-h3">Not for Medical Use</div>
              <div className="terms-warning">
                <p><strong>These are cosmetic products, not medical products.</strong> They are intended for personal care and grooming purposes only. They are not intended to diagnose, treat, cure, prevent, or mitigate any disease, medical condition, or health disorder.</p>
                <p>If you have a skin condition, infection, dermatological concern, or any medical condition affecting your skin, consult a healthcare professional or dermatologist before use. These products have not undergone clinical or medical evaluation.</p>
              </div>

              <div className="terms-h3">Adverse Reaction Reporting</div>
              <p className="terms-p">If you experience a serious adverse reaction to any SOLUM product, please:</p>
              <ul className="terms-list">
                <li>Stop using the product immediately</li>
                <li>Seek medical advice if the reaction is severe or does not resolve</li>
                <li>Contact us at contact@bysolum.com so we can investigate and take appropriate action</li>
                <li>If the reaction is serious, it may also be reported to the UK Medicines and Healthcare products Regulatory Agency (MHRA) via the Yellow Card scheme</li>
              </ul>
            </section>

            {/* 9 — Responsible Person */}
            <section className="terms-section" id="s9">
              <span className="terms-section-num">Section 09</span>
              <h2 className="terms-section-title">Responsible Person</h2>
              <p className="terms-p">Under the UK Cosmetics Regulation (retained Regulation (EC) No 1223/2009), all cosmetic products placed on the UK market must have a designated <strong>Responsible Person</strong> who ensures compliance with the regulation's requirements.</p>
              <p className="terms-p">The Responsible Person for all SOLUM cosmetic products is:</p>

              <div className="terms-info-block">
                <div className="terms-info-row">
                  <span className="terms-info-label">Name</span>
                  <span className="terms-info-value">Harsha Dandi</span>
                </div>
                <div className="terms-info-row">
                  <span className="terms-info-label">Address</span>
                  <span className="terms-info-value">[UK business address — to be completed]</span>
                </div>
                <div className="terms-info-row">
                  <span className="terms-info-label">Contact</span>
                  <span className="terms-info-value">contact@bysolum.com</span>
                </div>
                <div className="terms-info-row">
                  <span className="terms-info-label">Role</span>
                  <span className="terms-info-value">Responsible Person under UK Cosmetics Regulation</span>
                </div>
                <div className="terms-info-row">
                  <span className="terms-info-label">Applicable to</span>
                  <span className="terms-info-value">Products 01, 05, 06, 07 (cosmetic products)</span>
                </div>
              </div>

              <p className="terms-p">As Responsible Person, Harsha Dandi is accountable for ensuring that all SOLUM cosmetic products comply with the UK Cosmetics Regulation, including product safety, labelling, notification requirements, and maintenance of Product Information Files.</p>
            </section>

            {/* 10 — Statutory Rights */}
            <section className="terms-section" id="s10">
              <span className="terms-section-num">Section 10</span>
              <h2 className="terms-section-title">Your Statutory Rights</h2>

              <div className="terms-callout">
                <p><strong>Your statutory rights under UK consumer law cannot be excluded, restricted, or limited by these Terms and Conditions.</strong> Nothing in this document affects your rights under the Consumer Rights Act 2015 or any other applicable UK law.</p>
              </div>

              <div className="terms-h3">Consumer Rights Act 2015</div>
              <p className="terms-p">Under the Consumer Rights Act 2015, all goods we sell must be:</p>
              <ul className="terms-list">
                <li><strong>Of satisfactory quality</strong> — free from defects, safe, durable, and of acceptable finish</li>
                <li><strong>Fit for purpose</strong> — suitable for the purpose for which such goods are commonly supplied</li>
                <li><strong>As described</strong> — matching the description, sample, or model shown</li>
              </ul>

              <div className="terms-h3">Remedies for Faulty Goods</div>
              <p className="terms-p">If goods do not conform to these standards:</p>
              <ul className="terms-list">
                <li><strong>Within 30 days</strong> of delivery — you are entitled to a full refund</li>
                <li><strong>Within 6 months</strong> of delivery — we must repair or replace the goods. If repair or replacement is not possible, you are entitled to a price reduction or refund</li>
                <li><strong>After 6 months</strong> — you may still claim if you can demonstrate the fault existed at the time of delivery</li>
              </ul>

              <div className="terms-h3">Digital Content</div>
              <p className="terms-p">Where we provide digital content (such as account access), that content must be of satisfactory quality, fit for purpose, and as described under the Consumer Rights Act 2015.</p>
            </section>

            {/* 11 — Our Liability */}
            <section className="terms-section" id="s11">
              <span className="terms-section-num">Section 11</span>
              <h2 className="terms-section-title">Our Liability</h2>

              <div className="terms-h3">What We Cannot Exclude</div>
              <p className="terms-p">Nothing in these terms and conditions limits or excludes our liability for:</p>
              <ul className="terms-list">
                <li>Death or personal injury caused by our negligence</li>
                <li>Fraud or fraudulent misrepresentation</li>
                <li>Any breach of your statutory rights under the Consumer Rights Act 2015 or other applicable UK consumer law</li>
                <li>Any liability that cannot be excluded as a matter of law</li>
              </ul>

              <div className="terms-h3">Limitation of Liability</div>
              <p className="terms-p">Subject to the exclusions above and to the extent permitted by applicable law, our total liability to you for any loss or damage arising under or in connection with these terms (whether in contract, tort, breach of statutory duty, or otherwise) shall not exceed the amount you paid for the product or products giving rise to the claim.</p>
              <p className="terms-p">We are not liable for:</p>
              <ul className="terms-list">
                <li>Indirect, incidental, or consequential loss or damage</li>
                <li>Loss of profit, revenue, data, or business opportunity</li>
                <li>Damage arising from misuse, failure to follow usage instructions, or use contrary to the stated purpose of a product</li>
                <li>Delays caused by Royal Mail, Stripe, or other third-party service providers beyond our reasonable control</li>
              </ul>

              <div className="terms-h3">Cosmetic Products</div>
              <p className="terms-p">Our cosmetic products have been assessed for safety by a qualified safety assessor under a CPSR. We cannot accept liability for adverse reactions arising from individual allergies or sensitivities where the relevant allergen was disclosed on the product label and where a patch test was not conducted as recommended. We remain liable for defective products under the Consumer Protection Act 1987 and your rights under the Consumer Rights Act 2015.</p>

              <div className="terms-h3">Events Outside Our Control</div>
              <p className="terms-p">We are not liable for any failure or delay in performing our obligations where the failure or delay results from events outside our reasonable control, including but not limited to: acts of God, postal strikes, pandemic-related disruptions, or supplier failure. We will notify you as soon as reasonably possible and will take steps to minimise the impact on your order.</p>
            </section>

            {/* 12 — IP */}
            <section className="terms-section" id="s12">
              <span className="terms-section-num">Section 12</span>
              <h2 className="terms-section-title">Intellectual Property</h2>
              <p className="terms-p">All intellectual property rights in the SOLUM brand, wordmark, product names, website content, images, copy, and design are owned by or licensed to Harsha Dandi (trading as SOLUM). All rights are reserved.</p>
              <p className="terms-p">You may not reproduce, distribute, modify, or create derivative works from any SOLUM intellectual property without our prior written consent. This includes the SOLUM wordmark, product names, label designs, and website content.</p>
              <p className="terms-p">Purchasing a SOLUM product does not transfer any intellectual property rights to you.</p>
            </section>

            {/* 13 — Data Protection */}
            <section className="terms-section" id="s13">
              <span className="terms-section-num">Section 13</span>
              <h2 className="terms-section-title">Data Protection &amp; Privacy</h2>
              <p className="terms-p">SOLUM (Harsha Dandi) is the data controller for personal data collected via bysolum.co.uk. We process your personal data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.</p>
              <p className="terms-p">We collect and use your personal data to process and fulfil your orders, manage your subscription, send you order and renewal communications, and comply with our legal obligations.</p>
              <p className="terms-p">Your data is shared with Stripe (for payment processing) and Royal Mail (for delivery). We do not sell your personal data to third parties.</p>
              <p className="terms-p">You have the right to access, correct, or delete your personal data, and the right to object to or restrict its processing. To exercise these rights, contact contact@bysolum.com.</p>
              <p className="terms-p">For full details of how we collect, use, store, and protect your data, please see our <strong>Privacy Policy</strong>, available at bysolum.co.uk/privacy.</p>
            </section>

            {/* 14 — Changes */}
            <section className="terms-section" id="s14">
              <span className="terms-section-num">Section 14</span>
              <h2 className="terms-section-title">Changes to These Terms</h2>
              <p className="terms-p">We may update these Terms and Conditions from time to time to reflect changes in the law, our products, or our business practices. The current version will always be available at bysolum.co.uk/terms, with the date of last update shown at the top of this page.</p>
              <p className="terms-p">For subscription customers, we will notify you of any material changes to these terms by email at least <strong>30 days before the changes take effect</strong>. If you do not accept the revised terms, you may cancel your subscription before they take effect without penalty.</p>
              <p className="terms-p">Continued use of our website or continued subscription after any changes take effect constitutes acceptance of the revised terms.</p>
            </section>

            {/* 15 — Governing Law */}
            <section className="terms-section" id="s15">
              <span className="terms-section-num">Section 15</span>
              <h2 className="terms-section-title">Governing Law &amp; Jurisdiction</h2>
              <p className="terms-p">These Terms and Conditions are governed by and construed in accordance with the laws of <strong>England and Wales</strong>.</p>
              <p className="terms-p">Any dispute arising out of or relating to these terms, any order, or any subscription shall be subject to the jurisdiction of the courts of England and Wales. Nothing in this clause prevents you from bringing proceedings in any other court of competent jurisdiction where required or permitted by applicable law.</p>

              <div className="terms-h3">Dispute Resolution</div>
              <p className="terms-p">Before initiating any formal proceedings, we encourage you to contact us at contact@bysolum.com to attempt to resolve any dispute informally. We will aim to respond within 5 business days and to resolve most issues within 14 business days.</p>
              <p className="terms-p">If informal resolution is not possible, you may pursue claims via:</p>
              <ul className="terms-list">
                <li>The Small Claims Court (for claims up to £10,000)</li>
                <li>The County Court (for larger claims)</li>
                <li>An approved Alternative Dispute Resolution (ADR) provider</li>
                <li>The Online Dispute Resolution (ODR) platform operated by the European Commission, accessible at ec.europa.eu/odr</li>
              </ul>
            </section>

            {/* 16 — Contact */}
            <section className="terms-section" id="s16">
              <span className="terms-section-num">Section 16</span>
              <h2 className="terms-section-title">Contact &amp; Complaints</h2>
              <p className="terms-p">If you have any questions about these terms, a complaint about a product or order, or wish to exercise any of your statutory rights, please contact us:</p>
              <div className="terms-info-block">
                <div className="terms-info-row">
                  <span className="terms-info-label">Email</span>
                  <span className="terms-info-value">contact@bysolum.com</span>
                </div>
                <div className="terms-info-row">
                  <span className="terms-info-label">Phone</span>
                  <span className="terms-info-value">07748 370419</span>
                </div>
                <div className="terms-info-row">
                  <span className="terms-info-label">Post</span>
                  <span className="terms-info-value">SOLUM (Harsha Dandi), [Business address — to be completed]</span>
                </div>
                <div className="terms-info-row">
                  <span className="terms-info-label">Response Time</span>
                  <span className="terms-info-value">We aim to respond to all enquiries within 2 business days</span>
                </div>
              </div>
              <p className="terms-p">We take all complaints seriously and will aim to resolve them fairly and promptly. If you are not satisfied with our response, you may contact Citizens Advice (citizensadvice.org.uk) for guidance on your options, or refer your complaint to an Alternative Dispute Resolution provider.</p>
            </section>

          </main>
        </div>

        <SolumFooter />
      </div>
    </>
  );
}
