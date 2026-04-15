// web/src/pages/Founding100Page.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY;

/* ─── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = `
.f1-page{min-height:100vh;background:#08090B;font-family:'Barlow Condensed',sans-serif;color:#F0ECE2;-webkit-font-smoothing:antialiased;}

/* Nav */
.f1-nav{display:flex;align-items:center;justify-content:space-between;padding:24px 48px;border-bottom:1px solid rgba(240,236,226,0.06);}
.f1-nav-logo{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.15em;color:#F0ECE2;text-decoration:none;}
.f1-nav-badge{font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:700;color:#4A8FC7;border:1px solid rgba(74,143,199,0.4);padding:5px 12px;}
.f1-nav-right{display:flex;align-items:center;gap:20px;}
.f1-nav-meta{font-size:12px;letter-spacing:3px;text-transform:uppercase;color:rgba(240,236,226,0.80);font-weight:600;}
.f1-nav-signout{font-size:12px;letter-spacing:3px;text-transform:uppercase;color:rgba(240,236,226,0.70);background:none;border:none;cursor:pointer;padding:0;font-family:inherit;transition:color .2s;}
.f1-nav-signout:hover{color:#F0ECE2;}

/* Portal entrance hero */
.f1-entrance{max-width:640px;margin:0 auto;padding:80px 48px 56px;text-align:center;}
.f1-eyebrow{font-size:11px;letter-spacing:6px;text-transform:uppercase;font-weight:700;color:#4A8FC7;margin-bottom:20px;}
.f1-entrance-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(42px,6vw,64px);letter-spacing:.06em;line-height:1;color:#F0ECE2;margin-bottom:16px;}
.f1-entrance-sub{font-size:17px;font-weight:300;color:rgba(240,236,226,0.85);line-height:1.6;margin-bottom:48px;}

/* Benefit trio */
.f1-benefit-trio{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(240,236,226,0.07);border:1px solid rgba(240,236,226,0.07);margin-bottom:56px;}
.f1-benefit{background:#08090B;padding:24px 20px;text-align:center;}
.f1-benefit-value{font-family:'Bebas Neue',sans-serif;font-size:clamp(28px,4vw,40px);letter-spacing:.04em;color:#F0ECE2;line-height:1;margin-bottom:6px;}
.f1-benefit-value em{color:#4A8FC7;font-style:normal;}
.f1-benefit-label{font-size:13px;font-weight:600;color:rgba(240,236,226,0.82);letter-spacing:1px;text-transform:uppercase;line-height:1.4;}

/* Login form */
.f1-login-wrap{max-width:480px;margin:0 auto;padding:0 48px 80px;}
.f1-login-title{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:.06em;color:#F0ECE2;margin-bottom:8px;text-align:center;}
.f1-login-sub{font-size:15px;font-weight:300;color:rgba(240,236,226,0.82);margin-bottom:24px;text-align:center;line-height:1.5;}
.f1-input{width:100%;background:#181C24;border:1px solid rgba(240,236,226,0.15);color:#F0ECE2;padding:14px 16px;font-family:'Barlow Condensed',sans-serif;font-size:16px;outline:none;transition:border-color .2s;box-sizing:border-box;}
.f1-input:focus{border-color:#2E6DA4;}
.f1-btn{width:100%;background:#F0ECE2;color:#08090B;border:none;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.15em;padding:18px;cursor:pointer;transition:background .2s;margin-top:10px;}
.f1-btn:hover:not(:disabled){background:#fff;}
.f1-btn:disabled{background:rgba(240,236,226,0.25);color:rgba(8,9,11,0.4);cursor:wait;}
.f1-btn-ghost{width:100%;background:transparent;color:rgba(240,236,226,0.82);border:1px solid rgba(240,236,226,0.2);font-family:'Barlow Condensed',sans-serif;font-size:14px;letter-spacing:2px;text-transform:uppercase;padding:12px;cursor:pointer;margin-top:8px;transition:border-color .2s,color .2s;}
.f1-btn-ghost:hover{border-color:#F0ECE2;color:#F0ECE2;}
.f1-err{font-size:14px;color:#e05c5c;margin-top:10px;padding:10px 14px;border:1px solid rgba(224,92,92,0.25);background:rgba(224,92,92,0.04);}
.f1-not-member{font-size:14px;color:rgba(240,236,226,0.78);text-align:center;margin-top:20px;line-height:1.6;}
.f1-not-member a{color:#4A8FC7;text-decoration:none;}

/* Sent screen */
.f1-sent{max-width:480px;margin:80px auto;padding:0 48px;text-align:center;}
.f1-sent-icon{font-size:36px;margin-bottom:20px;display:block;}
.f1-sent-title{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:.05em;margin-bottom:12px;}
.f1-sent-body{font-size:16px;font-weight:300;color:rgba(240,236,226,0.85);line-height:1.65;margin-bottom:28px;}

/* ── Pledge gate ── */
.f1-pledge-wrap{max-width:660px;margin:0 auto;padding:64px 48px 80px;}
.f1-pledge-eyebrow{font-size:11px;letter-spacing:5px;text-transform:uppercase;font-weight:700;color:#4A8FC7;margin-bottom:14px;}
.f1-pledge-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(38px,5vw,58px);letter-spacing:.04em;line-height:1;color:#F0ECE2;margin-bottom:12px;}
.f1-pledge-intro{font-size:16px;font-weight:300;color:rgba(240,236,226,0.85);line-height:1.6;margin-bottom:36px;border-bottom:1px solid rgba(240,236,226,0.07);padding-bottom:32px;}

/* Equity highlight box */
.f1-equity-box{background:#181C24;border-left:3px solid #2E6DA4;padding:24px 28px;margin-bottom:32px;display:flex;align-items:center;gap:24px;}
.f1-equity-fraction{font-family:'Bebas Neue',sans-serif;font-size:52px;letter-spacing:.02em;line-height:1;color:#4A8FC7;flex-shrink:0;min-width:80px;}
.f1-equity-fraction em{color:#F0ECE2;font-style:normal;}
.f1-equity-headline{font-size:16px;font-weight:600;color:#F0ECE2;margin-bottom:5px;line-height:1.3;}
.f1-equity-detail{font-size:15px;font-weight:300;color:rgba(240,236,226,0.85);line-height:1.55;}

/* Commitment sections */
.f1-pledge-section{margin-bottom:28px;}
.f1-pledge-section-label{font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:700;color:rgba(240,236,226,0.65);margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid rgba(240,236,226,0.07);}
.f1-pledge-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:0;}
.f1-pledge-item{display:flex;align-items:flex-start;gap:16px;font-size:15px;font-weight:300;color:rgba(240,236,226,0.88);line-height:1.6;padding:12px 0;border-bottom:1px solid rgba(240,236,226,0.05);}
.f1-pledge-item:last-child{border-bottom:none;}
.f1-pledge-marker{color:#4A8FC7;font-size:14px;flex-shrink:0;margin-top:3px;font-weight:600;}
.f1-pledge-item strong{color:#F0ECE2;font-weight:600;}

/* Exit callout */
.f1-pledge-exit-box{background:rgba(240,236,226,0.03);border:1px solid rgba(240,236,226,0.08);padding:20px 24px;margin-top:8px;margin-bottom:32px;}
.f1-pledge-exit-label{font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:700;color:rgba(240,236,226,0.65);margin-bottom:8px;}
.f1-pledge-exit-body{font-size:15px;font-weight:300;color:rgba(240,236,226,0.82);line-height:1.65;}
.f1-pledge-exit-body strong{color:#F0ECE2;font-weight:600;}

/* Accept row */
.f1-pledge-check-row{display:flex;align-items:flex-start;gap:14px;margin-bottom:20px;cursor:pointer;padding:20px 0;border-top:1px solid rgba(240,236,226,0.07);}
.f1-pledge-checkbox{width:20px;height:20px;border:1px solid rgba(240,236,226,0.35);background:transparent;flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center;transition:border-color .2s,background .2s;}
.f1-pledge-checkbox.checked{background:#2E6DA4;border-color:#2E6DA4;}
.f1-pledge-check-label{font-size:16px;font-weight:400;color:#F0ECE2;line-height:1.5;}

/* ── Portal ── */
.f1-portal{max-width:800px;margin:0 auto;padding:48px 48px 80px;}

/* Welcome */
.f1-welcome{background:#181C24;border:1px solid rgba(74,143,199,0.2);padding:32px 36px;margin-bottom:24px;display:flex;align-items:flex-start;justify-content:space-between;gap:24px;}
.f1-welcome-name{font-family:'Bebas Neue',sans-serif;font-size:30px;letter-spacing:.06em;line-height:1;margin-bottom:4px;}
.f1-welcome-date{font-size:14px;font-weight:300;color:rgba(240,236,226,0.78);letter-spacing:.5px;}
.f1-status-pill{display:inline-block;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:700;padding:6px 14px;}
.f1-status-active{background:rgba(74,143,199,0.15);color:#4A8FC7;}
.f1-status-inactive{background:rgba(168,180,188,0.1);color:rgba(240,236,226,0.78);}

/* Participation */
.f1-participation{border:1px solid rgba(240,236,226,0.07);padding:20px 28px;margin-bottom:36px;display:flex;align-items:center;gap:32px;}
.f1-part-stat{}
.f1-part-label{font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:600;color:rgba(240,236,226,0.65);margin-bottom:3px;}
.f1-part-value{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.06em;color:#F0ECE2;}
.f1-part-bar-wrap{flex:1;}
.f1-part-track{height:2px;background:rgba(240,236,226,0.07);width:100%;}
.f1-part-fill{height:100%;background:#4A8FC7;transition:width .5s ease;}
.f1-part-note{font-size:13px;font-weight:300;color:rgba(240,236,226,0.78);margin-top:6px;letter-spacing:.3px;}

/* Section label */
.f1-section-label{font-size:11px;letter-spacing:6px;text-transform:uppercase;font-weight:700;color:rgba(240,236,226,0.65);margin-bottom:14px;}

/* Job card */
.f1-job{border:1px solid rgba(240,236,226,0.09);margin-bottom:12px;transition:border-color .2s;}
.f1-job.open{border-color:rgba(74,143,199,0.35);}
.f1-job.done{border-color:rgba(74,143,199,0.15);background:rgba(74,143,199,0.02);}
.f1-job-head{padding:22px 28px;display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:pointer;user-select:none;}
.f1-job-tag{font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:700;margin-bottom:4px;}
.f1-job-tag-open{color:#4A8FC7;}
.f1-job-tag-done{color:rgba(74,143,199,0.9);}
.f1-job-title{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.05em;color:#F0ECE2;}
.f1-job-desc{font-size:14px;font-weight:300;color:rgba(240,236,226,0.82);margin-top:3px;line-height:1.5;}
.f1-job-chevron{font-size:16px;color:rgba(240,236,226,0.40);transition:transform .2s;flex-shrink:0;}
.f1-job.expanded .f1-job-chevron{transform:rotate(180deg);}

/* Job content */
.f1-job-content{padding:4px 28px 28px;border-top:1px solid rgba(240,236,226,0.05);}

/* Questions */
.f1-q{margin-top:24px;}
.f1-q-label{font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:600;color:rgba(240,236,226,0.65);margin-bottom:8px;}
.f1-q-text{font-size:16px;font-weight:500;color:#F0ECE2;line-height:1.4;margin-bottom:12px;}

/* Checkboxes / radio */
.f1-options{display:flex;flex-direction:column;gap:8px;}
.f1-option{display:flex;align-items:center;gap:12px;cursor:pointer;padding:10px 14px;border:1px solid rgba(240,236,226,0.1);transition:border-color .15s,background .15s;}
.f1-option:hover{border-color:rgba(240,236,226,0.25);}
.f1-option.selected{border-color:rgba(74,143,199,0.5);background:rgba(74,143,199,0.06);}
.f1-option-box{width:16px;height:16px;border:1px solid rgba(240,236,226,0.35);flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background .15s,border-color .15s;}
.f1-option.selected .f1-option-box{background:#2E6DA4;border-color:#2E6DA4;}
.f1-option-radio{border-radius:50%;}
.f1-option-label{font-size:15px;font-weight:400;color:rgba(240,236,226,0.90);}
.f1-other-input{width:100%;background:#08090B;border:1px solid rgba(240,236,226,0.15);color:#F0ECE2;padding:10px 14px;font-family:'Barlow Condensed',sans-serif;font-size:15px;outline:none;margin-top:8px;box-sizing:border-box;transition:border-color .2s;}
.f1-other-input:focus{border-color:#2E6DA4;}

/* Textarea */
.f1-textarea{width:100%;background:#181C24;border:1px solid rgba(240,236,226,0.12);color:#F0ECE2;padding:14px 16px;font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:300;outline:none;resize:vertical;min-height:80px;line-height:1.5;box-sizing:border-box;transition:border-color .2s;}
.f1-textarea:focus{border-color:#2E6DA4;}

/* Submit row */
.f1-submit-row{display:flex;align-items:center;justify-content:space-between;margin-top:28px;gap:16px;flex-wrap:wrap;}
.f1-submit-note{font-size:14px;font-weight:300;color:rgba(240,236,226,0.78);flex:1;}
.f1-btn-submit{background:#2E6DA4;color:#F0ECE2;border:none;font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:.15em;padding:14px 32px;cursor:pointer;transition:background .2s;flex-shrink:0;}
.f1-btn-submit:hover:not(:disabled){background:#4A8FC7;}
.f1-btn-submit:disabled{background:rgba(46,109,164,0.35);cursor:wait;}

/* Done state */
.f1-done-note{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:400;color:#4A8FC7;margin-top:20px;}
.f1-response-view{margin-top:4px;}
.f1-response-q{font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;color:rgba(240,236,226,0.65);margin-bottom:5px;margin-top:20px;}
.f1-response-a{font-size:15px;font-weight:300;color:rgba(240,236,226,0.85);line-height:1.55;padding-left:12px;border-left:2px solid rgba(74,143,199,0.3);}

/* The Record */
.f1-record{border:1px solid rgba(240,236,226,0.07);padding:32px 28px;margin-top:12px;}
.f1-record-title{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:.06em;margin-bottom:8px;}
.f1-record-sub{font-size:15px;font-weight:300;color:rgba(240,236,226,0.82);line-height:1.6;margin-bottom:24px;}
.f1-record-empty{text-align:center;padding:28px 0;border-top:1px solid rgba(240,236,226,0.05);}
.f1-record-empty-text{font-size:14px;font-weight:300;color:rgba(240,236,226,0.75);line-height:1.7;}

/* Inactive */
.f1-inactive-gate{background:rgba(240,236,226,0.02);border:1px solid rgba(240,236,226,0.07);padding:40px 36px;text-align:center;margin-top:24px;}
.f1-inactive-title{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:.05em;margin-bottom:10px;}
.f1-inactive-body{font-size:15px;font-weight:300;color:rgba(240,236,226,0.85);line-height:1.65;margin-bottom:24px;}

.f1-divider{border:none;border-top:1px solid rgba(240,236,226,0.05);margin:36px 0;}
.f1-loading{min-height:100vh;display:flex;align-items:center;justify-content:center;font-size:13px;letter-spacing:4px;text-transform:uppercase;color:rgba(240,236,226,0.65);font-family:'Barlow Condensed',sans-serif;}
.f1-back{font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(240,236,226,0.72);text-decoration:none;display:inline-block;margin-top:20px;}
.f1-back:hover{color:#F0ECE2;}

/* ── SOLUM Status strip ── */
.f1-status-strip{border:1px solid rgba(240,236,226,0.07);padding:24px 28px;margin-bottom:24px;}
.f1-milestones{display:flex;align-items:flex-start;gap:0;position:relative;}
.f1-milestones::before{content:'';position:absolute;top:10px;left:10px;right:10px;height:1px;background:rgba(240,236,226,0.08);z-index:0;}
.f1-milestone{flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;position:relative;z-index:1;}
.f1-ms-dot{width:20px;height:20px;border-radius:50%;border:2px solid rgba(240,236,226,0.15);background:#08090B;display:flex;align-items:center;justify-content:center;margin-bottom:10px;flex-shrink:0;}
.f1-ms-dot.done{background:#2E6DA4;border-color:#2E6DA4;}
.f1-ms-dot.current{background:#08090B;border-color:#4A8FC7;box-shadow:0 0 0 3px rgba(74,143,199,0.15);}
.f1-ms-label{font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;color:rgba(240,236,226,0.55);line-height:1.4;max-width:80px;}
.f1-ms-label.done{color:rgba(74,143,199,0.85);}
.f1-ms-label.current{color:#F0ECE2;}
.f1-ms-sub{font-size:11px;font-weight:300;color:rgba(240,236,226,0.40);margin-top:3px;}
.f1-ms-sub.current{color:#4A8FC7;}

/* ── Tabs ── */
.f1-tab-bar{display:flex;gap:0;padding:0 48px;border-bottom:1px solid rgba(240,236,226,0.07);}
.f1-tab-bar-inner{max-width:800px;margin:0 auto;display:flex;width:100%;}
.f1-tab-btn{font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:600;color:rgba(240,236,226,0.45);padding:16px 24px 14px;cursor:pointer;border:none;border-bottom:2px solid transparent;margin-bottom:-1px;background:none;font-family:'Barlow Condensed',sans-serif;transition:color .2s,border-color .2s;display:flex;align-items:center;gap:8px;}
.f1-tab-btn:hover{color:rgba(240,236,226,0.80);}
.f1-tab-btn.active{color:#F0ECE2;border-bottom-color:#4A8FC7;}
.f1-tab-badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 4px;background:#2E6DA4;color:#F0ECE2;font-size:10px;font-weight:700;border-radius:9px;}

/* ── Stats strip ── */
.f1-stats-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(240,236,226,0.06);border:1px solid rgba(240,236,226,0.06);margin-bottom:24px;}
.f1-stat-card{background:#08090B;padding:28px 20px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;}
.f1-stat-big{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4.5vw,54px);letter-spacing:.02em;line-height:1;color:#F0ECE2;}
.f1-stat-big em{color:#4A8FC7;font-style:normal;}
.f1-stat-label{font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;color:rgba(240,236,226,0.55);}
.f1-stat-sub{font-size:12px;font-weight:300;color:rgba(240,236,226,0.40);}

/* ── Ring ── */
.f1-ring-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center;}
.f1-ring-inner{position:absolute;text-align:center;pointer-events:none;}
.f1-ring-pct{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:.02em;color:#F0ECE2;line-height:1;}
.f1-ring-done{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(240,236,226,0.45);font-weight:600;}

/* ── Vesting card ── */
.f1-vesting-card{background:#181C24;border:1px solid rgba(74,143,199,0.2);padding:28px 32px;margin-bottom:24px;display:grid;grid-template-columns:auto 1fr;gap:40px;align-items:center;}
.f1-vest-days{text-align:center;}
.f1-vest-num{font-family:'Bebas Neue',sans-serif;font-size:clamp(64px,8vw,96px);letter-spacing:.01em;line-height:1;color:#4A8FC7;}
.f1-vest-unit{font-size:11px;letter-spacing:5px;text-transform:uppercase;font-weight:700;color:rgba(74,143,199,0.70);margin-top:2px;}
.f1-vest-date{font-size:12px;font-weight:300;color:rgba(240,236,226,0.45);margin-top:6px;}
.f1-vest-bars{}
.f1-vest-bar-row{margin-bottom:18px;}
.f1-vest-bar-row:last-child{margin-bottom:0;}
.f1-vest-bar-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:7px;}
.f1-vest-bar-lbl{font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;color:rgba(240,236,226,0.55);}
.f1-vest-bar-val{font-size:13px;font-weight:400;color:rgba(240,236,226,0.75);}
.f1-vest-track{height:3px;background:rgba(240,236,226,0.07);width:100%;}
.f1-vest-fill{height:100%;background:linear-gradient(90deg,#1A4A78,#4A8FC7);transition:width 1.2s ease;}
.f1-vest-note{font-size:12px;font-weight:300;color:rgba(240,236,226,0.38);margin-top:5px;}

/* ── Open mission banner ── */
.f1-open-banner{display:flex;align-items:center;justify-content:space-between;background:rgba(74,143,199,0.07);border:1px solid rgba(74,143,199,0.28);padding:16px 22px;margin-bottom:20px;}
.f1-open-banner-text{font-size:14px;font-weight:500;color:#F0ECE2;}
.f1-open-banner-count{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:.04em;color:#4A8FC7;line-height:1;}

/* ── Message form ── */
.f1-message-card{border:1px solid rgba(240,236,226,0.07);padding:28px;margin-top:12px;}
.f1-message-title{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.06em;margin-bottom:6px;}
.f1-message-sub{font-size:14px;font-weight:300;color:rgba(240,236,226,0.70);line-height:1.55;margin-bottom:20px;}
.f1-msg-sent{display:flex;align-items:center;gap:10px;font-size:14px;color:#4A8FC7;padding:12px 0;}

/* ── Equity scenarios ── */
.f1-equity-scenarios{border:1px solid rgba(74,143,199,0.18);background:rgba(74,143,199,0.03);padding:28px;margin-bottom:24px;}
.f1-eq-header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:20px;gap:16px;flex-wrap:wrap;}
.f1-eq-title{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.06em;color:#F0ECE2;}
.f1-eq-subtitle{font-size:13px;font-weight:300;color:rgba(240,236,226,0.60);letter-spacing:.3px;}
.f1-eq-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(240,236,226,0.06);margin-bottom:16px;}
.f1-eq-card{background:#08090B;padding:20px 16px;text-align:center;}
.f1-eq-scenario{font-size:10px;letter-spacing:4px;text-transform:uppercase;font-weight:700;color:rgba(240,236,226,0.50);margin-bottom:10px;}
.f1-eq-arr{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.04em;color:rgba(240,236,226,0.70);margin-bottom:2px;}
.f1-eq-multiple{font-size:12px;font-weight:300;color:rgba(240,236,226,0.45);margin-bottom:12px;}
.f1-eq-value{font-family:'Bebas Neue',sans-serif;font-size:clamp(28px,3.5vw,38px);letter-spacing:.03em;color:#4A8FC7;line-height:1;}
.f1-eq-value-label{font-size:11px;font-weight:500;letter-spacing:2px;text-transform:uppercase;color:rgba(240,236,226,0.60);margin-top:5px;}
.f1-eq-card.highlight .f1-eq-value{color:#F0ECE2;}
.f1-eq-card.highlight{background:#181C24;}
.f1-eq-disclaimer{font-size:12px;font-weight:300;color:rgba(240,236,226,0.40);line-height:1.6;}

@media(max-width:768px){
  .f1-nav{padding:20px 24px;}
  .f1-entrance{padding:56px 24px 40px;}
  .f1-benefit-trio{grid-template-columns:1fr;}
  .f1-equity-box{flex-direction:column;gap:16px;text-align:center;}
  .f1-login-wrap{padding:0 24px 60px;}
  .f1-pledge-wrap{padding:40px 24px 60px;}
  .f1-equity-box{flex-direction:column;gap:12px;}
  .f1-equity-fraction{font-size:40px;}
  .f1-portal{padding:32px 24px 60px;}
  .f1-welcome{flex-direction:column;gap:12px;}
  .f1-participation{flex-direction:column;gap:16px;}
  .f1-part-bar-wrap{width:100%;}
  .f1-submit-row{flex-direction:column;align-items:stretch;}
  .f1-eq-grid{grid-template-columns:1fr;}
  .f1-milestones{flex-direction:column;gap:16px;align-items:flex-start;}
  .f1-milestones::before{display:none;}
  .f1-milestone{flex-direction:row;align-items:center;text-align:left;gap:14px;}
  .f1-ms-dot{margin-bottom:0;flex-shrink:0;}
  .f1-ms-label{max-width:none;}
  .f1-stats-strip{grid-template-columns:1fr;}
  .f1-vesting-card{grid-template-columns:1fr;gap:24px;}
  .f1-vest-days{text-align:left;}
  .f1-tab-bar{padding:0 24px;}
  .f1-tab-btn{padding:14px 16px 12px;font-size:11px;}
}
`;

/* ─── Utility ─────────────────────────────────────────────────────────────── */
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ─── SOLUM Status strip ───────────────────────────────────────────────────── */
function SolumStatus() {
  const milestones = [
    { label: 'Products locked',    sub: 'Complete',      state: 'done'    },
    { label: 'First box ships',    sub: 'Q2 2026',       state: 'current' },
    { label: '500–1,000 subs',      sub: 'Year 1 goal',   state: 'pending' },
    { label: '£1M ARR',            sub: 'Equity vests',  state: 'pending' },
  ];
  return (
    <div className="f1-status-strip">
      <div className="f1-section-label" style={{ marginBottom: 20 }}>SOLUM · Where We Are</div>
      <div className="f1-milestones">
        {milestones.map(m => (
          <div className="f1-milestone" key={m.label}>
            <div className={`f1-ms-dot ${m.state}`}>
              {m.state === 'done' && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="#F0ECE2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {m.state === 'current' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4A8FC7' }} />}
            </div>
            <div className={`f1-ms-label ${m.state}`}>{m.label}</div>
            <div className={`f1-ms-sub ${m.state}`}>{m.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Equity scenarios ─────────────────────────────────────────────────────── */
function EquityScenarios() {
  const scenarios = [
    {
      label:     'Conservative',
      arr:       '£2M ARR',
      multiple:  '3× revenue',
      poolValue: '~£60K',
    },
    {
      label:     'Base Case',
      arr:       '£5.3M ARR',
      multiple:  '4× revenue',
      poolValue: '~£210K',
      highlight:  true,
    },
    {
      label:     'Optimistic',
      arr:       '£17.8M ARR',
      multiple:  '5× revenue',
      poolValue: '~£890K',
    },
  ];
  return (
    <div className="f1-equity-scenarios">
      <div className="f1-eq-header">
        <div className="f1-eq-title">What the Founding Pool Could Be Worth</div>
        <div className="f1-eq-subtitle">Year 5 projections · 3 scenarios</div>
      </div>
      {/* Growth arc */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80, marginBottom: 8 }}>
          {[
            { label: 'Launch',  h: 8,  color: 'rgba(74,143,199,0.20)' },
            { label: 'Year 1',  h: 22, color: 'rgba(74,143,199,0.35)' },
            { label: 'Year 3',  h: 44, color: 'rgba(74,143,199,0.55)' },
            { label: 'Year 5',  h: 62, color: '#2E6DA4' },
            { label: 'Unicorn', h: 80, color: '#4A8FC7' },
          ].map((b, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '60%', height: b.h, background: b.color }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex' }}>
          {['Launch', 'Year 1', 'Year 3', 'Year 5', 'Unicorn ★'].map((l, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: i === 4 ? '#4A8FC7' : 'rgba(240,236,226,0.38)', fontWeight: 600 }}>{l}</div>
          ))}
        </div>
      </div>

      <div className="f1-eq-grid">
        {scenarios.map(s => (
          <div className={`f1-eq-card${s.highlight ? ' highlight' : ''}`} key={s.label}>
            <div className="f1-eq-scenario">{s.label}</div>
            <div className="f1-eq-arr">{s.arr}</div>
            <div className="f1-eq-multiple">{s.multiple} valuation</div>
            <div className="f1-eq-value">{s.poolValue}</div>
            <div className="f1-eq-value-label">founding pool</div>
          </div>
        ))}
      </div>
      {/* Long-hold upside */}
      <div style={{ background: 'rgba(74,143,199,0.06)', border: '1px solid rgba(74,143,199,0.2)', padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', fontWeight: 700, color: '#4A8FC7', marginBottom: 8 }}>The longer view</div>
        <div style={{ fontSize: 15, fontWeight: 300, color: 'rgba(240,236,226,0.88)', lineHeight: 1.6 }}>
          These are Year 5 projections — a conservative start. The vision over 5–10 years is <strong style={{ color: '#F0ECE2' }}>unicorn status</strong>.
          Men's personal care is a multi-billion pound category. Dollar Shave Club sold to Unilever for <strong style={{ color: '#F0ECE2' }}>$1 billion</strong>.
          At a £1B valuation, the founding pool is worth <strong style={{ color: '#F0ECE2' }}>£10 million</strong>.
          Equity vests early — but you never have to sell. The window opens in 14 months. What happens after that is up to all of us.
        </div>
      </div>
      <div className="f1-eq-disclaimer">
        The founding pool is <strong style={{ color: 'rgba(240,236,226,0.70)' }}>1% of Solum</strong>, split equally across all 100 members. Year 5 projections from the financial model — not a guarantee. Actual value depends on exit timing, valuation multiple, and any future dilution.
      </div>
    </div>
  );
}

/* ─── Circular ring ────────────────────────────────────────────────────────── */
function CircularRing({ pct }) {
  const size = 88, stroke = 5, r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <div className="f1-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(240,236,226,0.07)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#4A8FC7" strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="f1-ring-inner">
        <div className="f1-ring-pct">{pct}%</div>
        <div className="f1-ring-done">done</div>
      </div>
    </div>
  );
}

/* ─── Vesting countdown ────────────────────────────────────────────────────── */
function VestingCountdown({ member }) {
  const start   = new Date(member.founding_member_since);
  const vesting = new Date(start);
  vesting.setMonth(vesting.getMonth() + 14);
  const today    = new Date();
  const daysLeft = Math.max(0, Math.ceil((vesting - today) / 86400000));
  const totalDays = Math.ceil((vesting - start) / 86400000);
  const elapsed   = Math.min(totalDays, totalDays - daysLeft);
  const timePct   = totalDays > 0 ? Math.round((elapsed / totalDays) * 100) : 0;
  return (
    <div className="f1-vesting-card">
      <div className="f1-vest-days">
        <div className="f1-vest-num">{daysLeft}</div>
        <div className="f1-vest-unit">days</div>
        <div className="f1-vest-date">to vesting window</div>
      </div>
      <div className="f1-vest-bars">
        <div className="f1-vest-bar-row">
          <div className="f1-vest-bar-head">
            <span className="f1-vest-bar-lbl">Time elapsed</span>
            <span className="f1-vest-bar-val">{timePct}% of 14 months</span>
          </div>
          <div className="f1-vest-track"><div className="f1-vest-fill" style={{ width: `${timePct}%` }} /></div>
          <div className="f1-vest-note">Vests {vesting.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} · or at £1M ARR</div>
        </div>
        <div className="f1-vest-bar-row">
          <div className="f1-vest-bar-head">
            <span className="f1-vest-bar-lbl">ARR progress</span>
            <span className="f1-vest-bar-val">£0 of £1M</span>
          </div>
          <div className="f1-vest-track"><div className="f1-vest-fill" style={{ width: '0%' }} /></div>
          <div className="f1-vest-note">Pre-launch · first revenue incoming</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Missions tab ─────────────────────────────────────────────────────────── */
function MissionsTab({ jobs, completions, session, onComplete }) {
  const completedCount = Object.keys(completions).length;
  const totalJobs      = jobs.length;
  const openJobs       = jobs.filter(j => !completions[j.id]);
  const doneJobs       = jobs.filter(j =>  completions[j.id]);
  const totalPts       = Object.values(completions).reduce((s, c) => s + (c.points_earned ?? 0), 0);
  const pct            = totalJobs > 0 ? Math.round((completedCount / totalJobs) * 100) : 0;

  return (
    <>
      <div className="f1-stats-strip">
        <div className="f1-stat-card">
          <CircularRing pct={pct} />
          <div className="f1-stat-label">Missions</div>
          <div className="f1-stat-sub">{completedCount} of {totalJobs} complete</div>
        </div>
        <div className="f1-stat-card">
          <div className="f1-stat-big"><em>{openJobs.length}</em></div>
          <div className="f1-stat-label">Open now</div>
          <div className="f1-stat-sub">awaiting your input</div>
        </div>
        <div className="f1-stat-card">
          <div className="f1-stat-big">{totalPts}<em>pts</em></div>
          <div className="f1-stat-label">Points earned</div>
          <div className="f1-stat-sub">participation score</div>
        </div>
      </div>

      {openJobs.length > 0 && (
        <div className="f1-open-banner">
          <div className="f1-open-banner-text">You have missions waiting for your input</div>
          <div className="f1-open-banner-count">{openJobs.length} open</div>
        </div>
      )}

      {jobs.length === 0 ? (
        <div style={{ color: 'rgba(240,236,226,0.3)', fontSize: 14, fontWeight: 300, padding: '20px 0' }}>
          No missions yet. The first drops when we're closer to launch.
        </div>
      ) : (
        <>
          {openJobs.map(job => (
            <JobCard key={job.id} job={job} completion={null} session={session} onComplete={onComplete} />
          ))}
          {doneJobs.length > 0 && (
            <>
              <div className="f1-section-label" style={{ marginTop: 32, marginBottom: 12 }}>Completed</div>
              {doneJobs.map(job => (
                <JobCard key={job.id} job={job} completion={completions[job.id]} session={session} onComplete={onComplete} />
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}

/* ─── Price lock ───────────────────────────────────────────────────────────── */
function PriceLock() {
  const kits = [
    { name: 'GROUND',    first: '£55', monthly: '£38', products: 'Products 01 02 03 04 07' },
    { name: 'RITUAL',    first: '£85', monthly: '£48', products: 'Products 01–07', highlight: true },
    { name: 'SOVEREIGN', first: '£130', monthly: '£58', products: 'All 10 products' },
  ];
  return (
    <div style={{ border: '1px solid rgba(240,236,226,0.07)', marginBottom: 24 }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(240,236,226,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="f1-section-label" style={{ marginBottom: 0 }}>Your Locked Prices</div>
        <div style={{ fontSize: 12, fontWeight: 300, color: 'rgba(240,236,226,0.45)' }}>These prices never increase for you</div>
      </div>
      {kits.map(k => (
        <div key={k.name} style={{
          display: 'grid', gridTemplateColumns: '1fr auto auto',
          alignItems: 'center', gap: 16,
          padding: '18px 24px',
          borderBottom: '1px solid rgba(240,236,226,0.05)',
          background: k.highlight ? 'rgba(74,143,199,0.04)' : 'transparent',
        }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: '.08em', color: k.highlight ? '#F0ECE2' : 'rgba(240,236,226,0.75)', marginBottom: 3 }}>{k.name}</div>
            <div style={{ fontSize: 12, fontWeight: 300, color: 'rgba(240,236,226,0.40)', letterSpacing: '.5px' }}>{k.products}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(240,236,226,0.40)', marginBottom: 3 }}>First box</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: '.04em', color: 'rgba(240,236,226,0.70)' }}>{k.first}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(240,236,226,0.40)', marginBottom: 3 }}>Monthly</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: '.04em', color: '#4A8FC7' }}>{k.monthly}</div>
              <span style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700, color: '#4A8FC7', background: 'rgba(74,143,199,0.12)', padding: '2px 6px' }}>Locked</span>
            </div>
          </div>
        </div>
      ))}
      <div style={{ padding: '12px 24px', fontSize: 12, fontWeight: 300, color: 'rgba(240,236,226,0.35)', lineHeight: 1.6 }}>
        Your monthly price is locked at whichever kit you subscribed with. As SOLUM grows and prices rise for new customers, yours stays here.
      </div>
    </div>
  );
}

/* ─── Equity tab ───────────────────────────────────────────────────────────── */
function EquityTab({ member }) {
  return (
    <>
      <VestingCountdown member={member} />
      <PriceLock />
      <SolumStatus />
      <EquityScenarios />
    </>
  );
}

/* ─── Updates tab ──────────────────────────────────────────────────────────── */
function UpdatesTab({ member, session }) {
  const [msg,    setMsg]    = useState('');
  const [sent,   setSent]   = useState(false);
  const [saving, setSaving] = useState(false);

  function handleSend(e) {
    e.preventDefault();
    if (!msg.trim()) return;
    setSaving(true);
    // mailto fallback — opens email client pre-filled
    const subject = encodeURIComponent(`Founding Member Message — ${member.first_name ?? member.email}`);
    const body    = encodeURIComponent(msg.trim());
    window.location.href = `mailto:harsha@bysolum.co.uk?subject=${subject}&body=${body}`;
    setSaving(false);
    setSent(true);
  }

  return (
    <>
      {/* The Record */}
      <div className="f1-record">
        <div className="f1-record-title">The Record</div>
        <div className="f1-record-sub">
          Every decision SOLUM makes using founding member input is logged here —
          what changed, why, and which mission drove it.
        </div>
        <div className="f1-record-empty">
          <div className="f1-record-empty-text">
            No entries yet.<br />
            <span style={{ color: 'rgba(240,236,226,0.2)' }}>
              The first will appear once mission responses are reviewed.
            </span>
          </div>
        </div>
      </div>

      {/* Direct line */}
      <div className="f1-message-card">
        <div className="f1-message-title">Direct Line to Harsha</div>
        <div className="f1-message-sub">
          Thoughts, questions, disagreements — anything. Founding members get a direct line. It goes straight to me.
        </div>
        {sent ? (
          <div className="f1-msg-sent">✓ Your email client will open with your message ready to send.</div>
        ) : (
          <form onSubmit={handleSend}>
            <textarea
              className="f1-textarea"
              placeholder="What's on your mind?"
              value={msg}
              onChange={e => setMsg(e.target.value)}
              rows={4}
            />
            <div style={{ marginTop: 12 }}>
              <button className="f1-btn-submit" type="submit" disabled={saving || !msg.trim()}>
                Send Message
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

/* ─── Schema-driven question renderer ─────────────────────────────────────── */
function QuestionField({ q, value, onChange }) {
  // value shape: checkboxes/radio → { selected: string|string[], other: '' }
  //              text → string

  if (q.type === 'text') {
    return (
      <div className="f1-q">
        <div className="f1-q-label">{q.label.split('?')[0].substring(0, 30)}…</div>
        <div className="f1-q-text">{q.label}</div>
        <textarea
          className="f1-textarea"
          placeholder={q.placeholder ?? ''}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          rows={3}
        />
      </div>
    );
  }

  const isCheckboxes = q.type === 'checkboxes';
  const selected     = value?.selected ?? (isCheckboxes ? [] : '');
  const otherText    = value?.other ?? '';
  const otherChosen  = isCheckboxes ? selected.includes('Other') : selected === 'Other';

  function toggleCheckbox(opt) {
    const next = selected.includes(opt)
      ? selected.filter(s => s !== opt)
      : [...selected, opt];
    onChange({ selected: next, other: otherText });
  }

  function selectRadio(opt) {
    onChange({ selected: opt, other: opt === 'Other' ? otherText : '' });
  }

  const allOptions = q.other ? [...q.options, 'Other'] : q.options;

  return (
    <div className="f1-q">
      <div className="f1-q-label">
        {isCheckboxes ? 'Select all that apply' : 'Choose one'}
      </div>
      <div className="f1-q-text">{q.label}</div>
      <div className="f1-options">
        {allOptions.map(opt => {
          const isSelected = isCheckboxes ? selected.includes(opt) : selected === opt;
          return (
            <div
              key={opt}
              className={`f1-option${isSelected ? ' selected' : ''}`}
              onClick={() => isCheckboxes ? toggleCheckbox(opt) : selectRadio(opt)}
            >
              <div className={`f1-option-box${isCheckboxes ? '' : ' f1-option-radio'}`}>
                {isSelected && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#F0ECE2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="f1-option-label">{opt}</span>
            </div>
          );
        })}
      </div>
      {otherChosen && (
        <input
          className="f1-other-input"
          placeholder="Tell us more…"
          value={otherText}
          onChange={e => onChange({ selected, other: e.target.value })}
        />
      )}
    </div>
  );
}

/* ─── Completed job view (shows their answers) ─────────────────────────────── */
function CompletedJobContent({ job, completion }) {
  function renderAnswer(q, val) {
    if (!val && val !== 0) return '—';
    if (q.type === 'text') return val || '—';
    if (q.type === 'checkboxes') {
      const parts = [...(val.selected ?? [])];
      if (val.other) parts.push(`Other: ${val.other}`);
      return parts.join(', ') || '—';
    }
    if (q.type === 'radio') {
      return val.selected === 'Other' && val.other
        ? `Other: ${val.other}`
        : val.selected || '—';
    }
    return '—';
  }

  return (
    <div className="f1-response-view">
      {job.schema.map(q => (
        <div key={q.id}>
          <div className="f1-response-q">{q.label}</div>
          <div className="f1-response-a">{renderAnswer(q, completion.responses[q.id])}</div>
        </div>
      ))}
      <div className="f1-done-note">
        ✓ Submitted {formatDate(completion.submitted_at)} · {completion.points_earned} pts
      </div>
    </div>
  );
}

/* ─── Job card ─────────────────────────────────────────────────────────────── */
function JobCard({ job, completion, session, onComplete }) {
  const isDone      = !!completion;
  const [open, setOpen] = useState(!isDone);
  const [answers, setAnswers] = useState({});
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');

  function validate() {
    for (const q of job.schema) {
      if (!q.required) continue;
      const v = answers[q.id];
      if (q.type === 'text' && !v?.trim()) return `Please answer: "${q.label}"`;
      if (q.type === 'radio' && !v?.selected) return `Please select an answer for: "${q.label}"`;
      if (q.type === 'checkboxes' && (!v?.selected?.length)) return `Please select at least one option for: "${q.label}"`;
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErr = validate();
    if (validationErr) { setErr(validationErr); return; }
    setSaving(true);
    setErr('');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-founding-job`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ job_id: job.id, responses: answers }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Could not save. Please try again.');
      }
      onComplete(job.id, answers);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const cardCls = `f1-job ${isDone ? 'done' : 'open'} ${open ? 'expanded' : ''}`;

  return (
    <div className={cardCls}>
      <div className="f1-job-head" onClick={() => setOpen(o => !o)}>
        <div style={{ flex: 1 }}>
          <div className={`f1-job-tag ${isDone ? 'f1-job-tag-done' : 'f1-job-tag-open'}`}>
            {isDone ? `Completed · ${completion.points_earned} pts` : `Open · ${job.points} pts`}
          </div>
          <div className="f1-job-title">{job.title}</div>
          <div className="f1-job-desc">{job.description}</div>
        </div>
        <div className="f1-job-chevron">▾</div>
      </div>

      {open && (
        <div className="f1-job-content">
          {isDone ? (
            <CompletedJobContent job={job} completion={completion} />
          ) : (
            <form onSubmit={handleSubmit}>
              {job.schema.map(q => (
                <QuestionField
                  key={q.id}
                  q={q}
                  value={answers[q.id]}
                  onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))}
                />
              ))}
              {err && <div className="f1-err" style={{ marginTop: 16 }}>{err}</div>}
              <div className="f1-submit-row">
                <div className="f1-submit-note">
                  Responses are private to SOLUM. We'll tell you what we did with them.
                </div>
                <button className="f1-btn-submit" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Submit'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Pledge gate ──────────────────────────────────────────────────────────── */
function PledgeView({ session, member, onSigned }) {
  const [accepted, setAccepted] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  async function handleCommit() {
    if (!accepted) return;
    setSaving(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/sign-founding-pledge`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Could not record your commitment. Please try again.');
      onSigned();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="f1-page">
      <style>{CSS}</style>
      <nav className="f1-nav">
        <a href="/" className="f1-nav-logo">SOLUM</a>
        <div className="f1-nav-badge">Founding 100</div>
        <div />
      </nav>
      <div className="f1-pledge-wrap">
        <div className="f1-pledge-eyebrow">Before you enter · One time only</div>
        <div className="f1-pledge-title">The Founding Commitment.</div>
        <div className="f1-pledge-intro">
          Two sides. Read both. This is binding on us as much as it is on you.
        </div>

        {/* Equity — lead with the headline promise */}
        <div className="f1-equity-box">
          <div className="f1-equity-fraction"><em>1</em>/100</div>
          <div className="f1-equity-text">
            <div className="f1-equity-headline">Real equity in Solum</div>
            <div className="f1-equity-detail">
              The founding pool is <strong style={{ color: '#F0ECE2' }}>1% of Solum</strong>, split equally across all 100 members. Your share: 1/100 of that pool.
              Vests at <strong style={{ color: '#F0ECE2' }}>£1M ARR</strong> or <strong style={{ color: '#F0ECE2' }}>14 months</strong> — whichever comes first.
              Active members only — participation is required, not optional.
            </div>
          </div>
        </div>

        {/* What SOLUM commits to */}
        <div className="f1-pledge-section">
          <div className="f1-pledge-section-label">SOLUM commits to you</div>
          <ul className="f1-pledge-list">
            <li className="f1-pledge-item">
              <span className="f1-pledge-marker">01</span>
              <span>A <strong>1/100 share of the founding pool</strong> — 1% of Solum split equally across all 100 members. Vests at £1M ARR or 14 months — whichever comes first. Real ownership — not a discount, not a voucher.</span>
            </li>
            <li className="f1-pledge-item">
              <span className="f1-pledge-marker">02</span>
              <span>Your <strong>subscription price, locked permanently</strong> — £38, £48, or £58 depending on your kit. It will never increase for you.</span>
            </li>
            <li className="f1-pledge-item">
              <span className="f1-pledge-marker">03</span>
              <span><strong>First access to every new product</strong> before it's available to anyone else. Always.</span>
            </li>
            <li className="f1-pledge-item">
              <span className="f1-pledge-marker">04</span>
              <span>A <strong>monthly update</strong> on how SOLUM is growing — high-level progress, milestones hit, and what's coming next. Founding members only.</span>
            </li>
            <li className="f1-pledge-item">
              <span className="f1-pledge-marker">05</span>
              <span>A log of every decision your input shaped — <strong>what changed, and why</strong>.</span>
            </li>
          </ul>
        </div>

        {/* What you commit to */}
        <div className="f1-pledge-section">
          <div className="f1-pledge-section-label">You commit to</div>
          <ul className="f1-pledge-list">
            <li className="f1-pledge-item">
              <span className="f1-pledge-marker">01</span>
              <span><strong>5–10 minutes a month</strong> sharing your input on products, formulas, and what could be better. You're not filling in forms — you're shaping what gets built. Go deeper whenever you want.</span>
            </li>
            <li className="f1-pledge-item">
              <span className="f1-pledge-marker">02</span>
              <span>An <strong>active SOLUM subscription</strong>. You're shaping a product you use — that's the deal.</span>
            </li>
            <li className="f1-pledge-item">
              <span className="f1-pledge-marker">03</span>
              <span>Keeping <strong>formulas, supplier names, and pricing confidential</strong>. You have inside knowledge. Keep it inside.</span>
            </li>
            <li className="f1-pledge-item">
              <span className="f1-pledge-marker">04</span>
              <span>Raising issues <strong>here, not publicly</strong>. Disagree with anything — we want to hear it. Inside the portal, not on social.</span>
            </li>
          </ul>
        </div>

        {/* Exit terms */}
        <div className="f1-pledge-exit-box">
          <div className="f1-pledge-exit-label">If the commitment ends</div>
          <div className="f1-pledge-exit-body">
            Membership is withdrawn for consistently missing missions, a lapsed subscription, or a confidentiality breach.
            You'll receive <strong>30 days' notice</strong> in all cases except breach.
            Your equity share returns to the pool and is offered to the next person on the waitlist.
          </div>
        </div>

        <div
          className="f1-pledge-check-row"
          onClick={() => setAccepted(a => !a)}
        >
          <div className={`f1-pledge-checkbox ${accepted ? 'checked' : ''}`}>
            {accepted && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="#F0ECE2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <div className="f1-pledge-check-label">
            I have read both sides of this commitment and I accept it.
          </div>
        </div>

        {err && <div className="f1-err" style={{ marginBottom: 16 }}>{err}</div>}

        <button
          className="f1-btn"
          onClick={handleCommit}
          disabled={!accepted || saving}
        >
          {saving ? 'Recording commitment…' : 'I commit. Let me in.'}
        </button>
      </div>
    </div>
  );
}

/* ─── Portal ───────────────────────────────────────────────────────────────── */
function PortalView({ session, member, jobs, completions: initialCompletions, onSignOut }) {
  const [completions, setCompletions] = useState(
    Object.fromEntries(initialCompletions.map(c => [c.job_id, c]))
  );
  const [tab, setTab] = useState('missions');
  const isActive      = member.is_active;
  const openCount     = jobs.filter(j => !completions[j.id]).length;

  function handleJobComplete(jobId, responses) {
    setCompletions(prev => ({
      ...prev,
      [jobId]: { job_id: jobId, responses, points_earned: jobs.find(j => j.id === jobId)?.points ?? 2, submitted_at: new Date().toISOString() },
    }));
  }

  return (
    <div className="f1-page">
      <style>{CSS}</style>

      <nav className="f1-nav">
        <a href="/" className="f1-nav-logo">SOLUM</a>
        <div className="f1-nav-badge">Founding 100</div>
        <div className="f1-nav-right">
          <span className="f1-nav-meta">{member.first_name ?? member.email.split('@')[0]}</span>
          <button className="f1-nav-signout" onClick={onSignOut}>Sign out</button>
        </div>
      </nav>

      {/* Welcome strip — always visible */}
      <div className="f1-portal" style={{ paddingBottom: 0 }}>
        <div className="f1-welcome">
          <div>
            <div className="f1-welcome-name">
              {member.first_name
                ? `${member.first_name}${member.last_name ? ` ${member.last_name}` : ''}.`
                : 'Welcome.'}
            </div>
            <div className="f1-welcome-date">
              Founding member since {formatDate(member.founding_member_since)}
            </div>
          </div>
          <span className={`f1-status-pill ${isActive ? 'f1-status-active' : 'f1-status-inactive'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {!isActive ? (
        <div className="f1-portal">
          <div className="f1-inactive-gate">
            <div className="f1-inactive-title">Your Spot Is Reserved.</div>
            <div className="f1-inactive-body">
              Founding member access requires an active SOLUM subscription.<br />
              Reactivate to unlock missions and keep your equity allocation.
            </div>
            <a href="/checkout">
              <button className="f1-btn" style={{ width: 'auto', padding: '14px 40px' }}>Reactivate</button>
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Tab bar */}
          <div className="f1-tab-bar">
            <div className="f1-tab-bar-inner">
              <button className={`f1-tab-btn${tab === 'missions' ? ' active' : ''}`} onClick={() => setTab('missions')}>
                Missions
                {openCount > 0 && <span className="f1-tab-badge">{openCount}</span>}
              </button>
              <button className={`f1-tab-btn${tab === 'equity' ? ' active' : ''}`} onClick={() => setTab('equity')}>
                Equity
              </button>
              <button className={`f1-tab-btn${tab === 'updates' ? ' active' : ''}`} onClick={() => setTab('updates')}>
                Updates
              </button>
            </div>
          </div>

          {/* Tab content */}
          <div className="f1-portal" style={{ paddingTop: 32 }}>
            {tab === 'missions' && (
              <MissionsTab
                jobs={jobs}
                completions={completions}
                session={session}
                onComplete={handleJobComplete}
              />
            )}
            {tab === 'equity' && <EquityTab member={member} />}
            {tab === 'updates' && <UpdatesTab member={member} session={session} />}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Landing / login ──────────────────────────────────────────────────────── */
function LandingView({ phase, setPhase }) {
  const [email,   setEmail]   = useState('');
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSend(e) {
    e.preventDefault();
    setError('');
    setSending(true);
    const normEmail = email.trim().toLowerCase();
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/check-founding-member`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
        body:    JSON.stringify({ email: normEmail }),
      });
      const { is_member } = await res.json();
      if (!is_member) {
        setError("This email isn't on our founding member list. Join the waitlist below to apply.");
        setSending(false);
        return;
      }
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: normEmail,
        options: { emailRedirectTo: `${window.location.origin}/founding-100` },
      });
      if (otpErr) throw otpErr;
      setPhase('sent');
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (phase === 'sent') {
    return (
      <div className="f1-page">
        <style>{CSS}</style>
        <nav className="f1-nav">
          <a href="/" className="f1-nav-logo">SOLUM</a>
          <div className="f1-nav-badge">Founding 100</div>
          <div />
        </nav>
        <div className="f1-sent">
          <span className="f1-sent-icon">✉</span>
          <div className="f1-sent-title">Check Your Email.</div>
          <div className="f1-sent-body">
            We sent a login link to{' '}
            <strong style={{ color: '#F0ECE2' }}>{email.trim().toLowerCase()}</strong>.<br />
            Click it to enter the portal. Expires in 1 hour.
          </div>
          <button className="f1-btn-ghost" onClick={() => setPhase('login')}>
            ← Wrong email? Go back
          </button>
          <a href="/" className="f1-back">← Back to home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="f1-page">
      <style>{CSS}</style>

      <nav className="f1-nav">
        <a href="/" className="f1-nav-logo">SOLUM</a>
        <div className="f1-nav-badge">Founding 100</div>
        <a href="/" className="f1-back" style={{ marginTop: 0 }}>← Home</a>
      </nav>

      <div className="f1-entrance">
        <div className="f1-eyebrow">Founding 100 · Members only</div>
        <div className="f1-entrance-title">Enter the Portal.</div>

        <form onSubmit={handleSend} style={{ marginBottom: 12 }}>
          <input
            className="f1-input"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          {error && <div className="f1-err">{error}</div>}
          <button className="f1-btn" type="submit" disabled={sending || !email}>
            {sending ? 'Checking…' : 'Send Login Link'}
          </button>
        </form>
        <div className="f1-not-member">
          Not a founding member?{' '}
          <a href="/#founding-members">Join the waitlist ↗</a>
        </div>

        {/* What this is — below the fold */}
        <div style={{ borderTop: '1px solid rgba(240,236,226,0.06)', marginTop: 48, paddingTop: 40 }}>
          <div className="f1-entrance-sub" style={{ marginBottom: 28 }}>
            You subscribe to SOLUM because you want to shape what it becomes —
            the products, the formulas, the rituals. Give us your input once a month.
            In return, you own part of it.
          </div>
          <div className="f1-benefit-trio">
            <div className="f1-benefit">
              <div className="f1-benefit-value"><em>1</em>/100</div>
              <div className="f1-benefit-label">Equity share<br />in Solum</div>
            </div>
            <div className="f1-benefit">
              <div className="f1-benefit-value">Locked<em>/mo</em></div>
              <div className="f1-benefit-label">Your subscription price<br />frozen forever</div>
            </div>
            <div className="f1-benefit">
              <div className="f1-benefit-value">First</div>
              <div className="f1-benefit-label">Every new product<br />before public launch</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Root ─────────────────────────────────────────────────────────────────── */
export default function Founding100Page() {
  const [phase,       setPhase]       = useState('loading');
  const [session,     setSession]     = useState(null);
  const [member,      setMember]      = useState(null);
  const [jobs,        setJobs]        = useState([]);
  const [completions, setCompletions] = useState([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      if (sess) {
        setSession(sess);
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          loadMember(sess);
        }
      } else {
        setSession(null);
        setMember(null);
        setPhase('login');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadMember(sess) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-founding-member`, {
        headers: { 'Authorization': `Bearer ${sess.access_token}` },
      });
      const data = await res.json();
      console.log('[founding] get-founding-member response:', res.status, JSON.stringify(data));
      if (!res.ok) { setPhase('login'); return; }
      if (!data.member) {
        console.log('[founding] member null — auth user email:', sess.user?.email);
        setPhase('login');
        return;
      }
      setMember(data.member);
      setJobs(data.jobs ?? []);
      setCompletions(data.completions ?? []);
      setPhase(data.member.pledge_signed_at ? 'portal' : 'pledge');
    } catch (e) {
      console.error('[founding] loadMember error:', e);
      setPhase('login');
    }
  }

  function handlePledgeSigned() {
    setMember(m => ({ ...m, pledge_signed_at: new Date().toISOString() }));
    setPhase('portal');
  }

  function handleSignOut() {
    supabase.auth.signOut();
    setPhase('login');
  }

  if (phase === 'loading') {
    return (
      <div className="f1-page">
        <style>{CSS}</style>
        <div className="f1-loading">Loading…</div>
      </div>
    );
  }

  if (phase === 'pledge' && member) {
    return <PledgeView session={session} member={member} onSigned={handlePledgeSigned} />;
  }

  if (phase === 'portal' && member) {
    return (
      <PortalView
        session={session}
        member={member}
        jobs={jobs}
        completions={completions}
        onSignOut={handleSignOut}
      />
    );
  }

  return <LandingView phase={phase} setPhase={setPhase} />;
}
