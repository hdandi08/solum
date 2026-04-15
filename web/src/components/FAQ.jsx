import { useState } from 'react';

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
    a: 'No. The first box price (£65 for GROUND, £85 for RITUAL) is a one-time payment that includes physical tools lasting 6–12 months. After that, you pay £38 or £48/month for consumables only — body wash, lotion, bamboo cloth, and the tools that refresh on a quarterly or 6-monthly cycle. You never pay the setup price again.',
  },
  {
    q: 'What is the difference between GROUND and RITUAL?',
    a: 'GROUND has 7 products and covers the full daily and weekly ritual. RITUAL adds Argan Body Oil — a leave-on treatment applied after the weekly exfoliation that replaces your lotion on those days. If you want the complete system, RITUAL is the one.',
  },
  {
    q: 'What about SOVEREIGN?',
    a: 'SOVEREIGN replaces the Italy Towel Mitt with a hand-woven Turkish Kese Mitt from Istanbul, and adds Beidi Black Soap. It is the artisan tier — listed on site but not yet available to order. We will notify the early access list when it ships.',
  },
  {
    q: 'Is this for my face or my body?',
    a: 'Your body. Entirely. SOLUM is the first serious body care system for men — it does not replace your face routine, shampoo, or deodorant. It addresses skin from your neck down: exfoliation, back care, scalp health, and daily moisturisation. The 90% of your skin that most products ignore.',
  },
  {
    q: 'Why does it matter that I use the lotion within 3 minutes?',
    a: "Immediately after showering, your skin is warm and the outer layer is still hydrated. Moisture absorption is significantly higher during this window. Wait 15 minutes and you've largely missed it — the lotion sits on top rather than absorbing. The 3-minute rule is dermatology, not marketing.",
  },
  {
    q: 'Can I cancel or pause my subscription?',
    a: "Yes. Any time. One click. No penalty, no phone calls, no retention flows designed to confuse you. Skip a month if you're travelling. Pause indefinitely. We'd rather you come back when you're ready than resent us for charging you when you don't need it.",
  },
  {
    q: 'Does it work as a gift?',
    a: 'The RITUAL kit is ideal for gifting. Rigid matte black box, steel blue foil strip, ribbon pull, ritual card face-up. You can choose whether to include a subscription with it or let the recipient decide after they have tried it.',
  },
];

export default function FAQ() {
  const [openFaq, setOpenFaq] = useState(null);
  const toggle = (i) => setOpenFaq(openFaq === i ? null : i);

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
