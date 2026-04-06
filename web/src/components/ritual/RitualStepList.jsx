import RitualStepCard from './RitualStepCard';

const CSS = `
.rp-steps{max-width:1400px;margin:0 auto;padding:0 48px 80px;}
@media(max-width:768px){.rp-steps{padding:0 24px 60px;}}
`;

export default function RitualStepList({ steps, details, variant }) {
  return (
    <>
      <style>{CSS}</style>
      <div className="rp-steps">
        {steps.map((step, i) => (
          <RitualStepCard
            key={step.num}
            position={i + 1}
            step={step}
            detail={details[step.num]}
            variant={variant}
          />
        ))}
      </div>
    </>
  );
}
