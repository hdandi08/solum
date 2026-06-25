import { useEffect } from 'react';
import { capture } from '../lib/analytics.js';
import Nav from '../components/Nav.jsx';
import Hero from '../components/Hero.jsx';
import Marquee from '../components/Marquee.jsx';
import RitualInAction from '../components/RitualInAction.jsx';
import KitComparison from '../components/KitComparison.jsx';
import TruthSection from '../components/TruthSection.jsx';
import ProductLineup from '../components/ProductLineup.jsx';
import SubscriptionSection from '../components/SubscriptionSection.jsx';
import ProvenanceSection from '../components/ProvenanceSection.jsx';
import FullBleedBand from '../components/FullBleedBand.jsx';
import WhatSolumIs from '../components/WhatSolumIs.jsx';
import FounderSection from '../components/FounderSection.jsx';
import CredibilityStrip from '../components/CredibilityStrip.jsx';
import SocialProof from '../components/SocialProof.jsx';
import FAQ from '../components/FAQ.jsx';
import CTASection from '../components/CTASection.jsx';
import SolumFooter from '../components/SolumFooter.jsx';
import ABDevPanel from '../components/ABDevPanel.jsx';
import FathersDayPopup from '../components/FathersDayPopup.jsx';
import FounderChat from '../components/FounderChat.jsx';
import TrustBar from '../components/TrustBar.jsx';

const IS_FIRST_BATCH = import.meta.env.VITE_SITE_MODE === 'first_batch';

export default function FullSite() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
      }
    }
  }, []);

  // Scroll depth — fires once per milestone per visit
  useEffect(() => {
    const milestones = new Set();
    function onScroll() {
      const pct = Math.round(((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100);
      for (const m of [25, 50, 75, 100]) {
        if (pct >= m && !milestones.has(m)) {
          milestones.add(m);
          capture('scroll_depth', { percent: m, page: 'homepage' });
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Section viewed — fires once when each named section enters viewport
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && e.target.id) {
          capture('section_viewed', { section: e.target.id, page: 'homepage' });
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    const timer = setTimeout(() => {
      document.querySelectorAll('section[id]').forEach(el => obs.observe(el));
    }, 500);
    return () => { clearTimeout(timer); obs.disconnect(); };
  }, []);

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
      <FathersDayPopup />
      <Nav />
      <TrustBar />
      <Hero />
      <Marquee />
      <WhatSolumIs />
      <RitualInAction />
      <ProductLineup />
      <KitComparison />
      <TruthSection />
      <FullBleedBand
        image="/products/feature/identity.webp"
        eyebrow="The Standard"
        head={<>Your body.<br />Finally done right.</>}
        sub="One system, head to toe — built for the men who were never given one."
      />
      <CredibilityStrip />
      <SubscriptionSection />
      <ProvenanceSection />
      <SocialProof />
      <FounderSection />
      <FAQ />
      <CTASection />
      <SolumFooter />
      <ABDevPanel />
      <FounderChat />
    </>
  );
}
