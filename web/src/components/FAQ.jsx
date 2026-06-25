import { useState } from 'react';
import { capture } from '../lib/analytics.js';

const CSS = `
.faq-section{background:var(--black);padding:80px 48px;border-top:1px solid var(--line);}
.faq-inner{max-width:900px;margin:0 auto;}
.faq-header{margin-bottom:48px;}
.faq-header .fq-sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:16px;}
.faq-header h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:.06em;color:var(--bone);line-height:1.05;}
.faq-item{border-bottom:1px solid var(--line);}
.faq-q{display:flex;justify-content:space-between;align-items:center;padding:24px 0;cursor:pointer;font-size:16px;letter-spacing:1px;color:var(--bone);font-weight:500;background:none;border:none;width:100%;text-align:left;}
.faq-q:hover{color:var(--blit);}
.faq-toggle{font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--blue);flex-shrink:0;margin-left:20px;transition:transform .25s;}
.faq-a{max-height:0;overflow:hidden;transition:max-height .35s ease,padding .35s;font-size:15px;color:var(--mist);font-weight:300;line-height:1.75;padding:0;}
.faq-item.open .faq-toggle{transform:rotate(45deg);}
.faq-item.open .faq-a{max-height:300px;padding-bottom:24px;}
@media(max-width:768px){.faq-section{padding:60px 24px;}}
`;

const FAQS = [
  {
    q: 'Am I paying the full kit price every month?',
    a: 'No. The first box price (£65 for GROUND, £85 for RITUAL) is a one-time payment. It includes all the physical tools: the mitt, the back cloth and the scalp massager. These last 6–12 months. Right now, SOLUM is a one-off purchase. Subscription, where consumables arrive automatically before you run out, is coming soon.',
  },
  {
    q: 'What is the difference between GROUND and RITUAL?',
    a: 'GROUND has 7 products: body wash, exfoliating mitt, back scrub cloth, scalp massager, Atlas clay mask, body lotion and cleansing cloth. That is the full daily ritual plus the weekly clay deep-clean. RITUAL adds two more: Argan Body Oil and the Clay Mixing Bowl, for the complete weekly oil ritual on top. If you want the complete system, RITUAL is the one.',
  },
  {
    q: 'Is this for my face or my body?',
    a: 'Your body. Entirely. SOLUM is the first serious body care system for men. It does not replace your face routine, shampoo or deodorant. It addresses everything from your neck down: exfoliation, back care, scalp health and daily moisturisation.',
  },
  {
    q: 'Why does it matter that I use the lotion within 3 minutes?',
    a: "Right after a shower, your skin is warm and still open. Moisture absorption is up to 70% higher in this window. Wait 15 minutes and you've largely missed it. The lotion sits on top rather than absorbing. The 3-minute rule is dermatology, not marketing.",
  },
  {
    q: 'Can I cancel or pause my subscription?',
    a: 'Subscription is not yet live, so there is nothing to cancel. When it launches, the answer will be yes. One click, no penalty, no phone calls, no retention flows designed to confuse you. We will not make it difficult.',
  },
  {
    q: 'Does it work as a gift?',
    a: 'Yes. The RITUAL kit is ideal for gifting. Rigid matte black box, steel blue foil strip, ribbon pull, ritual card face-up. It arrives as a complete, self-contained kit. No subscription required. The recipient can choose to join the subscription waitlist when it launches.',
  },
];

export default function FAQ() {
  const [openFaq, setOpenFaq] = useState(null);
  const toggle = (i) => {
    if (openFaq !== i) capture('faq_opened', { question: FAQS[i].q });
    setOpenFaq(openFaq === i ? null : i);
  };

  return (
    <>
      <style>{CSS}</style>
      <section className="faq-section">
        <div className="faq-inner">
          <div className="faq-header reveal">
            <div className="fq-sec-tag">Questions</div>
            <h2>Common<br />Questions.</h2>
          </div>
          {FAQS.map((f, i) => (
            <div key={i} className={`faq-item${openFaq === i ? ' open' : ''}`}>
              <button className="faq-q" onClick={() => toggle(i)}>
                {f.q}
                <span className="faq-toggle">+</span>
              </button>
              <div className="faq-a">{f.a}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
