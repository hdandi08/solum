import { useEffect } from 'react';
import Nav from '../components/Nav';
import SolumFooter from '../components/SolumFooter';

const LAST_UPDATED = '11 April 2026';

const CSS = `
.privacy-page { background: var(--black); min-height: 100vh; padding-top: 64px; }

.privacy-hero {
  border-bottom: 1px solid var(--line);
  padding: 64px 48px 48px;
  max-width: 1000px; margin: 0 auto;
}
.privacy-hero-eyebrow {
  font-size: 11px; letter-spacing: 5px; text-transform: uppercase;
  color: var(--blit); font-weight: 600; margin-bottom: 16px; display: block;
}
.privacy-hero-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(44px, 5vw, 72px);
  letter-spacing: 0.04em; line-height: 0.9;
  color: var(--bone); margin-bottom: 20px;
}
.privacy-hero-meta {
  font-size: 12px; letter-spacing: 3px; text-transform: uppercase;
  color: var(--stone); opacity: 0.5; margin-bottom: 24px;
}
.privacy-hero-intro {
  font-size: 16px; font-weight: 300; line-height: 1.7;
  color: var(--stone); max-width: 640px;
}

.privacy-outer {
  max-width: 1000px; margin: 0 auto;
  padding: 56px 48px 96px;
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 64px;
  align-items: start;
}

.privacy-toc {
  position: sticky; top: 96px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}
.privacy-toc-label {
  font-size: 10px; letter-spacing: 4px; text-transform: uppercase;
  color: var(--blit); font-weight: 600; opacity: 0.7;
  margin-bottom: 16px; display: block;
}
.privacy-toc-list { list-style: none; padding: 0; margin: 0; }
.privacy-toc-list li { border-bottom: 1px solid var(--line); }
.privacy-toc-list a {
  display: block; padding: 9px 0;
  font-size: 12px; font-weight: 400; line-height: 1.4;
  color: var(--stone); text-decoration: none; transition: color 0.2s;
}
.privacy-toc-list a:hover { color: var(--bone); }

.privacy-body { min-width: 0; }

.privacy-section {
  margin-bottom: 56px; padding-bottom: 56px;
  border-bottom: 1px solid var(--line);
}
.privacy-section:last-child { border-bottom: none; }

.privacy-section-num {
  font-size: 10px; letter-spacing: 4px; text-transform: uppercase;
  color: var(--blit); font-weight: 600; opacity: 0.6;
  margin-bottom: 10px; display: block;
}
.privacy-section-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 32px; letter-spacing: 0.04em;
  color: var(--bone); margin-bottom: 24px;
}

.privacy-p {
  font-size: 15px; font-weight: 300; line-height: 1.8;
  color: var(--stone); margin-bottom: 16px;
}
.privacy-p strong { font-weight: 600; color: var(--bone); }
.privacy-p:last-child { margin-bottom: 0; }

.privacy-h3 {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 14px; font-weight: 700;
  letter-spacing: 3px; text-transform: uppercase;
  color: var(--bone); opacity: 0.9;
  margin: 28px 0 12px;
}
.privacy-h3:first-child { margin-top: 0; }

.privacy-callout {
  border-left: 3px solid var(--blue);
  background: rgba(46,109,164,0.07);
  padding: 16px 20px; margin: 20px 0;
}
.privacy-callout p {
  font-size: 14px; font-weight: 400; line-height: 1.7;
  color: var(--bone); opacity: 0.9; margin: 0;
}
.privacy-callout p + p { margin-top: 8px; }
.privacy-callout strong { font-weight: 700; }

.privacy-list {
  list-style: none; padding: 0; margin: 12px 0 20px;
  display: flex; flex-direction: column; gap: 8px;
}
.privacy-list li {
  font-size: 15px; font-weight: 300; line-height: 1.6;
  color: var(--stone); padding-left: 20px; position: relative;
}
.privacy-list li::before {
  content: '—'; position: absolute; left: 0;
  color: var(--blue); opacity: 0.7;
}

.privacy-table {
  width: 100%; border-collapse: collapse; margin: 20px 0;
  font-size: 14px;
}
.privacy-table th {
  font-size: 10px; letter-spacing: 3px; text-transform: uppercase;
  font-weight: 600; color: var(--blit); opacity: 0.7;
  text-align: left; padding: 10px 16px;
  border-bottom: 1px solid var(--line);
}
.privacy-table td {
  padding: 12px 16px; border-bottom: 1px solid var(--line);
  color: var(--stone); font-weight: 300; line-height: 1.5;
  vertical-align: top;
}
.privacy-table td strong { color: var(--bone); font-weight: 600; }
.privacy-table tr:last-child td { border-bottom: none; }

.privacy-info-block {
  background: var(--char); border: 1px solid var(--line);
  padding: 24px 28px; margin: 20px 0;
  display: flex; flex-direction: column; gap: 12px;
}
.privacy-info-row {
  display: grid; grid-template-columns: 160px 1fr; gap: 16px; font-size: 14px;
}
.privacy-info-label {
  font-weight: 600; letter-spacing: 2px; text-transform: uppercase;
  font-size: 11px; color: var(--blit); opacity: 0.7; padding-top: 2px;
}
.privacy-info-value { font-weight: 300; color: var(--bone); line-height: 1.5; }

@media (max-width: 768px) {
  .privacy-outer { grid-template-columns: 1fr; gap: 32px; padding: 32px 24px 64px; }
  .privacy-toc { display: none; }
  .privacy-hero { padding: 40px 24px 32px; }
  .privacy-table { font-size: 13px; }
  .privacy-table th, .privacy-table td { padding: 10px 10px; }
}
`;

export default function PrivacyPage() {
  useEffect(() => {
    document.title = 'Privacy Policy | SOLUM';
    let meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', "SOLUM's privacy policy — how we collect, use, and protect your personal data under UK GDPR and the Data Protection Act 2018.");
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <Nav />
      <div className="privacy-page">

        <div className="privacy-hero">
          <span className="privacy-hero-eyebrow">SOLUM · Legal</span>
          <h1 className="privacy-hero-title">Privacy Policy</h1>
          <div className="privacy-hero-meta">Last updated: {LAST_UPDATED}</div>
          <p className="privacy-hero-intro">
            This policy explains how SOLUM collects, uses, stores, and protects your personal data. We are committed to handling your data with care and in full compliance with UK GDPR and the Data Protection Act 2018.
          </p>
        </div>

        <div className="privacy-outer">

          {/* TOC */}
          <nav className="privacy-toc">
            <span className="privacy-toc-label">Contents</span>
            <ul className="privacy-toc-list">
              {[
                ['#p1', '1. Who We Are'],
                ['#p2', '2. Data We Collect'],
                ['#p3', '3. How We Use It'],
                ['#p4', '4. Lawful Basis'],
                ['#p5', '5. Data Sharing'],
                ['#p6', '6. Data Retention'],
                ['#p7', '7. Your Rights'],
                ['#p8', '8. Cookies & Analytics'],
                ['#p9', '9. International Transfers'],
                ['#p10', '10. Children'],
                ['#p11', '11. Changes'],
                ['#p12', '12. Contact & ICO'],
              ].map(([href, label]) => (
                <li key={href}><a href={href}>{label}</a></li>
              ))}
            </ul>
          </nav>

          {/* Body */}
          <main className="privacy-body">

            {/* 1 */}
            <section className="privacy-section" id="p1">
              <span className="privacy-section-num">Section 01</span>
              <h2 className="privacy-section-title">Who We Are</h2>
              <p className="privacy-p">SOLUM is a men's body care brand operated by <strong>Harsha Dandi</strong> (sole trader) via bysolum.co.uk. Harsha Dandi is the <strong>data controller</strong> for personal data collected through this website and any associated services.</p>
              <div className="privacy-info-block">
                <div className="privacy-info-row">
                  <span className="privacy-info-label">Controller</span>
                  <span className="privacy-info-value">Harsha Dandi (trading as SOLUM)</span>
                </div>
                <div className="privacy-info-row">
                  <span className="privacy-info-label">Address</span>
                  <span className="privacy-info-value">[Business address — to be completed on registration]</span>
                </div>
                <div className="privacy-info-row">
                  <span className="privacy-info-label">Email</span>
                  <span className="privacy-info-value">contact@bysolum.com</span>
                </div>
                <div className="privacy-info-row">
                  <span className="privacy-info-label">Phone</span>
                  <span className="privacy-info-value">07748 370419</span>
                </div>
                <div className="privacy-info-row">
                  <span className="privacy-info-label">ICO Registration</span>
                  <span className="privacy-info-value">[To be registered with ICO — required before launch]</span>
                </div>
              </div>
              <p className="privacy-p">If you have any questions about this Privacy Policy or how we handle your data, please contact us at contact@bysolum.com.</p>
            </section>

            {/* 2 */}
            <section className="privacy-section" id="p2">
              <span className="privacy-section-num">Section 02</span>
              <h2 className="privacy-section-title">Data We Collect</h2>
              <p className="privacy-p">We collect personal data when you interact with our website, place an order, create an account, or contact us. Here is what we collect and how:</p>

              <div className="privacy-h3">Information You Provide Directly</div>
              <ul className="privacy-list">
                <li><strong>Identity data:</strong> First name, last name</li>
                <li><strong>Contact data:</strong> Email address, phone number (if provided)</li>
                <li><strong>Delivery data:</strong> Delivery address, postcode</li>
                <li><strong>Account data:</strong> Email address used to log in via magic link</li>
                <li><strong>Communications:</strong> Any messages you send us by email or via contact forms</li>
              </ul>

              <div className="privacy-h3">Information Collected Automatically</div>
              <ul className="privacy-list">
                <li><strong>Usage data:</strong> Pages visited, time on site, referral source — collected via PostHog Analytics (see Section 8)</li>
                <li><strong>Technical data:</strong> IP address, browser type, device type — collected in anonymised or aggregated form only</li>
              </ul>

              <div className="privacy-h3">Information From Third Parties</div>
              <ul className="privacy-list">
                <li><strong>Payment data:</strong> Stripe processes your payment card details. We do not receive or store your full card number — only a tokenised reference and the last 4 digits for your records</li>
                <li><strong>Order data:</strong> Order reference, kit purchased, subscription status, renewal dates — provided by Stripe on completion of checkout</li>
              </ul>

              <p className="privacy-p">We do not collect special category data (such as health, biometric, or ethnicity data) and we do not knowingly collect data from children under 18.</p>
            </section>

            {/* 3 */}
            <section className="privacy-section" id="p3">
              <span className="privacy-section-num">Section 03</span>
              <h2 className="privacy-section-title">How We Use Your Data</h2>
              <table className="privacy-table">
                <thead>
                  <tr>
                    <th>Purpose</th>
                    <th>Data Used</th>
                    <th>Lawful Basis</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Process and fulfil your order</strong></td>
                    <td>Name, delivery address, email, order data</td>
                    <td>Contract</td>
                  </tr>
                  <tr>
                    <td><strong>Process payment</strong></td>
                    <td>Payment data (via Stripe)</td>
                    <td>Contract</td>
                  </tr>
                  <tr>
                    <td><strong>Manage your subscription</strong></td>
                    <td>Email, subscription status, renewal dates</td>
                    <td>Contract</td>
                  </tr>
                  <tr>
                    <td><strong>Send order confirmations and dispatch notifications</strong></td>
                    <td>Email, order data, tracking number</td>
                    <td>Contract</td>
                  </tr>
                  <tr>
                    <td><strong>Send subscription renewal reminders</strong></td>
                    <td>Email, renewal date, amount</td>
                    <td>Contract / Legitimate interest</td>
                  </tr>
                  <tr>
                    <td><strong>Respond to your enquiries and complaints</strong></td>
                    <td>Email, name, message content</td>
                    <td>Legitimate interest</td>
                  </tr>
                  <tr>
                    <td><strong>Comply with legal obligations</strong></td>
                    <td>Name, address, order data, financial records</td>
                    <td>Legal obligation</td>
                  </tr>
                  <tr>
                    <td><strong>Improve our website and understand usage</strong></td>
                    <td>Anonymised usage data (PostHog Analytics — no personal data)</td>
                    <td>Legitimate interest</td>
                  </tr>
                  <tr>
                    <td><strong>Send marketing emails</strong> (only if you opt in)</td>
                    <td>Email, name</td>
                    <td>Consent</td>
                  </tr>
                  <tr>
                    <td><strong>Detect and prevent fraud</strong></td>
                    <td>Order data, payment data, IP address</td>
                    <td>Legitimate interest / Legal obligation</td>
                  </tr>
                </tbody>
              </table>
              <p className="privacy-p">We will never use your data for purposes incompatible with those listed above without first obtaining your consent or establishing another lawful basis.</p>
            </section>

            {/* 4 */}
            <section className="privacy-section" id="p4">
              <span className="privacy-section-num">Section 04</span>
              <h2 className="privacy-section-title">Lawful Basis for Processing</h2>
              <p className="privacy-p">Under UK GDPR, we must have a lawful basis for processing your personal data. We rely on the following:</p>

              <div className="privacy-h3">Contract (Article 6(1)(b))</div>
              <p className="privacy-p">Processing necessary to fulfil our contract with you — your order, subscription, account, and related communications. Without this data, we cannot supply your products.</p>

              <div className="privacy-h3">Legal Obligation (Article 6(1)(c))</div>
              <p className="privacy-p">Processing required to comply with UK law, including HMRC tax and accounting obligations (we must retain financial records for 6 years), and UK Cosmetics Regulation compliance records.</p>

              <div className="privacy-h3">Legitimate Interests (Article 6(1)(f))</div>
              <p className="privacy-p">Processing where we have a legitimate business interest that does not override your rights — including fraud prevention, improving our service, sending renewal reminders, and responding to complaints. We have assessed that our legitimate interests do not override your rights in these cases.</p>

              <div className="privacy-h3">Consent (Article 6(1)(a))</div>
              <p className="privacy-p">Where we send you marketing emails, we rely on your explicit opt-in consent. You can withdraw consent at any time by clicking unsubscribe in any email or by contacting us at contact@bysolum.com. Withdrawal of consent does not affect the lawfulness of processing before withdrawal.</p>
            </section>

            {/* 5 */}
            <section className="privacy-section" id="p5">
              <span className="privacy-section-num">Section 05</span>
              <h2 className="privacy-section-title">Data Sharing</h2>
              <p className="privacy-p">We do not sell, rent, or trade your personal data. We share your data only with the following third parties, and only to the extent necessary to provide our service:</p>

              <table className="privacy-table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Purpose</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Stripe</strong></td>
                    <td>Payment processing, subscription billing, fraud detection</td>
                    <td>UK / EU / US (adequacy / SCCs)</td>
                  </tr>
                  <tr>
                    <td><strong>Supabase</strong></td>
                    <td>Database — stores customer records, orders, subscription status, addresses</td>
                    <td>EU (AWS eu-west-2 / eu-central-1)</td>
                  </tr>
                  <tr>
                    <td><strong>Resend</strong></td>
                    <td>Transactional email — order confirmations, renewal reminders</td>
                    <td>US (SCCs in place)</td>
                  </tr>
                  <tr>
                    <td><strong>Royal Mail</strong></td>
                    <td>Delivery — name and delivery address shared for dispatch</td>
                    <td>UK</td>
                  </tr>
                  <tr>
                    <td><strong>PostHog</strong></td>
                    <td>Website analytics and session recording — data hosted in EU, no cross-site tracking</td>
                    <td>EU</td>
                  </tr>
                  <tr>
                    <td><strong>AWS Amplify</strong></td>
                    <td>Website hosting</td>
                    <td>EU (eu-west-2, London)</td>
                  </tr>
                </tbody>
              </table>

              <p className="privacy-p">All third-party processors are bound by data processing agreements and are required to process your data only as directed by us and in accordance with applicable data protection law.</p>

              <div className="privacy-h3">Legal Disclosure</div>
              <p className="privacy-p">We may disclose your data to law enforcement, regulatory authorities, or courts where required by law or to protect the rights, property, or safety of SOLUM, our customers, or others.</p>
            </section>

            {/* 6 */}
            <section className="privacy-section" id="p6">
              <span className="privacy-section-num">Section 06</span>
              <h2 className="privacy-section-title">Data Retention</h2>
              <p className="privacy-p">We retain your personal data only for as long as necessary for the purposes for which it was collected, and in accordance with our legal obligations.</p>

              <table className="privacy-table">
                <thead>
                  <tr>
                    <th>Data Type</th>
                    <th>Retention Period</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Order and financial records</strong></td>
                    <td>6 years from end of tax year</td>
                    <td>HMRC legal obligation</td>
                  </tr>
                  <tr>
                    <td><strong>Active subscription data</strong></td>
                    <td>Duration of subscription + 3 years</td>
                    <td>Contract / disputes</td>
                  </tr>
                  <tr>
                    <td><strong>Account data</strong> (after cancellation)</td>
                    <td>3 years from last activity</td>
                    <td>Legitimate interest (re-activation, disputes)</td>
                  </tr>
                  <tr>
                    <td><strong>Email communications</strong></td>
                    <td>3 years</td>
                    <td>Legitimate interest</td>
                  </tr>
                  <tr>
                    <td><strong>Marketing consent records</strong></td>
                    <td>Until consent withdrawn + 3 years</td>
                    <td>Legal obligation (proof of consent)</td>
                  </tr>
                  <tr>
                    <td><strong>Website analytics</strong></td>
                    <td>24 months (aggregated, anonymised)</td>
                    <td>Legitimate interest</td>
                  </tr>
                  <tr>
                    <td><strong>Cosmetic product records (CPSR/PIF)</strong></td>
                    <td>10 years from last batch on market</td>
                    <td>UK Cosmetics Regulation legal obligation</td>
                  </tr>
                </tbody>
              </table>

              <p className="privacy-p">When data is no longer required, it is securely deleted or anonymised. You may request earlier deletion of your data — see Section 7 for your rights.</p>
            </section>

            {/* 7 */}
            <section className="privacy-section" id="p7">
              <span className="privacy-section-num">Section 07</span>
              <h2 className="privacy-section-title">Your Rights</h2>
              <p className="privacy-p">Under UK GDPR, you have the following rights in relation to your personal data:</p>

              <ul className="privacy-list">
                <li><strong>Right of access</strong> — you may request a copy of the personal data we hold about you (Subject Access Request)</li>
                <li><strong>Right to rectification</strong> — you may ask us to correct inaccurate or incomplete data</li>
                <li><strong>Right to erasure ("right to be forgotten")</strong> — you may ask us to delete your data where there is no overriding legal basis to retain it</li>
                <li><strong>Right to restriction</strong> — you may ask us to restrict processing of your data in certain circumstances</li>
                <li><strong>Right to data portability</strong> — you may request your data in a structured, machine-readable format</li>
                <li><strong>Right to object</strong> — you may object to processing based on legitimate interests or for direct marketing purposes</li>
                <li><strong>Right to withdraw consent</strong> — where processing is based on consent (e.g. marketing emails), you may withdraw consent at any time</li>
                <li><strong>Right not to be subject to automated decision-making</strong> — we do not use automated decision-making or profiling that produces legal or similarly significant effects</li>
              </ul>

              <div className="privacy-callout">
                <p><strong>How to exercise your rights:</strong> Email contact@bysolum.com with the subject "Data Rights Request" and your name and email address. We will respond within <strong>one calendar month</strong>, as required by UK GDPR. We may need to verify your identity before processing your request.</p>
              </div>

              <p className="privacy-p">Exercising your rights is free of charge. If a request is manifestly unfounded or excessive, we may charge a reasonable fee or decline to act, in which case we will explain why.</p>
            </section>

            {/* 8 */}
            <section className="privacy-section" id="p8">
              <span className="privacy-section-num">Section 08</span>
              <h2 className="privacy-section-title">Cookies &amp; Analytics</h2>

              <div className="privacy-h3">Analytics — PostHog</div>
              <p className="privacy-p">We use <strong>PostHog</strong> to understand how visitors use bysolum.co.uk. PostHog is a privacy-friendly analytics platform that:</p>
              <ul className="privacy-list">
                <li>Stores data exclusively in the EU (Frankfurt)</li>
                <li>Does not track visitors across sites</li>
                <li>Does not sell data to third parties</li>
                <li>Session recordings mask all form inputs by default (passwords and card numbers always masked)</li>
                <li>Is fully compliant with UK GDPR, PECR, and ePrivacy Directive</li>
              </ul>
              <p className="privacy-p">PostHog uses a first-party cookie for session continuity. This cookie does not track you across other websites and is used solely to understand how our own site is used. We do not display a cookie consent banner for first-party analytics cookies under PECR.</p>

              <div className="privacy-h3">Strictly Necessary Functionality</div>
              <p className="privacy-p">Our website may use minimal session-based storage (not tracking cookies) to maintain your login session and shopping cart state. This storage is essential for the website to function and does not require consent under PECR.</p>

              <div className="privacy-h3">Third-Party Scripts</div>
              <p className="privacy-p">Our checkout is processed by Stripe, which may use its own cookies and tracking for fraud prevention and security purposes. These are covered by Stripe's own privacy policy and are essential to the payment service.</p>
            </section>

            {/* 9 */}
            <section className="privacy-section" id="p9">
              <span className="privacy-section-num">Section 09</span>
              <h2 className="privacy-section-title">International Data Transfers</h2>
              <p className="privacy-p">Most of your data is processed within the UK or EU. Where data is transferred to countries outside the UK, we ensure appropriate safeguards are in place:</p>
              <ul className="privacy-list">
                <li><strong>Stripe</strong> — transfers to the US are covered by Standard Contractual Clauses (SCCs) and Stripe's participation in the UK International Data Transfer Agreement (IDTA) framework</li>
                <li><strong>Resend</strong> — email delivery platform based in the US; transfers are covered by Standard Contractual Clauses</li>
                <li><strong>Supabase</strong> — database hosted on AWS eu-west-2 (London) and eu-central-1 (Frankfurt). No transfer outside the EEA/UK</li>
                <li><strong>AWS Amplify</strong> — website hosted on AWS eu-west-2 (London). No transfer outside the UK</li>
              </ul>
              <p className="privacy-p">You may request a copy of the safeguards we rely on for international transfers by contacting contact@bysolum.com.</p>
            </section>

            {/* 10 */}
            <section className="privacy-section" id="p10">
              <span className="privacy-section-num">Section 10</span>
              <h2 className="privacy-section-title">Children</h2>
              <p className="privacy-p">Our website and products are intended for adults aged 18 and over. We do not knowingly collect personal data from anyone under the age of 18. If you believe we have inadvertently collected data from a child, please contact us at contact@bysolum.com and we will delete it promptly.</p>
            </section>

            {/* 11 */}
            <section className="privacy-section" id="p11">
              <span className="privacy-section-num">Section 11</span>
              <h2 className="privacy-section-title">Changes to This Policy</h2>
              <p className="privacy-p">We may update this Privacy Policy from time to time to reflect changes in the law, our data practices, or our third-party service providers. The current version will always be available at bysolum.co.uk/privacy, with the date of last update shown at the top.</p>
              <p className="privacy-p">For material changes that affect how we use your personal data, we will notify you by email before the changes take effect.</p>
            </section>

            {/* 12 */}
            <section className="privacy-section" id="p12">
              <span className="privacy-section-num">Section 12</span>
              <h2 className="privacy-section-title">Contact &amp; ICO</h2>
              <p className="privacy-p">If you have any questions or concerns about this Privacy Policy or how we handle your data, please contact us:</p>
              <div className="privacy-info-block">
                <div className="privacy-info-row">
                  <span className="privacy-info-label">Email</span>
                  <span className="privacy-info-value">contact@bysolum.com</span>
                </div>
                <div className="privacy-info-row">
                  <span className="privacy-info-label">Post</span>
                  <span className="privacy-info-value">SOLUM (Harsha Dandi), [Business address — to be completed]</span>
                </div>
                <div className="privacy-info-row">
                  <span className="privacy-info-label">Response Time</span>
                  <span className="privacy-info-value">Within 2 business days for general enquiries · Within 1 calendar month for data rights requests</span>
                </div>
              </div>

              <div className="privacy-h3">Right to Complain to the ICO</div>
              <p className="privacy-p">You have the right to lodge a complaint with the <strong>Information Commissioner's Office (ICO)</strong> — the UK's independent authority for data protection — if you believe we have not handled your personal data lawfully.</p>
              <div className="privacy-info-block">
                <div className="privacy-info-row">
                  <span className="privacy-info-label">ICO Website</span>
                  <span className="privacy-info-value">ico.org.uk</span>
                </div>
                <div className="privacy-info-row">
                  <span className="privacy-info-label">ICO Helpline</span>
                  <span className="privacy-info-value">0303 123 1113</span>
                </div>
                <div className="privacy-info-row">
                  <span className="privacy-info-label">ICO Post</span>
                  <span className="privacy-info-value">Information Commissioner's Office, Wycliffe House, Water Lane, Wilmslow, SK9 5AF</span>
                </div>
              </div>
              <p className="privacy-p">We would always prefer the opportunity to address your concern directly before you escalate to the ICO, so please contact us first.</p>
            </section>

          </main>
        </div>

        <SolumFooter />
      </div>
    </>
  );
}
