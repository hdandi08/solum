import './AwardProof.css';

export default function AwardProof({ compact = false, kitName }) {
  return (
    <div className={`award-proof${compact ? ' award-proof-compact' : ''}`}>
      <span className="award-proof-seal">
        <img src="/awards/esquire-grooming-awards-2026-winner.png" alt="Esquire Grooming Awards 2026 Winner" width="1632" height="1612" />
      </span>
      <div className="award-proof-copy">
        <span className="award-proof-winner">{kitName && `${kitName} · `}Winner 2026</span>
        <strong>The Best Grooming Kit</strong>
        <span>Esquire Grooming Awards</span>
      </div>
    </div>
  );
}
