const CSS = `
.problem-section{background:linear-gradient(180deg,var(--black),#0b0d11);border-top:1px solid var(--line);padding:clamp(56px,6vw,76px) 48px;}
.problem-inner{max-width:1200px;margin:0 auto;}
.problem-header{max-width:820px;}
.problem-kicker{margin:0 0 14px;color:var(--blit);font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;}
.problem-header h2{margin:0;font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,3.4vw,44px);font-weight:400;letter-spacing:.055em;line-height:.98;color:var(--bone);}
.problem-benefits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px;margin:32px 0 0;padding:0;list-style:none;}
.problem-benefit{min-width:0;}
.problem-benefit-image{width:100%;aspect-ratio:4/3;overflow:hidden;background:var(--charcoal,#181C24);}
.problem-benefit-image img{display:block;width:100%;height:100%;object-fit:cover;}
.problem-benefit-copy{padding-top:20px;}
.problem-benefit-number{display:block;margin-bottom:8px;color:var(--blit);font-size:11px;font-weight:600;letter-spacing:2px;}
.problem-benefit h3{margin:0;font-family:'Barlow Condensed',sans-serif;font-size:clamp(24px,2.1vw,29px);font-weight:700;line-height:1.05;color:var(--bone);}
.problem-benefit p{margin:10px 0 0;font-size:17px;font-weight:300;line-height:1.4;color:var(--mist);max-width:280px;}
.problem-guidance{margin-top:36px;padding-top:28px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:20px;}
.problem-guidance h3{margin:0;font-family:'Barlow Condensed',sans-serif;font-size:clamp(25px,2.5vw,32px);font-weight:700;line-height:1.1;color:var(--bone);}
.problem-guidance p{margin:0;max-width:290px;font-size:17px;font-weight:300;line-height:1.4;color:var(--mist);}
@media(max-width:760px){
 .problem-section{padding:48px 24px;}
 .problem-header h2{font-size:clamp(32px,8.8vw,40px);}
 .problem-benefits{grid-template-columns:1fr;gap:24px;margin-top:28px;}
 .problem-benefit{display:grid;grid-template-columns:112px minmax(0,1fr);align-items:center;gap:20px;}
 .problem-benefit-image{aspect-ratio:4/5;}
 .problem-benefit-copy{padding-top:0;}
 .problem-benefit h3{font-size:24px;}
 .problem-benefit p{margin-top:8px;font-size:16px;line-height:1.35;}
 .problem-benefit-number{margin-bottom:6px;}
 .problem-guidance{margin-top:28px;padding-top:24px;display:block;}
 .problem-guidance h3{max-width:300px;font-size:28px;}
 .problem-guidance p{margin-top:10px;font-size:16px;}
}
@media(max-width:359px){
 .problem-section{padding-right:20px;padding-left:20px;}
 .problem-benefit{grid-template-columns:96px minmax(0,1fr);gap:16px;}
 .problem-benefit h3{font-size:22px;}
}
`;

const BENEFITS = [
  {
    number: '01',
    title: 'Cleanse without stripping',
    copy: 'Sulphate-free wash. Skin left comfortable.',
    image: '/products/01/still@600.webp',
    alt: 'SOLUM 01 Skin Protect Body Wash',
  },
  {
    number: '02',
    title: 'Reach the places you miss',
    copy: 'Your back, scalp and everywhere in between.',
    image: '/products/03/use-1.webp',
    alt: 'SOLUM 03 Back Scrub Cloth in use on the shoulder',
  },
  {
    number: '03',
    title: 'Softer, smoother skin',
    copy: 'Exfoliation. Nourishing hydration.',
    image: '/products/07/use-2.webp',
    alt: 'Close-up of SOLUM 07 Body Lotion',
  },
];

export default function ProblemSection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="problem-section" id="problem" data-track="problem" aria-labelledby="problem-heading">
        <div className="problem-inner">
          <div className="problem-header reveal">
            <div className="problem-kicker">The difference</div>
            <h2 id="problem-heading">You shower every day.<br />Make it count.</h2>
          </div>
          <ol className="problem-benefits">
            {BENEFITS.map((benefit) => (
              <li className="problem-benefit reveal" key={benefit.number}>
                <div className="problem-benefit-image">
                  <img src={benefit.image} alt={benefit.alt} width="600" height="750" loading="lazy" decoding="async" />
                </div>
                <div className="problem-benefit-copy">
                  <span className="problem-benefit-number" aria-hidden="true">{benefit.number}</span>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.copy}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="problem-guidance reveal">
            <h3>Know the steps. Find your rhythm.</h3>
            <p>One kit. Clear steps. A routine that becomes habit.</p>
          </div>
        </div>
      </section>
    </>
  );
}
