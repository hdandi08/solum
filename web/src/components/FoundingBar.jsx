import { FOUNDING_LIMIT } from './WaitlistForm';

const CSS = `
.fb-bar {
  width: 100%;
  padding: 10px 0 0;
}
.fb-bar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 8px;
  flex-wrap: wrap;
}
.fb-bar-label {
  font-size: 12px;
  letter-spacing: 3px;
  text-transform: uppercase;
  font-weight: 600;
  color: rgba(240,236,226,0.6);
}
.fb-bar-live {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.fb-bar-dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #c8a96e;
  box-shadow: 0 0 6px #c8a96e;
  animation: fbPulse 1.6s ease-in-out infinite;
}
@keyframes fbPulse { 0%,100%{opacity:.5;transform:scale(1);} 50%{opacity:1;transform:scale(1.2);} }
.fb-bar-live-label {
  font-size: 10px;
  letter-spacing: 3px;
  text-transform: uppercase;
  font-weight: 700;
  color: #c8a96e;
}
.fb-track {
  width: 100%;
  height: 3px;
  background: rgba(240,236,226,0.1);
  overflow: hidden;
}
.fb-fill {
  height: 100%;
  background: linear-gradient(to right, #2e6da4, #4a8fc7);
  transition: width 0.8s ease;
}
`;

export default function FoundingBar({ count }) {
  const taken  = Math.min(FOUNDING_LIMIT, count || 0);
  const filled = Math.min(100, (taken / FOUNDING_LIMIT) * 100);
  const isFull = taken >= FOUNDING_LIMIT;

  return (
    <>
      <style>{CSS}</style>
      <div className="fb-bar">
        <div className="fb-bar-top">
          <div className="fb-bar-label">
            {isFull
              ? 'Launch Spots — Closed'
              : `${taken} / 100 Founding Member Spots Taken ↓`}
          </div>
          {!isFull && (
            <div className="fb-bar-live">
              <span className="fb-bar-dot" />
              <span className="fb-bar-live-label">Live</span>
            </div>
          )}
        </div>
        <div className="fb-track">
          <div className="fb-fill" style={{ width: `${filled}%` }} />
        </div>
      </div>
    </>
  );
}
