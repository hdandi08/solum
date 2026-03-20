import { useEffect } from 'react';
import Nav from '../components/Nav.jsx';
import Hero from '../components/Hero.jsx';
import Marquee from '../components/Marquee.jsx';
import TruthSection from '../components/TruthSection.jsx';
import KitComparison from '../components/KitComparison.jsx';
import ProductLineup from '../components/ProductLineup.jsx';
import RitualSection from '../components/RitualSection.jsx';
import SubscriptionSection from '../components/SubscriptionSection.jsx';
import LoyaltySection from '../components/LoyaltySection.jsx';
import ProvenanceSection from '../components/ProvenanceSection.jsx';
import SocialProof from '../components/SocialProof.jsx';
import FAQ from '../components/FAQ.jsx';
import CTASection from '../components/CTASection.jsx';
import SolumFooter from '../components/SolumFooter.jsx';

export default function FullSite() {
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 80);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

    const timer = setTimeout(() => {
      document.querySelectorAll('.reveal,.reveal-left').forEach(el => obs.observe(el));
    }, 100);

    return () => {
      clearTimeout(timer);
      obs.disconnect();
    };
  }, []);

  return (
    <>
      <Nav />
      <Hero />
      <Marquee />
      <TruthSection />
      <KitComparison />
      <ProductLineup />
      <RitualSection />
      <SubscriptionSection />
      <LoyaltySection />
      <ProvenanceSection />
      <SocialProof />
      <FAQ />
      <CTASection />
      <SolumFooter />
    </>
  );
}
