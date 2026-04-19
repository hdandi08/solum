import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function track(event, props) {
  if (window.plausible) window.plausible(event, { props });
}

// Common domains — used to suggest corrections for typos
const COMMON_DOMAINS = [
  'gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com',
  'me.com','live.com','aol.com','protonmail.com','googlemail.com',
  'yahoo.com','hotmail.com','live.com','btinternet.com',
  'sky.com','talktalk.net','virgin.net','virginmedia.com',
];

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function suggestEmail(email) {
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (!domain.includes('.')) return null;
  for (const correct of COMMON_DOMAINS) {
    if (domain === correct) return null; // already correct
    if (levenshtein(domain, correct) <= 2) return `${local}@${correct}`;
  }
  return null;
}

// Launch date: 8 weeks from 10 April 2026
const LAUNCH_DATE = new Date('2026-06-05T08:00:00Z');
const FOUNDING_LIMIT = 100;

function detectSource() {
  try {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source');
    if (utmSource) return { source: utmSource.toLowerCase(), medium: params.get('utm_medium') || null, campaign: params.get('utm_campaign') || null };
    const ref = document.referrer;
    if (!ref) return { source: 'direct', medium: null, campaign: null };
    const hostname = new URL(ref).hostname;
    if (hostname.includes('instagram.com')) return { source: 'instagram', medium: 'social', campaign: null };
    if (hostname.includes('google.')) return { source: 'google', medium: 'search', campaign: null };
    if (hostname.includes('facebook.com')) return { source: 'facebook', medium: 'social', campaign: null };
    if (hostname.includes('tiktok.com')) return { source: 'tiktok', medium: 'social', campaign: null };
    return { source: 'referral', medium: null, campaign: null };
  } catch {
    return { source: 'direct', medium: null, campaign: null };
  }
}

function getTimeLeft() {
  const diff = LAUNCH_DATE - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

const styles = `
  .cs-wrap {
    min-height: 100vh;
    background: #08090b;
    color: #f0ece2;
    font-family: 'Barlow Condensed', sans-serif;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  .cs-ghost {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(180px, 30vw, 420px);
    letter-spacing: -4px;
    color: transparent;
    -webkit-text-stroke: 1px rgba(46,109,164,0.055);
    pointer-events: none;
    user-select: none;
    white-space: nowrap;
    z-index: 0;
  }

  /* Top bar */
  .cs-topbar {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 48px;
    height: 64px;
    background: rgba(8,9,11,0.92);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(240,236,226,0.055);
  }
  .cs-logo {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 26px;
    letter-spacing: 0.18em;
    color: #f0ece2;
  }
  .cs-badge {
    font-size: 13px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #4a8fc7;
    border: 1px solid rgba(74,143,199,0.4);
    padding: 6px 14px;
  }

  /* Hero */
  .cs-main {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 80px 24px 40px;
    text-align: center;
    gap: 20px;
  }
  .cs-eyebrow {
    font-size: 13px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.75);
    margin-bottom: 0;
    font-weight: 600;
  }
  .cs-headline {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(42px, 6vw, 72px);
    letter-spacing: 0.04em;
    line-height: 0.95;
    color: #f0ece2;
    margin-bottom: 0;
  }
  .cs-headline em { color: #4a8fc7; font-style: normal; }
  .cs-subhead {
    font-size: clamp(17px, 2.2vw, 20px);
    font-weight: 300;
    color: rgba(240,236,226,0.85);
    max-width: 540px;
    line-height: 1.75;
    margin-bottom: 0;
  }

  /* Countdown */
  .cs-countdown-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
    gap: 8px;
  }
  .cs-countdown-label {
    font-size: 13px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.65);
    font-weight: 600;
  }
  .cs-countdown {
    display: flex;
    gap: 0;
    border: 1px solid rgba(46,109,164,0.25);
  }
  .cs-cd-unit {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 16px;
    border-right: 1px solid rgba(46,109,164,0.15);
    min-width: 56px;
  }
  .cs-cd-unit:last-child { border-right: none; }
  .cs-cd-num {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    letter-spacing: 0.05em;
    color: #4a8fc7;
    line-height: 1;
  }
  .cs-cd-label {
    font-size: 13px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.65);
    font-weight: 600;
    margin-top: 3px;
  }

  /* Founding scarcity bar */
  .cs-founding-bar {
    width: 100%;
    max-width: 480px;
    background: rgba(26,74,120,0.12);
    border: 1px solid rgba(46,109,164,0.35);
    padding: 12px 16px;
    margin-bottom: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .cs-founding-bar-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .cs-founding-bar-label {
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #4a8fc7;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-color: rgba(74,143,199,0.5);
  }
  .cs-founding-count {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 20px;
    letter-spacing: 0.08em;
    color: #f0ece2;
  }
  .cs-founding-count em { color: #4a8fc7; font-style: normal; }
  .cs-progress-track {
    width: 100%;
    height: 3px;
    background: rgba(200,169,110,0.2);
    position: relative;
  }
  .cs-progress-fill {
    position: absolute;
    top: 0; left: 0;
    height: 100%;
    background: #c8a96e;
    transition: width 0.6s ease;
  }
  .cs-founding-bar-note {
    display: none;
  }
  .cs-founding-bar-note strong { color: #f0ece2; font-weight: 600; }

  /* Hero timeline */
  .cs-timeline {
    width: 100%;
    max-width: 460px;
    display: flex;
    position: relative;
    padding-top: 0;
  }
  .cs-timeline::before {
    content: '';
    position: absolute;
    top: 15px;
    left: calc(100% / 6);
    right: calc(100% / 6);
    height: 1px;
    background: linear-gradient(90deg, rgba(46,109,164,0.5), rgba(74,143,199,0.8), rgba(46,109,164,0.5));
    z-index: 0;
  }
  .cs-tl-node {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    position: relative;
  }
  .cs-tl-dot { display: none; }
  .cs-tl-badge {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #08090b;
    border: 1.5px solid rgba(74,143,199,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 14px;
    letter-spacing: 0.04em;
    color: #4a8fc7;
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }
  .cs-tl-marker {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 13px;
    letter-spacing: 0.06em;
    color: rgba(74,143,199,0.75);
    line-height: 1;
    text-align: center;
  }
  .cs-tl-text {
    font-size: 13px;
    font-weight: 600;
    color: #f0ece2;
    line-height: 1.35;
    letter-spacing: 0.1px;
    text-align: center;
    padding: 0 4px;
  }
  .cs-tl-sub { display: none; }

  /* Outcomes */
  .cs-outcomes {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 64px 24px 56px;
    border-bottom: 1px solid rgba(240,236,226,0.055);
  }
  .cs-outcomes-eyebrow {
    font-size: 13px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #4a8fc7;
    font-weight: 600;
    margin-bottom: 10px;
  }
  .cs-outcomes-heading {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(28px, 4vw, 40px);
    letter-spacing: 0.06em;
    color: #f0ece2;
    text-align: center;
    line-height: 1;
    margin-bottom: 44px;
  }
  .cs-outcomes-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    width: 100%;
    max-width: 900px;
    border: 1px solid rgba(240,236,226,0.07);
  }
  .cs-outcome {
    padding: 28px 24px 32px;
    border-right: 1px solid rgba(240,236,226,0.07);
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: relative;
  }
  .cs-outcome:last-child { border-right: none; }
  .cs-outcome-marker {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(40px, 5vw, 56px);
    letter-spacing: 0.03em;
    color: #2e6da4;
    line-height: 1;
  }
  .cs-outcome-marker em {
    color: #4a8fc7;
    font-style: normal;
  }
  .cs-outcome-title {
    font-size: 15px;
    font-weight: 700;
    color: #f0ece2;
    letter-spacing: 0.3px;
    line-height: 1.3;
  }
  .cs-outcome-body {
    font-size: 14px;
    font-weight: 300;
    color: rgba(240,236,226,0.72);
    line-height: 1.6;
  }
  .cs-outcome-tag {
    margin-top: auto;
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    font-weight: 600;
    color: #4a8fc7;
  }

  @media (max-width: 768px) {
    .cs-outcomes-grid {
      grid-template-columns: 1fr 1fr;
    }
    .cs-outcome:nth-child(2) { border-right: none; }
    .cs-outcome:nth-child(3) { border-top: 1px solid rgba(240,236,226,0.07); }
    .cs-outcome:nth-child(4) { border-top: 1px solid rgba(240,236,226,0.07); border-right: none; }
  }

  /* Email form */
  .cs-form-wrap {
    width: 100%;
    max-width: 480px;
    margin-bottom: 0;
  }
  .cs-offer {
    font-size: 13px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #4a8fc7;
    font-weight: 600;
    margin-bottom: 12px;
  }
  .cs-offer-bar {
    background: rgba(46,109,164,0.1);
    border: 1px solid rgba(46,109,164,0.25);
    padding: 12px 20px;
    margin-bottom: 16px;
    font-size: 15px;
    color: #f0ece2;
    font-weight: 500;
    letter-spacing: 0.5px;
  }
  .cs-offer-bar strong { color: #4a8fc7; }

  /* Form inputs */
  .cs-form-placeholder { display: flex; flex-direction: column; gap: 0; }
  .cs-input {
    background: rgba(24,28,36,0.8);
    border: 1px solid rgba(46,109,164,0.35);
    border-bottom: none;
    color: #f0ece2;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 15px;
    letter-spacing: 1px;
    padding: 16px 20px;
    outline: none;
    width: 100%;
    box-sizing: border-box;
  }
  .cs-input::placeholder { color: rgba(240,236,226,0.3); }
  .cs-input:focus { border-color: rgba(74,143,199,0.6); }
  .cs-submit {
    width: 100%;
    background: #2e6da4;
    color: #f0ece2;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 16px;
    letter-spacing: 3px;
    padding: 13px 28px;
    border: none;
    cursor: crosshair;
    transition: background 0.2s;
  }
  .cs-submit:hover:not(:disabled) { background: #4a8fc7; }
  .cs-submit:disabled { background: #1a4a78; cursor: default; opacity: 0.8; }
  .cs-submit.sent { background: #1a4a78; cursor: default; }
  .cs-typo-suggest {
    background: rgba(74,143,199,0.08);
    border: 1px solid rgba(74,143,199,0.3);
    border-top: none;
    padding: 10px 16px;
    font-size: 13px;
    color: rgba(240,236,226,0.85);
    letter-spacing: 0.3px;
  }
  .cs-typo-btn {
    background: none;
    border: none;
    color: #4a8fc7;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.3px;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
  }
  .cs-typo-btn:hover { color: #f0ece2; }
  .cs-form-error {
    font-size: 13px;
    letter-spacing: 1px;
    color: #e55a5a;
    margin-top: 8px;
  }
  .cs-scarcity-hint {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #4a8fc7;
    letter-spacing: 0.5px;
    margin-top: 12px;
    text-align: center;
    text-decoration: none;
    transition: color 0.2s;
  }
  .cs-scarcity-hint:hover { color: #f0ece2; }
  .cs-privacy {
    font-size: 13px;
    letter-spacing: 1.5px;
    color: rgba(240,236,226,0.7);
    text-transform: uppercase;
    margin-top: 8px;
  }

  /* Success state */
  .cs-success {
    background: rgba(46,109,164,0.08);
    border: 1px solid rgba(46,109,164,0.35);
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
  }
  .cs-success-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 26px;
    letter-spacing: 0.08em;
    color: #f0ece2;
  }
  .cs-success-num {
    color: #4a8fc7;
    font-style: normal;
  }
  .cs-success-body {
    font-size: 14px;
    font-weight: 300;
    color: rgba(240,236,226,0.82);
    line-height: 1.6;
  }

  /* Founding member section */
  .cs-founding {
    position: relative;
    z-index: 1;
    padding: 72px 48px;
    border-top: 1px solid rgba(240,236,226,0.055);
    border-bottom: 1px solid rgba(240,236,226,0.055);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    background: rgba(26,74,120,0.04);
  }
  .cs-founding-eyebrow {
    font-size: 11px;
    letter-spacing: 6px;
    text-transform: uppercase;
    color: #4a8fc7;
    font-weight: 600;
    margin-bottom: 20px;
  }
  .cs-founding-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(40px, 5.5vw, 68px);
    letter-spacing: 0.06em;
    color: #f0ece2;
    line-height: 1;
    margin-bottom: 16px;
  }
  .cs-founding-title em { color: #4a8fc7; font-style: normal; }
  .cs-founding-sub {
    font-size: clamp(16px, 2vw, 18px);
    font-weight: 300;
    color: rgba(240,236,226,0.85);
    max-width: 580px;
    line-height: 1.6;
    margin-bottom: 52px;
  }
  .cs-founding-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
    max-width: 860px;
    width: 100%;
    border: 1px solid rgba(240,236,226,0.07);
    margin-bottom: 48px;
  }
  .cs-founding-item {
    padding: 32px 28px;
    border-right: 1px solid rgba(240,236,226,0.07);
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .cs-founding-item:last-child { border-right: none; }
  .cs-founding-icon {
    font-size: 24px;
    line-height: 1;
  }
  .cs-founding-item-label {
    font-size: 11px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #4a8fc7;
    font-weight: 600;
  }
  .cs-founding-item-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 24px;
    letter-spacing: 0.06em;
    color: #f0ece2;
    line-height: 1;
  }
  .cs-founding-item-body {
    font-size: 14px;
    font-weight: 300;
    color: rgba(240,236,226,0.82);
    line-height: 1.6;
  }
  .cs-founding-note {
    font-size: 14px;
    font-weight: 400;
    color: rgba(240,236,226,0.6);
    letter-spacing: 0.5px;
    max-width: 520px;
    line-height: 1.6;
  }
  .cs-founding-note strong { color: rgba(240,236,226,0.88); font-weight: 600; }

  /* Founding infographics */
  .cs-f-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:0;width:100%;max-width:860px;border:1px solid rgba(240,236,226,0.07);margin-bottom:40px;}
  .cs-f-stat{padding:20px 16px;border-right:1px solid rgba(240,236,226,0.07);text-align:center;}
  .cs-f-stat:last-child{border-right:none;}
  .cs-f-stat-num{font-family:'Bebas Neue',sans-serif;font-size:clamp(32px,4vw,48px);letter-spacing:.02em;line-height:1;color:#F0ECE2;margin-bottom:5px;}
  .cs-f-stat-num em{color:#4A8FC7;font-style:normal;}
  .cs-f-stat-lbl{font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;color:rgba(240,236,226,0.50);}

  /* Equity scenario bars */
  .cs-eq-bars{margin-top:16px;display:flex;flex-direction:column;gap:8px;}
  .cs-eq-bar-row{display:flex;align-items:center;gap:10px;}
  .cs-eq-bar-label{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(240,236,226,0.45);width:80px;flex-shrink:0;}
  .cs-eq-bar-track{flex:1;height:4px;background:rgba(240,236,226,0.07);}
  .cs-eq-bar-fill{height:100%;background:linear-gradient(90deg,#1A4A78,#4A8FC7);transition:width 1s ease;}
  .cs-eq-bar-val{font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:.04em;color:#4A8FC7;width:52px;text-align:right;flex-shrink:0;}
  .cs-eq-unicorn{margin-top:10px;padding:8px 12px;background:rgba(74,143,199,0.08);border:1px solid rgba(74,143,199,0.2);display:flex;align-items:center;justify-content:space-between;}
  .cs-eq-unicorn-lbl{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(240,236,226,0.55);}
  .cs-eq-unicorn-val{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:.04em;color:#F0ECE2;}

  /* Price lock visual */
  .cs-price-vis{margin-top:16px;display:flex;flex-direction:column;gap:6px;}
  .cs-price-row{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;}
  .cs-price-row.others{background:rgba(240,236,226,0.03);border:1px solid rgba(240,236,226,0.07);}
  .cs-price-row.yours{background:rgba(46,109,164,0.12);border:1px solid rgba(46,109,164,0.35);}
  .cs-price-who{font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;color:rgba(240,236,226,0.45);}
  .cs-price-who.yours{color:#4A8FC7;}
  .cs-price-amount{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.04em;color:rgba(240,236,226,0.35);text-decoration:line-through;}
  .cs-price-amount.yours{color:#F0ECE2;text-decoration:none;}
  .cs-price-badge{font-size:10px;letter-spacing:3px;text-transform:uppercase;font-weight:700;color:#4A8FC7;background:rgba(74,143,199,0.12);padding:3px 8px;}

  /* Mission flow */
  .cs-flow{margin-top:16px;display:flex;align-items:center;gap:0;}
  .cs-flow-step{flex:1;text-align:center;padding:12px 8px;background:rgba(240,236,226,0.03);border:1px solid rgba(240,236,226,0.07);}
  .cs-flow-step-num{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:.04em;color:#4A8FC7;line-height:1;}
  .cs-flow-step-lbl{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(240,236,226,0.50);margin-top:3px;}
  .cs-flow-arrow{color:rgba(74,143,199,0.50);font-size:14px;padding:0 4px;flex-shrink:0;}

  /* Provenance */
  .cs-provenance {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border-top: 1px solid rgba(240,236,226,0.055);
    border-bottom: 1px solid rgba(240,236,226,0.055);
  }
  .cs-prov-item {
    padding: 36px 28px;
    border-right: 1px solid rgba(240,236,226,0.055);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .cs-prov-item:last-child { border-right: none; }
  .cs-prov-flag { font-size: 28px; line-height: 1; }
  .cs-prov-country {
    font-size: 14px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #2e6da4;
    font-weight: 600;
  }
  .cs-prov-tradition {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 24px;
    letter-spacing: 0.06em;
    color: #f0ece2;
    line-height: 1;
  }
  .cs-prov-body {
    font-size: 15px;
    font-weight: 300;
    color: rgba(240,236,226,0.88);
    line-height: 1.6;
  }
  .cs-prov-products {
    font-size: 13px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(46,109,164,0.9);
    font-weight: 600;
    margin-top: 4px;
  }

  /* Ritual */
  .cs-ritual {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-bottom: 1px solid rgba(240,236,226,0.055);
  }
  .cs-ritual-col {
    padding: 52px 44px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }
  .cs-ritual-col:first-child { border-right: 1px solid rgba(240,236,226,0.055); }
  .cs-ritual-header { display: flex; flex-direction: column; gap: 8px; }
  .cs-ritual-tag {
    font-size: 13px;
    letter-spacing: 4px;
    text-transform: uppercase;
    font-weight: 600;
  }
  .cs-ritual-tag.daily { color: #2e6da4; }
  .cs-ritual-tag.weekly { color: #c8a96e; }
  .cs-ritual-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 40px;
    letter-spacing: 0.06em;
    color: #f0ece2;
    line-height: 1;
  }
  .cs-ritual-time {
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.65);
    font-weight: 600;
  }
  .cs-ritual-steps { display: flex; flex-direction: column; gap: 2px; }
  .cs-ritual-step {
    display: flex;
    align-items: baseline;
    gap: 16px;
    padding: 14px 0;
    border-bottom: 1px solid rgba(240,236,226,0.04);
  }
  .cs-ritual-step:last-child { border-bottom: none; }
  .cs-step-num {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 20px;
    letter-spacing: 0.05em;
    min-width: 24px;
  }
  .cs-step-num.daily { color: #2e6da4; }
  .cs-step-num.weekly { color: #c8a96e; }
  .cs-step-body { display: flex; flex-direction: column; gap: 4px; flex: 1; }
  .cs-step-name {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 1px;
    color: #f0ece2;
    text-transform: uppercase;
  }
  .cs-step-note {
    font-size: 13px;
    font-weight: 300;
    color: rgba(240,236,226,0.78);
    line-height: 1.5;
  }
  .cs-step-prod {
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    font-weight: 600;
    white-space: nowrap;
  }
  .cs-step-prod.daily { color: #4a8fc7; }
  .cs-step-prod.weekly { color: #c8a96e; }

  /* Subscription section */
  .cs-sub {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-bottom: 1px solid rgba(240,236,226,0.055);
  }
  .cs-sub-left {
    padding: 64px 48px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 20px;
    border-right: 1px solid rgba(240,236,226,0.055);
  }
  .cs-sub-tag {
    font-size: 13px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #4a8fc7;
    font-weight: 600;
  }
  .cs-sub-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(36px, 4vw, 56px);
    letter-spacing: 0.06em;
    color: #f0ece2;
    line-height: 1;
  }
  .cs-sub-body {
    font-size: 16px;
    font-weight: 300;
    color: rgba(240,236,226,0.85);
    line-height: 1.65;
    max-width: 420px;
  }
  .cs-sub-right {
    padding: 64px 48px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
  }
  .cs-sub-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 20px 0;
    border-bottom: 1px solid rgba(240,236,226,0.055);
  }
  .cs-sub-item:last-child { border-bottom: none; }
  .cs-sub-item-tag {
    font-size: 11px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #2e6da4;
    font-weight: 600;
  }
  .cs-sub-item-title {
    font-size: 18px;
    font-weight: 600;
    color: #f0ece2;
    letter-spacing: 0.5px;
  }
  .cs-sub-item-body {
    font-size: 14px;
    font-weight: 300;
    color: rgba(240,236,226,0.78);
    line-height: 1.5;
  }

  /* Second CTA */
  .cs-cta2 {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80px 24px;
    text-align: center;
    border-bottom: 1px solid rgba(240,236,226,0.055);
  }
  .cs-cta2-headline {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(36px, 5vw, 60px);
    letter-spacing: 0.06em;
    color: #f0ece2;
    line-height: 1;
    margin-bottom: 12px;
  }
  .cs-cta2-sub {
    font-size: 16px;
    font-weight: 300;
    color: rgba(240,236,226,0.78);
    margin-bottom: 40px;
    letter-spacing: 0.3px;
  }

  /* Product pills */
  .cs-products-wrap {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px 24px;
    border-bottom: 1px solid rgba(240,236,226,0.055);
  }
  .cs-products-label {
    font-size: 12px;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.6);
    font-weight: 600;
    margin-bottom: 20px;
  }
  .cs-products { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 640px; }
  .cs-pill {
    font-size: 13px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.88);
    border: 1px solid rgba(240,236,226,0.12);
    padding: 8px 16px;
    font-weight: 600;
  }
  .cs-pill span { color: #2e6da4; margin-right: 6px; }

  /* Marquee */
  .cs-marquee-wrap {
    position: relative;
    z-index: 1;
    overflow: hidden;
    padding: 14px 0;
    background: rgba(24,28,36,0.6);
    border-bottom: 1px solid rgba(240,236,226,0.055);
  }
  .cs-marquee-track {
    display: flex;
    animation: marquee 28s linear infinite;
    width: max-content;
  }
  .cs-marquee-item {
    font-size: 13px;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.82);
    font-weight: 600;
    padding: 0 28px;
    white-space: nowrap;
  }
  .cs-marquee-dot {
    display: inline-block;
    width: 3px; height: 3px;
    background: #2e6da4;
    border-radius: 50%;
    vertical-align: middle;
    margin-left: 28px;
  }
  @keyframes livePulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }
  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  /* Footer */
  .cs-footer {
    position: relative;
    z-index: 1;
    padding: 32px 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .cs-footer-logo {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px;
    letter-spacing: 0.18em;
    color: rgba(240,236,226,0.88);
  }
  .cs-footer-contact {
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.7);
    text-decoration: none;
    transition: color 0.2s;
  }
  .cs-footer-contact:hover { color: #f0ece2; }
  .cs-footer-founding {
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #4a8fc7;
    text-decoration: none;
    transition: color 0.2s;
    font-weight: 600;
  }
  .cs-footer-founding:hover { color: #7ab8e0; }
  .cs-footer-ig {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #f0ece2;
    text-decoration: none;
    font-weight: 600;
    border: 1px solid rgba(46,109,164,0.5);
    padding: 10px 16px;
    background: rgba(46,109,164,0.08);
    transition: border-color 0.2s, background 0.2s;
  }
  .cs-footer-ig:hover { border-color: #4a8fc7; background: rgba(74,143,199,0.13); }
  .cs-footer-ig svg { width: 17px; height: 17px; color: #4a8fc7; flex-shrink: 0; }

  /* Glow */
  .cs-glow {
    position: fixed;
    bottom: -200px; left: 50%;
    transform: translateX(-50%);
    width: 600px; height: 400px;
    background: radial-gradient(ellipse, rgba(46,109,164,0.12) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  /* Box reveal */
  .cs-box-reveal {
    position: relative;
    z-index: 1;
    background: #0c0e12;
    border-bottom: 1px solid rgba(240,236,226,0.055);
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
  }
  .cs-box-img {
    width: 100%;
    max-width: 960px;
    display: block;
    object-fit: cover;
  }
  .cs-box-caption {
    padding: 14px 24px 20px;
    font-size: 11px;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.40);
    font-weight: 600;
    text-align: center;
  }

  @media (max-width: 768px) {
    .cs-topbar { padding: 0 20px; }
    .cs-main { padding: 90px 24px 60px; gap: 16px; }
    .cs-eyebrow { font-size: 13px; letter-spacing: 3px; margin-bottom: 0; }
    .cs-headline { font-size: 34px; line-height: 0.95; margin-bottom: 0; }
    .cs-subhead { font-size: 15px; line-height: 1.6; margin-bottom: 0; }
    .cs-founding-bar { padding: 12px 16px; gap: 8px; }
    .cs-founding-bar-note { display: none; }
    .cs-privacy { font-size: 13px; margin-top: 10px; }
    .cs-scarcity-hint { font-size: 13px; margin-top: 10px; }
    .cs-countdown { flex-wrap: wrap; }
    .cs-countdown-wrap { gap: 6px; }
    .cs-cd-unit { min-width: 60px; padding: 10px 14px; }
    .cs-cd-num { font-size: 30px; }
    .cs-cd-label { font-size: 13px; }
    .cs-stats-intro { font-size: 15px; }
    .cs-stats { flex-direction: column; }
    .cs-stat { border-right: none; border-bottom: 1px solid rgba(240,236,226,0.07); }
    .cs-stat:last-child { border-bottom: none; }
    .cs-stat-num { font-size: 44px; }
    .cs-stat-label { font-size: 14px; }
    .cs-founding { padding: 52px 24px; }
    .cs-founding-grid { grid-template-columns: 1fr; }
    .cs-founding-item { border-right: none; border-bottom: 1px solid rgba(240,236,226,0.07); }
    .cs-founding-item:last-child { border-bottom: none; }
    .cs-f-stats { grid-template-columns: repeat(2,1fr); }
    .cs-f-stat:nth-child(2) { border-right: none; }
    .cs-f-stat:nth-child(3) { border-top: 1px solid rgba(240,236,226,0.07); }
    .cs-f-stat:nth-child(4) { border-top: 1px solid rgba(240,236,226,0.07); border-right: none; }
    .cs-flow { flex-direction: column; gap: 4px; }
    .cs-flow-arrow { transform: rotate(90deg); }
    .cs-provenance { grid-template-columns: 1fr 1fr; }
    .cs-prov-item { padding: 28px 20px; }
    .cs-prov-item:nth-child(2) { border-right: none; }
    .cs-prov-item:nth-child(3) { border-top: 1px solid rgba(240,236,226,0.055); }
    .cs-prov-item:nth-child(4) { border-top: 1px solid rgba(240,236,226,0.055); border-right: none; }
    .cs-prov-tradition { font-size: 22px; }
    .cs-prov-body { font-size: 14px; }
    .cs-ritual { grid-template-columns: 1fr; }
    .cs-ritual-col:first-child { border-right: none; border-bottom: 1px solid rgba(240,236,226,0.055); }
    .cs-ritual-col { padding: 40px 24px; }
    .cs-ritual-title { font-size: 36px; }
    .cs-step-name { font-size: 15px; }
    .cs-step-note { font-size: 14px; }
    .cs-sub { grid-template-columns: 1fr; }
    .cs-sub-left { border-right: none; border-bottom: 1px solid rgba(240,236,226,0.055); padding: 48px 24px; }
    .cs-sub-right { padding: 40px 24px; }
    .cs-sub-body { font-size: 16px; }
    .cs-sub-item-title { font-size: 17px; }
    .cs-sub-item-body { font-size: 15px; }
    .cs-cta2-sub { font-size: 16px; }
    .cs-footer { flex-direction: column; gap: 16px; text-align: center; padding: 24px 20px; }
  }
`;

const MARQUEE_ITEMS = [
  'The Ritual Men Were Never Taught',
  'UK · Korea · Morocco · Turkey',
  '10 Minutes Daily',
  '8 Products · One System',
  'Body Care — Not Face. Not Hair.',
  'Monthly. Automatic. Never Run Out.',
  'The Ritual Men Were Never Taught',
  'UK · Korea · Morocco · Turkey',
  '10 Minutes Daily',
  '8 Products · One System',
  'Body Care — Not Face. Not Hair.',
  'Monthly. Automatic. Never Run Out.',
];

const PRODUCTS = [
  { num: '01', name: 'Body Wash' },
  { num: '02', name: 'Italy Towel Mitt' },
  { num: '03', name: 'Exfoliating Cloth' },
  { num: '04', name: 'Scalp Massager' },
  { num: '05', name: 'Atlas Clay' },
  { num: '06', name: 'Body Oil' },
  { num: '07', name: 'Body Lotion' },
  { num: '08', name: 'Bamboo Cloth' },
];

function pad(n) {
  return String(n).padStart(2, '0');
}

function Countdown() {
  const [time, setTime] = useState(getTimeLeft());

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="cs-countdown-wrap">
      <div className="cs-countdown-label">Launching in</div>
      <div className="cs-countdown">
        {[
          { val: time.days, label: 'Days' },
          { val: time.hours, label: 'Hours' },
          { val: time.minutes, label: 'Min' },
          { val: time.seconds, label: 'Sec' },
        ].map(({ val, label }) => (
          <div key={label} className="cs-cd-unit">
            <div className="cs-cd-num">{pad(val)}</div>
            <div className="cs-cd-label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WaitlistForm({ label = 'Claim Founding Member Spot', onSuccess, formId = 'unknown' }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [position, setPosition] = useState(null);
  // Capture referral code from URL or sessionStorage
  const refCode = (() => {
    try {
      const p = new URLSearchParams(window.location.search).get('ref');
      if (p) { sessionStorage.setItem('solum_ref', p); return p; }
      return sessionStorage.getItem('solum_ref') || null;
    } catch { return null; }
  })();

  function handleEmailChange(e) {
    const val = e.target.value;
    setEmail(val);
    setError('');
    // Only suggest once user has typed a full-looking email
    if (val.includes('@') && val.includes('.')) {
      setSuggestion(suggestEmail(val));
    } else {
      setSuggestion(null);
    }
  }

  function applySuggestion() {
    setEmail(suggestion);
    setSuggestion(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuggestion(null);
    setLoading(true);

    const { source, medium, campaign } = detectSource();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/join-waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          first_name: null,
          source,
          utm_medium: medium,
          utm_campaign: campaign || null,
          referred_by: refCode || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Try again.');
        return;
      }

      setPosition(data.position);
      track('Waitlist Signup', { cta: formId, position: String(data.position), source });
      onSuccess && onSuccess();
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  if (position !== null) {
    const isFounder = position <= FOUNDING_LIMIT;
    return (
      <div className="cs-success">
        <div className="cs-success-title">
          <em className="cs-success-num">Spot secured.</em>
        </div>
        <div className="cs-success-body">
          You're <strong style={{color:'#f0ece2'}}>#{position} of 100</strong>. One email when we launch. First to ship.
        </div>

        {/* Instagram follow CTA — everyone */}
        <div style={{
          marginTop: 12,
          padding: '14px 20px',
          background: 'rgba(240,236,226,0.03)',
          border: '1px solid rgba(240,236,226,0.09)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f0ece2', marginBottom: 2 }}>Follow us while you wait</div>
            <div style={{ fontSize: 13, fontWeight: 300, color: 'rgba(240,236,226,0.65)' }}>
              Sneak previews, formulas, rituals — before anyone else sees them.
            </div>
          </div>
          <a
            href="https://instagram.com/bysolum.body"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: '#f0ece2',
              color: '#08090B',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 15,
              letterSpacing: '.12em',
              padding: '10px 20px',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            @bysolum.body
          </a>
        </div>

        {/* Founding 100 teaser — founders only */}
        {isFounder && (
          <div style={{ marginTop: 12, background: '#181C24', border: '1px solid rgba(74,143,199,0.3)' }}>
            <div style={{ borderBottom: '1px solid rgba(240,236,226,0.07)', padding: '12px 20px', fontSize: 11, letterSpacing: 5, textTransform: 'uppercase', fontWeight: 700, color: '#4A8FC7' }}>
              Founding 100 · Members Portal
            </div>
            <div style={{ padding: '20px 20px 0' }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: '.06em', color: '#f0ece2', marginBottom: 10 }}>Real equity in Solum</div>
              <div style={{ fontSize: 13, fontWeight: 300, color: 'rgba(240,236,226,0.75)', lineHeight: 1.65, marginBottom: 20 }}>
                A share of the founding pool vesting at <strong style={{ color: '#f0ece2' }}>£1M ARR or 14 months</strong> — whichever comes first. Shape products, track growth, see what it could be worth.
              </div>
            </div>
            <a
              href="/founding-100"
              style={{
                display: 'block',
                background: '#2E6DA4',
                color: '#f0ece2',
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 15,
                letterSpacing: '.15em',
                padding: '14px 20px',
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              Find Out More
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="cs-form-placeholder">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <input
          className="cs-input"
          type="email"
          value={email}
          onChange={handleEmailChange}
          onFocus={() => track('Email Input Focus', { cta: formId })}
          placeholder="Your email address"
          required
          autoComplete="email"
          data-clarity-mask="true"
        />
        {suggestion && (
          <div className="cs-typo-suggest">
            Did you mean <button type="button" className="cs-typo-btn" onClick={applySuggestion}>{suggestion}</button>?
          </div>
        )}
        <button type="submit" className="cs-submit" disabled={loading}>
          {loading ? 'Checking & securing your spot...' : label}
        </button>
      </form>
      {error && <div className="cs-form-error">{error}</div>}
    </div>
  );
}

function FoundingBar({ count }) {
  const taken = Math.min(FOUNDING_LIMIT, count || 0);
  const filled = Math.min(100, (taken / FOUNDING_LIMIT) * 100);
  const isFull = taken >= FOUNDING_LIMIT;

  return (
    <div className="cs-founding-bar">
      <div className="cs-founding-bar-top">
        <div className="cs-founding-bar-label">
          {isFull ? 'Launch Spots — Closed' : `${taken} / 100 Founding Member Spots Taken ↓`}
        </div>
        {!isFull && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <span style={{
              display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
              background: '#c8a96e', boxShadow: '0 0 6px #c8a96e',
              animation: 'livePulse 1.6s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700, color: '#c8a96e' }}>Live</span>
          </div>
        )}
      </div>
      <div className="cs-progress-track">
        <div className="cs-progress-fill" style={{ width: `${filled}%` }} />
      </div>
    </div>
  );
}

export default function ComingSoon() {
  const [waitlistCount, setWaitlistCount] = useState(null);

  useEffect(() => {
    async function fetchCount() {
      try {
        const { count } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('checkout_status', 'waitlist')
          .not('email', 'in', '("test@bysolum.com")');
        setWaitlistCount(count || 0);
      } catch {
        // Silent fail — count just won't show
      }
    }
    fetchCount();
  }, []);

  // Scroll depth tracking — fires at 25 / 50 / 75 / 100%
  useEffect(() => {
    const fired = new Set();
    function onScroll() {
      const pct = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      [25, 50, 75, 100].forEach(depth => {
        if (!fired.has(depth) && pct >= depth / 100) {
          fired.add(depth);
          track('Scroll Depth', { percent: `${depth}%` });
        }
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Section visibility — fires once per section when 40% in view
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          track('Section Viewed', { section: e.target.dataset.track });
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    document.querySelectorAll('[data-track]').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Meta Pixel — fires PageView on waitlist page mount
  useEffect(() => {
    if (window.fbq) { window.fbq('track', 'PageView'); return; }
    (function(f,b,e,v,n,t,s){
      if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)
    }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js'));
    window.fbq('init', '690345887768095');
    window.fbq('track', 'PageView');
  }, []);

  function handleSuccess() {
    // Fire Meta Pixel Lead event on successful waitlist signup
    if (window.fbq) window.fbq('track', 'Lead');
    // Refresh count after signup
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('checkout_status', 'waitlist')
      .not('email', 'in', '("test@bysolum.com")')
      .then(({ count }) => setWaitlistCount(count || 0));
  }

  return (
    <>
      <style>{styles}</style>
      <div className="cs-wrap">
        <div className="cs-ghost">SOLUM</div>
        <div className="cs-glow" />

        <header className="cs-topbar">
          <span className="cs-logo">SOLUM</span>
        </header>

        {/* 1 — Hero */}
        <main className="cs-main" data-track="hero">
          <div className="cs-eyebrow">Men shower. Men don't actually clean.</div>
          <h1 className="cs-headline">
            You Shower Every Day.<br /><em>Your Body Is Still Dirty.</em>
          </h1>
          <p className="cs-subhead">
            Neglected back. Dry skin. Itchy scalp. Body odour by noon. Most men just use shower gel and call it a day. Follow the routine — your body stays clean all day. Desk to dinner. Odour doesn't creep back. Just confidence.
          </p>

          {/* CTA */}
          <div className="cs-form-wrap">
            <div style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 500, color: '#c8a96e', marginBottom: 10, textAlign: 'center' }}>Don't miss out — Spaces filling up fast</div>
            <WaitlistForm label="SIGN UP" onSuccess={handleSuccess} formId="hero" />
            <div className="cs-privacy">No spam. One email when we launch.</div>
            <div style={{ marginTop: 20, padding: '14px 20px', borderTop: '1px solid rgba(240,236,226,0.10)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
                <img src="/harsha.jpg" alt="Harsha, Founder" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center 15%', flexShrink: 0, filter: 'grayscale(30%) contrast(1.05)', border: '1.5px solid rgba(74,143,199,0.4)' }} />
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, color: '#4a8fc7' }}>Harsha, Founder · London</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 300, color: 'rgba(240,236,226,0.78)', lineHeight: 1.6, fontStyle: 'italic' }}>"I spent years thinking body care was just body wash and shampoo — still dealing with odour returning, dry skin, an itchy unclean scalp, areas I wasn't properly cleaning. Especially with a busy routine and regular training. No one ever explained what to actually do. Everything in grooming focused on the face. The rest of the body was ignored."</div>
            </div>
          </div>

        </main>

        {/* Box reveal */}
        <div className="cs-box-reveal" data-track="box-reveal">
          <img src="/solum-box-open-v4.png" alt="SOLUM — Your Body. Done Right." className="cs-box-img" />
          <div className="cs-box-caption">8 products · two rituals · everything your body actually needs</div>
          {/* Countdown lives here — below fold, no viewport pressure */}
          <div style={{ padding: '20px 24px 24px', display: 'flex', justifyContent: 'center' }}>
            <Countdown />
          </div>
        </div>

        {/* Outcomes */}
        <div className="cs-outcomes" data-track="outcomes">
          <div className="cs-outcomes-eyebrow">What you'll notice</div>
          <div className="cs-outcomes-heading">Most men have never actually been clean.<br />Here's what changes.</div>
          <div className="cs-outcomes-grid">
            <div className="cs-outcome">
              <div className="cs-outcome-marker">Week<br /><em>1</em></div>
              <div className="cs-outcome-title">Dead skin rolls off. Itchy scalp clears up.</div>
              <div className="cs-outcome-body">You'll see it. Grey sheets lifting off skin that rinsing alone never reached. The scalp massager clears the build-up that causes the itch — most men have never once properly cleaned their scalp.</div>
              <div className="cs-outcome-tag">Visible · Day 1</div>
            </div>
            <div className="cs-outcome">
              <div className="cs-outcome-marker">Week<br /><em>2</em></div>
              <div className="cs-outcome-title">Body odour drops — without more deodorant.</div>
              <div className="cs-outcome-body">Dead cells are what feed odour-causing bacteria, not sweat. Clear them daily and the source goes. Less smell. Same sweat.</div>
              <div className="cs-outcome-tag">Noticeable · You & Others</div>
            </div>
            <div className="cs-outcome">
              <div className="cs-outcome-marker">Week<br /><em>3</em></div>
              <div className="cs-outcome-title">Dry skin stops coming back.</div>
              <div className="cs-outcome-body">Not just after the shower — skin stays hydrated at midday too. Exfoliated skin absorbs lotion properly instead of it sitting on top of a dead layer.</div>
              <div className="cs-outcome-tag">All Day · Not Just Post-Shower</div>
            </div>
            <div className="cs-outcome">
              <div className="cs-outcome-marker">Day<br /><em>66</em></div>
              <div className="cs-outcome-title">People start to notice. Habit for life.</div>
              <div className="cs-outcome-body">By day 66 you've gone through two full cycles of new skin — the results are visible. People comment. The routine is muscle memory now. You don't decide to do it. You just do it. You'd want to take your shirt off.</div>
              <div className="cs-outcome-tag">Others Notice · Locked In For Life</div>
            </div>
          </div>
        </div>

        {/* 4 — Provenance */}
        <div className="cs-provenance" data-track="provenance">
          <div className="cs-prov-item">
            <div className="cs-prov-flag">🇬🇧</div>
            <div className="cs-prov-country">United Kingdom</div>
            <div className="cs-prov-tradition">British Formulation</div>
            <div className="cs-prov-body">Cleans without stripping. Most body washes use sulphates that remove dirt and your skin barrier at the same time. Amino acid surfactants don't. pH balanced, skin barrier safe — formulated in the UK.</div>
            <div className="cs-prov-products">Products 01 · 07</div>
          </div>
          <div className="cs-prov-item">
            <div className="cs-prov-flag">🇰🇷</div>
            <div className="cs-prov-country">Korea</div>
            <div className="cs-prov-tradition">Bathhouse Tradition</div>
            <div className="cs-prov-body">Centuries of men removing dead skin that rinsing never reaches. The Korean jjimjilbang perfected exfoliation through friction, not chemicals. The Italy Towel and back cloth bring that to your shower.</div>
            <div className="cs-prov-products">Products 02 · 03 · 04</div>
          </div>
          <div className="cs-prov-item">
            <div className="cs-prov-flag">🇲🇦</div>
            <div className="cs-prov-country">Morocco</div>
            <div className="cs-prov-tradition">Hammam Ritual</div>
            <div className="cs-prov-body">Pulls out what daily washing never reaches. The Moroccan hammam has used Atlas Mountain clay and argan oil for over a thousand years. Single ingredient. Nothing added. Skin properly fed.</div>
            <div className="cs-prov-products">Products 05 · 06</div>
          </div>
          <div className="cs-prov-item">
            <div className="cs-prov-flag">🇹🇷</div>
            <div className="cs-prov-country">Turkey</div>
            <div className="cs-prov-tradition">Hamam Craft</div>
            <div className="cs-prov-body">The exfoliation step that goes further than the daily mitt. Istanbul artisans hand-weave raw silk Kese mitts for the Ottoman hamam tradition. The rougher resistance that does what softer tools can't.</div>
            <div className="cs-prov-products">Products 09 · 10</div>
          </div>
        </div>

        {/* 5 — Ritual teaser */}
        <div className="cs-ritual" data-track="ritual">
          <div className="cs-ritual-col">
            <div className="cs-ritual-header">
              <div className="cs-ritual-tag daily">Daily Ritual</div>
              <div className="cs-ritual-title">10 Minutes.<br />Every Shower.</div>
              <div className="cs-ritual-time">5 steps · Products 01 03 04 07 08</div>
            </div>
            <div className="cs-ritual-steps">
              {[
                { n: '1', name: 'Scalp Massage', note: 'Small firm circles, hairline to back. 2–3 minutes. Your scalp stops being an afterthought.', prod: '04' },
                { n: '2', name: 'Body Wash', note: 'Amino acid formula. No sulphates. Cleans without stripping your skin barrier — no tightness after.', prod: '01' },
                { n: '3', name: 'Exfoliating Cloth', note: 'Both handles, drape over shoulder, saw back and forth. The only way to actually reach your back.', prod: '03' },
                { n: '4', name: 'Bamboo Cloth', note: 'For sensitive areas. Gentle enough where other tools are not. Nothing left uncleaned.', prod: '08' },
                { n: '5', name: 'Body Lotion', note: 'Within 3 minutes of towelling, skin absorbs 70% more moisture. Smooth past midday — not just after the shower.', prod: '07' },
              ].map(s => (
                <div key={s.n} className="cs-ritual-step">
                  <div className="cs-step-num daily">{s.n}</div>
                  <div className="cs-step-body">
                    <div className="cs-step-name">{s.name}</div>
                    <div className="cs-step-note">{s.note}</div>
                  </div>
                  <div className="cs-step-prod daily">{s.prod}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="cs-ritual-col">
            <div className="cs-ritual-header">
              <div className="cs-ritual-tag weekly">Weekly Ritual</div>
              <div className="cs-ritual-title">18 Minutes.<br />Once a Week.</div>
              <div className="cs-ritual-time">5 steps · Products 02 04 05 06 08</div>
            </div>
            <div className="cs-ritual-steps">
              {[
                { n: '1', name: 'Deep Scalp Massage', note: '5 minutes, more pressure than daily. The scalp treatment most men have never once had.', prod: '04' },
                { n: '2', name: 'Atlas Clay Mask', note: 'Apply head to toe on damp skin. Leave 8–10 minutes. Pulls out what daily washing never reaches.', prod: '05' },
                { n: '3', name: 'Italy Towel Mitt', note: 'Firm slow strokes top to bottom. Dead skin rolls off. You\'ll see it. First time, every time.', prod: '02' },
                { n: '4', name: 'Bamboo Cloth', note: 'For sensitive areas. Gentle enough where other tools are not. Nothing left uncleaned.', prod: '08' },
                { n: '5', name: 'Body Oil', note: 'Stay damp. 10–15 drops pressed into freshly exfoliated skin. Absorbs completely. No lotion needed today.', prod: '06' },
              ].map(s => (
                <div key={s.n} className="cs-ritual-step">
                  <div className="cs-step-num weekly">{s.n}</div>
                  <div className="cs-step-body">
                    <div className="cs-step-name">{s.name}</div>
                    <div className="cs-step-note">{s.note}</div>
                  </div>
                  <div className="cs-step-prod weekly">{s.prod}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 6 — Subscription */}
        <div className="cs-sub" data-track="subscription">
          <div className="cs-sub-left">
            <div className="cs-sub-tag">Subscription</div>
            <div className="cs-sub-title">Your system.<br />On autopilot.</div>
            <div className="cs-sub-body">
              The tools last months. The consumables run out. Your monthly
              refill arrives automatically — body wash, lotion, clay, oil —
              so the ritual never stops. You never have to think about it.
            </div>
          </div>
          <div className="cs-sub-right">
            <div className="cs-sub-item">
              <div className="cs-sub-item-tag">First Box</div>
              <div className="cs-sub-item-title">Your ritual starts day one</div>
              <div className="cs-sub-item-body">All 8 products arrive together — tools and consumables. Everything you need to run both rituals from the moment the box opens.</div>
            </div>
            <div className="cs-sub-item">
              <div className="cs-sub-item-tag">Monthly Refill</div>
              <div className="cs-sub-item-title">The ritual never stops</div>
              <div className="cs-sub-item-body">Consumables replenished automatically before you run out. Body wash, lotion, clay, oil. The tools stay in your bathroom — they last 6–12 months.</div>
            </div>
            <div className="cs-sub-item">
              <div className="cs-sub-item-tag">Built to stay</div>
              <div className="cs-sub-item-title">66 days and it's automatic</div>
              <div className="cs-sub-item-body">That's how long it takes for a habit to become permanent. By then, the ritual isn't something you do — it's just how you start the day.</div>
            </div>
          </div>
        </div>

        {/* 7 — CTA second */}
        <div className="cs-cta2" data-track="second-cta">
          <div className="cs-cta2-headline">Early access spots are going.</div>
          <div className="cs-cta2-sub">
            Be first in when we launch. One email. No spam.
          </div>
          <div className="cs-form-wrap" style={{ marginBottom: 0 }}>
            <FoundingBar count={waitlistCount} />
            <WaitlistForm label="SIGN UP" onSuccess={handleSuccess} formId="bottom-cta" />
            <div className="cs-privacy">No spam. One email when we launch. Unsubscribe any time.</div>
          </div>
        </div>

        {/* 8 — Product pills */}
        <div className="cs-products-wrap" data-track="product-lineup">
          <div className="cs-products-label">8 Products · The Complete System</div>
          <div className="cs-products">
            {PRODUCTS.map(p => (
              <div key={p.num} className="cs-pill">
                <span>{p.num}</span>{p.name}
              </div>
            ))}
          </div>
        </div>

        {/* Marquee */}
        <div className="cs-marquee-wrap">
          <div className="cs-marquee-track">
            {MARQUEE_ITEMS.map((item, i) => (
              <span key={i} className="cs-marquee-item">
                {item}<span className="cs-marquee-dot" />
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="cs-footer">
          <span className="cs-footer-logo">SOLUM</span>
          <a href="mailto:contact@bysolum.com" className="cs-footer-contact">contact@bysolum.com</a>
          <a href="https://instagram.com/bysolum.body" target="_blank" rel="noopener noreferrer" className="cs-footer-ig">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4.5"/>
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
            @bysolum.body
          </a>
        </footer>

        <div style={{ textAlign: 'center', padding: '20px 24px', borderTop: '1px solid rgba(240,236,226,0.10)', fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(240,236,226,0.70)', fontWeight: 600 }}>
          © {new Date().getFullYear()} Bysolum Limited
        </div>
      </div>
    </>
  );
}
