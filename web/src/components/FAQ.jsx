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
.faq-item.open .faq-a{max-height:340px;padding-bottom:24px;}
.faq-ask{display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:wrap;margin-top:44px;padding-top:40px;border-top:1px solid var(--line);}
.faq-ask-text{font-size:16px;color:var(--mist);font-weight:300;}
.faq-ask-btn{font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:.1em;background:none;color:var(--bone);border:1px solid rgba(240,236,226,0.25);padding:12px 30px;cursor:pointer;transition:border-color .2s,color .2s;}
.faq-ask-btn:hover{border-color:var(--blue);color:var(--blit);}
@media(max-width:768px){.faq-section{padding:60px 24px;}.faq-ask{flex-direction:column;gap:14px;}}
`;

const FAQS = [
  {
    q: "Isn't my normal body wash already doing the job?",
    a: 'No. A body wash lifts surface dirt, but it does not remove the dead skin that bacteria feed on, and it never properly reaches your back or scalp. That is why you stop feeling clean within hours. SOLUM is built to actually clear it, head to toe.',
  },
  {
    q: 'Will it actually work, and how fast?',
    a: 'Most men notice less odour and smoother skin within 2 to 3 weeks. In the first week, dead skin you did not know was there starts to roll off. It is a simple system you use daily, not a miracle in a bottle.',
  },
  {
    q: 'Is this for my face or my body?',
    a: 'Your body, neck down. It does not replace your face routine, shampoo or deodorant. It handles the 90% of your skin that every other brand ignores: exfoliation, back care, scalp health and daily moisturisation.',
  },
  {
    q: 'What is the difference between GROUND and RITUAL?',
    a: 'GROUND is the full daily clean: body wash, exfoliating mitt, back cloth, scalp massager, clay mask, lotion and intimate cleansing cloth. RITUAL adds the weekly finish, Argan Body Oil and the clay mixing bowl. If you want the complete system, choose RITUAL.',
  },
  {
    q: 'Can I buy the products individually?',
    a: 'No, and that is deliberate. The results come from the ritual, not any single product: the wash prepares the skin, the mitt clears it, the lotion seals it. One piece on its own does half a job, so we only ship complete kits. Together the products in RITUAL are worth £133. The kit is £85.',
  },
  {
    q: 'I have sensitive skin. Is it harsh?',
    a: 'No. The body wash is sulphate free and pH balanced, made to clean without stripping your skin. If you have known sensitivities, patch test first.',
  },
  {
    q: 'Is it complicated to use?',
    a: 'Not at all. The daily routine takes about 10 minutes in the shower you already take, and every kit comes with a step by step ritual card. There is a full walkthrough on the site too.',
  },
  {
    q: 'How much is delivery, and how fast will it arrive?',
    a: 'Free UK delivery, sent Royal Mail Tracked 48. Order before 6 PM on a working day and it is dispatched the next working day. Evening and weekend orders go the second working day. You will get tracking by email.',
  },
  {
    q: 'What if it is not for me?',
    a: 'You are covered by 14 day returns under UK consumer rights. Email us within 14 days of delivery and send it back for a refund.',
  },
  {
    q: 'What happens to my data?',
    a: 'We only use your details to process and deliver your order. Payments run through Stripe secure checkout, so we never see or store your card details, and we never sell your data. Full detail is in our privacy policy.',
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
      <section className="faq-section" data-track="faq">
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
          <div className="faq-ask reveal">
            <span className="faq-ask-text">Have more questions?</span>
            <button
              className="faq-ask-btn"
              onClick={() => {
                capture('faq_ask_clicked');
                window.dispatchEvent(new CustomEvent('solum:open-chat'));
              }}
            >
              Ask here
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
