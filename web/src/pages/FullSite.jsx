import { useEffect } from 'react';
import { capture } from '../lib/analytics.js';
import Nav from '../components/Nav.jsx';
import Hero from '../components/Hero.jsx';
import Marquee from '../components/Marquee.jsx';
import RitualInAction from '../components/RitualInAction.jsx';
import HomeCTABand from '../components/HomeCTABand.jsx';
import KitComparison from '../components/KitComparison.jsx';
import SystemSection from '../components/SystemSection.jsx';
import ProductLineup from '../components/ProductLineup.jsx';
import UnboxingFilm from '../components/UnboxingFilm.jsx';
import ProvenanceSection from '../components/ProvenanceSection.jsx';
import FullBleedBand from '../components/FullBleedBand.jsx';
import WhatSolumIs from '../components/WhatSolumIs.jsx';
import ProblemSection from '../components/ProblemSection.jsx';
import PressSection from '../components/PressSection.jsx';
import FounderSection from '../components/FounderSection.jsx';
import CredibilityStrip from '../components/CredibilityStrip.jsx';
import FAQ from '../components/FAQ.jsx';
import CTASection from '../components/CTASection.jsx';
import SolumFooter from '../components/SolumFooter.jsx';
import ABDevPanel from '../components/ABDevPanel.jsx';
import FounderChat from '../components/FounderChat.jsx';
import StickyKitBar from '../components/StickyKitBar.jsx';

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
        const name = e.target.dataset.track || e.target.id;
        if (e.isIntersecting && name) {
          capture('section_viewed', { section: name, page: 'homepage' });
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    const timer = setTimeout(() => {
      document.querySelectorAll('section[id], [data-track]').forEach(el => obs.observe(el));
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
    }, { threshold: 0.08, rootMargin: '0px 0px 200px 0px' });

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
      <ProblemSection />
      <PressSection />
      <KitComparison />
      <RitualInAction />
      <ProductLineup />
      <WhatSolumIs />
      <SystemSection />
      <HomeCTABand />
      <UnboxingFilm />
      <FAQ />
      <FounderSection />
      <FullBleedBand
        image="/products/feature/identity.webp"
        eyebrow="The Standard"
        head={<>Your body.<br />Finally done right.</>}
        sub="One system, head to toe. Built for the men who were never given one."
      />
      <CredibilityStrip />
      <ProvenanceSection />
      <CTASection />
      <SolumFooter />
      <ABDevPanel />
      <FounderChat />
      <StickyKitBar />
    </>
  );
}
