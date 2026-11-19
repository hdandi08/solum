import Nav from '../components/Nav.jsx';
import SolumFooter from '../components/SolumFooter.jsx';
import PressSection from '../components/PressSection.jsx';

const CSS = `
.awards-page{background:var(--black);padding-top:64px;color:var(--bone);}
.awards-intro{max-width:1180px;margin:0 auto;padding:64px 48px 32px;}
.awards-kicker{font-size:11px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:var(--blit);margin:0 0 20px;}
.awards-intro h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(40px,5vw,68px);font-weight:400;letter-spacing:.04em;line-height:1;margin:0 0 24px;max-width:850px;}
.awards-intro p{font-size:19px;font-weight:300;line-height:1.5;color:var(--mist);max-width:750px;margin:0 0 18px;}
.awards-intro a{color:var(--bone);text-underline-offset:4px;}
.awards-intro a:focus-visible{outline:2px solid var(--blit);outline-offset:4px;}
@media(max-width:760px){.awards-intro{padding:44px 24px 24px;}.awards-intro p{font-size:17px;}}
`;

export default function AwardsPage() {
  return (
    <>
      <style>{CSS}</style>
      <Nav />
      <main className="awards-page">
        <div className="awards-intro">
          <div className="awards-kicker">SOLUM · Men's body care · United Kingdom</div>
          <h1>SOLUM RITUAL wins Best Grooming Kit.</h1>
          <p>The SOLUM RITUAL Kit won Best Grooming Kit in the Esquire Grooming Awards 2026. The award was published in Esquire UK’s winners feature on 17 November 2026.</p>
          <p><a href="https://www.esquire.com/uk/style/grooming/g74246520/esquire-grooming-awards-2026/" target="_blank" rel="noreferrer">Read the official Esquire award announcement ↗</a></p>
          <p>SOLUM is the UK men’s body-care brand founded by Harsha Dandi. Its GROUND and RITUAL kits combine body-care products, tools and step-by-step guidance for a 10-minute daily routine and a 22-minute weekly reset. The signature fragrance is cedarwood and vetiver.</p>
          <p><a href="/buy?kit=ritual">Explore the award-winning RITUAL Kit</a> · <a href="/ritual">Watch the body-care rituals</a></p>
        </div>
        <PressSection showPublicationLogos />
      </main>
      <SolumFooter />
    </>
  );
}
