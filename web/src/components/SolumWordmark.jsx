export default function SolumWordmark({ href = '/', onClick } = {}) {
  return (
    <a href={href} className="solum-wordmark" onClick={onClick}>
      <img src="/solum-wordmark-clean.svg" alt="SOLUM" />
      <span className="solum-wordmark-tagline">Your body. Done right.</span>
    </a>
  );
}
