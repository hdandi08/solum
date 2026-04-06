import Nav from '../components/Nav';
import SolumFooter from '../components/SolumFooter';
import RitualPageHero from '../components/ritual/RitualPageHero';
import RitualTabBar from '../components/ritual/RitualTabBar';
import RitualStepList from '../components/ritual/RitualStepList';
import RitualShopCTA from '../components/ritual/RitualShopCTA';
import { useRitualTab } from '../hooks/useRitualTab';

const CSS = `.ritual-page{background:var(--black);min-height:100vh;padding-top:64px;}`;

export default function RitualPage() {
  const { activeTab, setActiveTab, steps, details, totalTime } = useRitualTab();

  return (
    <>
      <style>{CSS}</style>
      <Nav />
      <div className="ritual-page">
        <RitualPageHero />
        <RitualTabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          stepCount={steps.length}
          totalTime={totalTime}
        />
        <RitualStepList steps={steps} details={details} variant={activeTab} />
        <RitualShopCTA />
        <SolumFooter />
      </div>
    </>
  );
}
