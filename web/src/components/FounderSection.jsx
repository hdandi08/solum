const CSS = `
.founder-note{background:var(--black);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:40px 24px;}
.founder-note-inner{max-width:680px;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:16px;}
.founder-note-id{display:flex;align-items:center;justify-content:center;gap:10px;}
.founder-note-photo{width:36px;height:36px;border-radius:50%;object-fit:cover;object-position:center 15%;flex-shrink:0;filter:grayscale(30%) contrast(1.05);border:1.5px solid rgba(74,143,199,0.4);}
.founder-note-name{font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;color:#4a8fc7;}
.founder-note-quote{font-size:clamp(15px,2vw,17px);font-weight:300;color:rgba(240,236,226,0.78);line-height:1.75;font-style:italic;text-align:center;}

@media(min-width:640px){
  .founder-note{padding:48px 48px;}
}
`;

export default function FounderSection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="founder-note" data-track="founder">
        <div className="founder-note-inner reveal">
          <div className="founder-note-id">
            <img src="/harsha.jpg" alt="Harsha, Founder" className="founder-note-photo" />
            <div className="founder-note-name">Harsha, Founder · London</div>
          </div>
          <p className="founder-note-quote">
            "I spent years thinking body care was just body wash and shampoo. Still dealing with odour returning, dry skin, an itchy unclean scalp, areas I wasn't properly cleaning — especially with a busy routine and regular training. No one ever explained what to actually do. Everything in grooming focused on the face. The rest of the body was ignored. And I assumed proper body care had to be time consuming. It doesn't."
          </p>
        </div>
      </section>
    </>
  );
}
