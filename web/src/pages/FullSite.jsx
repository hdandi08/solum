import { useEffect, useRef, useState } from 'react';

const CSS = `
nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 48px;height:64px;background:rgba(8,9,11,0.94);backdrop-filter:blur(14px);border-bottom:1px solid var(--line);}
.nav-logo{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:0.18em;color:var(--bone);text-decoration:none;}
.nav-links{display:flex;gap:36px;list-style:none;}
.nav-links a{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--stone);text-decoration:none;transition:color .2s;}
.nav-links a:hover,.nav-links a.active-link{color:var(--bone);}
.nav-cta{font-size:11px;letter-spacing:4px;text-transform:uppercase;background:var(--blue);color:var(--bone);padding:10px 24px;text-decoration:none;transition:background .2s;}
.nav-cta:hover{background:var(--blit);}
.hero{min-height:100vh;display:flex;flex-direction:column;justify-content:flex-end;padding:0 48px 80px;position:relative;overflow:hidden;}
.hero::before{content:'';position:absolute;inset:0;z-index:0;background-image:linear-gradient(rgba(46,109,164,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(46,109,164,0.03) 1px,transparent 1px);background-size:80px 80px;animation:gridFade 3s ease forwards;}
@keyframes gridFade{from{opacity:0;}to{opacity:1;}}
.hero-ghost{position:absolute;top:50%;left:50%;transform:translate(-50%,-52%);font-family:'Bebas Neue',sans-serif;font-size:clamp(180px,22vw,340px);letter-spacing:-0.04em;color:transparent;-webkit-text-stroke:1px rgba(46,109,164,0.07);pointer-events:none;user-select:none;white-space:nowrap;animation:ghostIn 2s cubic-bezier(.16,1,.3,1) .3s both;}
@keyframes ghostIn{from{opacity:0;transform:translate(-50%,-48%) scale(.96);}to{opacity:1;transform:translate(-50%,-52%) scale(1);}}
.hero-glow{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);width:900px;height:700px;background:radial-gradient(ellipse,rgba(46,109,164,0.06) 0%,transparent 70%);pointer-events:none;}
.hero-rule{position:absolute;left:0;right:0;height:1px;background:linear-gradient(to right,transparent,rgba(46,109,164,0.15),transparent);}
.hero-rule.top{top:30%;}.hero-rule.bot{bottom:25%;}
.hero-content{position:relative;z-index:1;max-width:860px;}
.hero-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blue);margin-bottom:24px;display:flex;align-items:center;gap:12px;animation:fadeUp .8s ease .6s both;}
.hero-tag::before{content:'';width:32px;height:1px;background:var(--blue);}
.hero-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(72px,9vw,136px);line-height:.92;letter-spacing:0.03em;color:var(--bone);margin-bottom:32px;animation:fadeUp .8s ease .75s both;}
.hero-title em{font-style:normal;color:var(--blue);}
.hero-line{width:100%;height:1px;background:linear-gradient(to right,var(--blue) 0%,transparent 60%);margin-bottom:28px;animation:lineIn 1s ease 1s both;transform-origin:left;}
@keyframes lineIn{from{transform:scaleX(0);opacity:0;}to{transform:scaleX(1);opacity:1;}}
.hero-body{font-size:16px;font-weight:300;letter-spacing:.4px;color:var(--mist);max-width:500px;line-height:1.7;margin-bottom:20px;animation:fadeUp .8s ease .9s both;}
.hero-scope{display:inline-flex;align-items:center;gap:10px;border:1px solid var(--lineb);padding:9px 18px;margin-bottom:40px;animation:fadeUp .8s ease .95s both;}
.hero-scope-label{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--blue);font-weight:600;}
.hero-scope-divider{width:1px;height:14px;background:var(--lineb);}
.hero-scope-note{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);}
.hero-actions{display:flex;gap:16px;align-items:center;animation:fadeUp .8s ease 1.05s both;}
.btn-primary{font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:0.12em;background:var(--blue);color:var(--bone);padding:16px 40px;text-decoration:none;display:inline-block;transition:background .2s,transform .15s;}
.btn-primary:hover{background:var(--blit);transform:translateY(-1px);}
.btn-ghost{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);text-decoration:none;border-bottom:1px solid var(--lineb);padding-bottom:3px;transition:color .2s,border-color .2s;}
.btn-ghost:hover{color:var(--bone);border-color:var(--blue);}
.scroll-cue{position:absolute;bottom:32px;right:48px;z-index:1;display:flex;flex-direction:column;align-items:center;gap:8px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);animation:fadeUp .8s ease 1.4s both;}
.scroll-line{width:1px;height:48px;background:linear-gradient(to bottom,var(--blue),transparent);animation:scrollPulse 2s ease-in-out 2s infinite;}
@keyframes scrollPulse{0%,100%{opacity:.4;}50%{opacity:1;}}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
.marquee-wrap{overflow:hidden;border-top:1px solid var(--lineb);border-bottom:1px solid var(--lineb);background:var(--char);padding:14px 0;}
.marquee-track{display:flex;gap:0;white-space:nowrap;animation:marquee 24s linear infinite;}
@keyframes marquee{from{transform:translateX(0);}to{transform:translateX(-50%);}}
.marquee-item{font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:0.18em;color:var(--stone);padding:0 36px;display:flex;align-items:center;gap:36px;}
.marquee-dot{width:4px;height:4px;border-radius:50%;background:var(--blue);flex-shrink:0;display:inline-block;}
.truth-section{background:var(--char);border-top:1px solid var(--line);padding:100px 48px;}
.truth-inner{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start;}
.truth-stats{display:flex;flex-direction:column;gap:1px;background:var(--line);}
.truth-stat{background:var(--black);padding:32px 36px;display:grid;grid-template-columns:80px 1fr;gap:24px;align-items:center;transition:background .25s;}
.truth-stat:hover{background:var(--mid);}
.ts-num{font-family:'Bebas Neue',sans-serif;font-size:56px;color:var(--blue);line-height:1;letter-spacing:-1px;}
.ts-body{font-size:15px;color:var(--mist);font-weight:300;line-height:1.6;}
.ts-body strong{color:var(--bone);font-weight:600;}
.sec-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:16px;}
.sec-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,64px);letter-spacing:.06em;color:var(--bone);line-height:1.05;margin-bottom:24px;}
.sec-body{font-size:16px;color:var(--stone);font-weight:300;line-height:1.7;max-width:480px;}
.truth-quote{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,4vw,58px);letter-spacing:0.04em;color:var(--bone);line-height:1.05;margin-bottom:32px;}
.truth-quote em{font-style:normal;color:var(--blue);}
.truth-body{font-size:17px;font-weight:300;color:var(--mist);line-height:1.75;max-width:480px;margin-bottom:32px;}
.truth-note{font-size:13px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);border-left:2px solid var(--blue);padding-left:16px;line-height:1.7;}
.scope-banner{background:var(--blue);padding:40px 48px;display:grid;grid-template-columns:1fr 2px 1fr 2px 1fr;gap:40px;align-items:center;}
.scope-divider{width:1px;height:100%;background:rgba(255,255,255,0.15);align-self:stretch;}
.scope-item{display:flex;flex-direction:column;gap:8px;}
.scope-label{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:rgba(255,255,255,0.8);font-weight:600;}
.scope-value{font-family:'Bebas Neue',sans-serif;font-size:clamp(20px,2.2vw,30px);letter-spacing:0.06em;color:#fff;line-height:1.1;}
.scope-note{font-size:13px;color:rgba(255,255,255,0.78);font-weight:300;line-height:1.5;}
.products-section{background:var(--black);padding:80px 48px;}
.products-header{max-width:1400px;margin:0 auto 64px;display:grid;grid-template-columns:1fr 1fr;gap:80px;}
.products-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);max-width:1400px;margin:0 auto;}
.product-card{background:var(--char);padding:32px 24px;display:flex;flex-direction:column;gap:0;position:relative;overflow:hidden;transition:background .25s;}
.product-card:hover{background:var(--mid);}
.product-card:hover .prod-visual{border-color:rgba(46,109,164,0.25);}
.prod-num{font-family:'Bebas Neue',sans-serif;font-size:56px;letter-spacing:-2px;color:rgba(46,109,164,0.1);line-height:1;margin-bottom:12px;}
.prod-origin{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--blue);margin-bottom:8px;font-weight:600;}
.prod-name{font-size:14px;letter-spacing:2px;text-transform:uppercase;color:var(--bone);font-weight:600;line-height:1.35;margin-bottom:16px;}
.prod-visual{width:100%;aspect-ratio:3/4;border:1px solid var(--line);background:var(--dark);display:flex;align-items:center;justify-content:center;margin-bottom:16px;position:relative;overflow:hidden;transition:border-color .25s;}
.prod-visual::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 30%,rgba(46,109,164,0.07),transparent 65%);}
.prod-visual svg{width:65%;height:65%;opacity:.75;position:relative;z-index:1;}
.prod-body-tag{display:inline-flex;align-items:center;gap:6px;margin-bottom:10px;}
.pbt-dot{width:5px;height:5px;border-radius:50%;background:var(--blue);flex-shrink:0;}
.pbt-text{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--blue);font-weight:600;}
.prod-desc{font-size:13px;color:var(--stone);line-height:1.6;font-weight:300;margin-top:auto;}
.ritual-section{background:var(--char);border-top:1px solid var(--line);padding:80px 48px;}
.ritual-inner{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:400px 1fr;gap:80px;}
.ritual-steps{display:flex;flex-direction:column;gap:0;}
.ritual-step{display:grid;grid-template-columns:52px 1fr;gap:20px;padding:24px 0;border-bottom:1px solid var(--line);opacity:.55;transition:opacity .3s;cursor:pointer;}
.ritual-step.active{opacity:1;}
.ritual-step:hover{opacity:1;}
.step-num{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:.05em;color:var(--blue);line-height:1;padding-top:4px;}
.step-info{display:flex;flex-direction:column;gap:4px;}
.step-title{font-size:14px;letter-spacing:2px;text-transform:uppercase;color:var(--bone);font-weight:600;}
.step-time{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);}
.step-desc{font-size:14px;color:var(--stone);font-weight:300;line-height:1.55;margin-top:6px;}
.ritual-visual{position:relative;display:flex;align-items:center;justify-content:center;}
.ritual-canvas{width:100%;aspect-ratio:1;background:var(--dark);border:1px solid var(--lineb);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;}
.ritual-canvas::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(46,109,164,0.1),transparent 60%);}
.ritual-big-num{font-family:'Bebas Neue',sans-serif;font-size:220px;line-height:1;letter-spacing:-6px;color:transparent;-webkit-text-stroke:1px rgba(46,109,164,0.12);user-select:none;pointer-events:none;position:absolute;}
.ritual-step-name{position:absolute;bottom:32px;left:0;right:0;text-align:center;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.15em;color:rgba(240,236,226,.7);}
.ritual-timer{position:absolute;top:24px;right:28px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--blue);}
.ritual-zone{position:absolute;top:24px;left:28px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);}
.stats-strip{background:var(--blue);padding:0;display:grid;grid-template-columns:repeat(4,1fr);}
.stat-item{padding:48px 40px;border-right:1px solid rgba(255,255,255,0.12);display:flex;flex-direction:column;gap:8px;}
.stat-item:last-child{border-right:none;}
.stat-num{font-family:'Bebas Neue',sans-serif;font-size:64px;color:#fff;line-height:1;letter-spacing:-1px;}
.stat-label{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,0.9);font-weight:600;}
.stat-note{font-size:14px;color:rgba(255,255,255,0.78);font-weight:300;line-height:1.55;margin-top:4px;}
.pricing-section{background:var(--black);padding:80px 48px;}
.pricing-inner{max-width:1400px;margin:0 auto;}
.pricing-header{margin-bottom:64px;}
.pricing-explainer{background:var(--mid);border:1px solid var(--lineb);border-left:3px solid var(--blue);padding:24px 32px;margin-bottom:48px;display:grid;grid-template-columns:1fr 1fr;gap:40px;}
.pe-item{display:flex;flex-direction:column;gap:6px;}
.pe-label{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--blue);font-weight:600;}
.pe-value{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:0.06em;color:var(--bone);line-height:1;}
.pe-note{font-size:14px;color:var(--stone);font-weight:300;line-height:1.5;}
.pe-divider{width:1px;background:var(--lineb);align-self:stretch;}
.pricing-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line);max-width:900px;margin:0 auto;}
.price-card{background:var(--char);padding:48px 36px;display:flex;flex-direction:column;}
.price-card.featured{background:var(--blue);}
.price-card.featured .price-tag,.price-card.featured .price-name,.price-card.featured .price-first-label,.price-card.featured .price-first-amount,.price-card.featured .price-then,.price-card.featured .price-sub-label,.price-card.featured .price-sub-amount,.price-card.featured .price-sub-note,.price-card.featured .pi-k,.price-card.featured .pi-v{color:#fff;}
.price-card.featured .pi-k{color:rgba(255,255,255,0.65);}
.price-card.featured .price-item{border-bottom-color:rgba(255,255,255,0.12);}
.price-card.featured .price-then{color:rgba(255,255,255,0.7);}
.price-card.featured .btn-price{background:#fff;color:var(--blue);}
.price-card.featured .btn-price:hover{background:var(--bone);}
.price-card.featured .price-clarity{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.2);}
.price-card.featured .price-clarity-text{color:rgba(255,255,255,0.75);}
.price-tag{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--stone);margin-bottom:20px;}
.price-name{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:.08em;color:var(--bone);line-height:1;margin-bottom:28px;}
.price-box{border:1px solid var(--lineb);margin-bottom:8px;}
.price-row{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--lineb);}
.price-row:last-child{border-bottom:none;}
.price-row-label{display:flex;flex-direction:column;gap:3px;}
.price-first-label{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);font-weight:600;}
.price-first-amount{font-family:'Bebas Neue',sans-serif;font-size:44px;letter-spacing:-0.5px;color:var(--bone);line-height:1;}
.price-first-note{font-size:13px;color:var(--stone);font-weight:300;}
.price-then{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);padding:0 20px;text-align:center;font-style:italic;}
.price-sub-label{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--blue);font-weight:600;}
.price-sub-amount{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:-0.5px;color:var(--bone);line-height:1;}
.price-sub-note{font-size:13px;color:var(--stone);font-weight:300;}
.price-clarity{background:rgba(46,109,164,0.06);border:1px solid var(--lineb);padding:12px 16px;margin-bottom:28px;}
.price-clarity-text{font-size:13px;color:var(--stone);line-height:1.6;font-weight:300;}
.price-clarity-text strong{color:var(--bone);}
.price-items{display:flex;flex-direction:column;flex:1;margin-bottom:28px;}
.price-item{display:flex;justify-content:space-between;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--line);font-size:14px;}
.price-item:last-child{border-bottom:none;}
.pi-k{color:var(--stone);font-weight:300;}
.pi-v{color:var(--bone);font-weight:500;letter-spacing:.5px;}
.btn-price{font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.12em;background:var(--blue);color:var(--bone);padding:16px 32px;text-decoration:none;display:block;text-align:center;transition:background .2s,transform .15s;margin-top:auto;}
.btn-price:hover{background:var(--blit);transform:translateY(-1px);}
.price-cancel{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);text-align:center;margin-top:12px;}
.how-section{background:var(--char);border-top:1px solid var(--line);padding:80px 48px;}
.how-inner{max-width:1400px;margin:0 auto;}
.how-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--line);margin-top:64px;}
.how-step{background:var(--black);padding:48px 36px;display:flex;flex-direction:column;gap:16px;}
.how-num{font-family:'Bebas Neue',sans-serif;font-size:88px;line-height:1;letter-spacing:-2px;color:transparent;-webkit-text-stroke:1px rgba(46,109,164,0.18);}
.how-title{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:.08em;color:var(--bone);}
.how-body{font-size:15px;color:var(--stone);font-weight:300;line-height:1.7;}
.how-detail{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--blue);margin-top:auto;}
.origins{background:var(--black);border-top:1px solid var(--line);padding:80px 48px;}
.origins-inner{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start;}
.origins-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--line);}
.origin-tile{background:var(--char);padding:28px 22px;display:flex;flex-direction:column;gap:8px;transition:background .25s;position:relative;overflow:hidden;}
.origin-tile::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--blue);transform:scaleX(0);transform-origin:left;transition:transform .3s ease;}
.origin-tile:hover{background:var(--mid);}
.origin-tile:hover::after{transform:scaleX(1);}
.origin-flag{font-size:20px;margin-bottom:2px;}
.origin-country{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--blue);font-weight:600;}
.origin-product{font-size:13px;letter-spacing:1px;text-transform:uppercase;color:var(--bone);font-weight:600;line-height:1.3;}
.origin-why{font-size:13px;color:var(--stone);line-height:1.5;font-weight:300;margin-top:4px;}
.proof-section{background:var(--char);border-top:1px solid var(--line);padding:80px 48px;}
.proof-inner{max-width:1400px;margin:0 auto;}
.proof-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--line);margin-top:64px;}
.proof-card{background:var(--black);padding:40px 32px;display:flex;flex-direction:column;gap:16px;}
.proof-stars{display:flex;gap:4px;color:var(--blue);font-size:16px;letter-spacing:2px;}
.proof-quote{font-size:16px;font-weight:300;color:var(--mist);line-height:1.7;font-style:italic;}
.proof-author{display:flex;flex-direction:column;gap:3px;margin-top:auto;padding-top:16px;border-top:1px solid var(--line);}
.proof-name{font-size:13px;letter-spacing:2px;text-transform:uppercase;color:var(--bone);font-weight:600;}
.proof-info{font-size:13px;color:var(--stone);letter-spacing:1px;}
.faq-section{background:var(--black);padding:80px 48px;}
.faq-inner{max-width:900px;margin:0 auto;}
.faq-item{border-bottom:1px solid var(--line);}
.faq-q{display:flex;justify-content:space-between;align-items:center;padding:24px 0;cursor:pointer;font-size:16px;letter-spacing:1px;color:var(--bone);font-weight:500;}
.faq-q:hover{color:var(--blit);}
.faq-toggle{font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--blue);flex-shrink:0;margin-left:20px;transition:transform .25s;}
.faq-a{max-height:0;overflow:hidden;transition:max-height .35s ease,padding .35s;font-size:15px;color:var(--stone);font-weight:300;line-height:1.75;padding:0;}
.faq-item.open .faq-toggle{transform:rotate(45deg);}
.faq-item.open .faq-a{max-height:220px;padding-bottom:24px;}
.cta-section{background:var(--char);border-top:1px solid var(--lineb);text-align:center;padding:140px 48px;position:relative;overflow:hidden;}
.cta-section::before{content:'SOLUM';pointer-events:none;user-select:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Bebas Neue',sans-serif;font-size:clamp(200px,28vw,380px);letter-spacing:-4px;color:transparent;-webkit-text-stroke:1px rgba(46,109,164,0.04);white-space:nowrap;}
.cta-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blue);margin-bottom:24px;position:relative;}
.cta-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(56px,6vw,96px);letter-spacing:.06em;color:var(--bone);line-height:1;margin-bottom:24px;position:relative;}
.cta-body{font-size:17px;color:var(--stone);font-weight:300;max-width:480px;margin:0 auto 48px;line-height:1.7;position:relative;}
.cta-btns{display:flex;justify-content:center;gap:16px;position:relative;}
footer{background:var(--black);border-top:1px solid var(--line);padding:56px 48px 32px;}
.footer-inner{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:48px;margin-bottom:48px;}
.footer-logo{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:.18em;color:var(--bone);margin-bottom:10px;display:block;}
.footer-tagline{font-size:13px;color:var(--stone);letter-spacing:2px;font-style:italic;margin-bottom:8px;}
.footer-scope{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--blue);font-weight:600;}
.footer-col-title{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:20px;}
.footer-links{display:flex;flex-direction:column;gap:10px;list-style:none;}
.footer-links a{font-size:14px;color:var(--stone);text-decoration:none;letter-spacing:.5px;transition:color .2s;}
.footer-links a:hover{color:var(--bone);}
.footer-bottom{max-width:1400px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:24px;font-size:13px;color:var(--stone);letter-spacing:2px;}
.reveal{opacity:0;transform:translateY(32px);transition:opacity .7s ease,transform .7s ease;}
.reveal.visible{opacity:1;transform:translateY(0);}
.reveal-left{opacity:0;transform:translateX(-28px);transition:opacity .7s ease,transform .7s ease;}
.reveal-left.visible{opacity:1;transform:translateX(0);}
`;

const RITUAL_STEPS = [
  { num: '01', name: 'BODY WASH', time: '1 MIN · DAILY', zone: 'FULL BODY', title: 'Amino Acid Body Wash', timeLabel: '1 Minute · Daily · Full Body', desc: 'Apply from neck to feet. Let the amino acids work. No stripping. No residue.' },
  { num: '02', name: 'EXFOLIATE', time: '2 MIN · DAILY', zone: 'ARMS + LEGS + TORSO', title: 'Daily Body Scrub', timeLabel: '1 Minute · 3× Per Week · Body', desc: 'Damp skin. Circular motion. Arms, legs, torso. You will see years of buildup on first use.' },
  { num: '03', name: 'EXFOLIATING CLOTH', time: '1 MIN · WEEKLY', zone: 'BACK', title: 'Exfoliating Cloth', timeLabel: '1 Minute · Weekly · Back', desc: 'Both handles. Full 70cm reach. Your back has never been properly cleaned. This fixes that.' },
  { num: '04', name: 'SCALP MASSAGE', time: 'DURING WASH · DAILY', zone: 'SCALP', title: 'Scalp Massage', timeLabel: 'During Wash · Daily · Scalp', desc: 'Silicone pins. Press and rotate. Stimulates circulation. Distributes product. 60 seconds.' },
  { num: '07', name: 'BODY LOTION', time: 'WITHIN 3 MIN · DAILY', zone: 'FULL BODY', title: 'Body Lotion — The 3 Minute Rule', timeLabel: 'Within 3 Minutes of Towelling · Daily', desc: 'This window is when skin absorbs moisture most efficiently. 400ml. Full body. Every day. Non-negotiable.' },
];

const FAQ_ITEMS = [
  { q: 'Am I paying the full kit price every month?', a: 'No. The first box price (£72 or £89) is a one-time payment that includes physical tools lasting 6–12 months. After that, you pay £40 or £52/month for consumables only — body wash, lotion, clay, and argan oil if you\'re on Full. The tools are already in your home. You never pay the setup price again.' },
  { q: 'Is this for my face or my body?', a: 'Your body. Entirely. SOLUM is the first serious body care system for men — it does not replace your face routine, shampoo, or deodorant. It addresses skin from your neck down: exfoliation, back care, scalp health, and daily moisturisation of the body. The 90% of your skin that most products ignore.' },
  { q: "I've never used anything on my body. Is this too advanced?", a: 'This is built specifically for that person. The Daily Starter is 3 products, numbered in order. The ritual card tells you exactly when to use each one and for how long. If you can remember to shower, you can follow this. Start with Daily Starter — upgrade to Full Ritual when it becomes automatic.' },
  { q: 'Why does it matter that I use the lotion within 3 minutes?', a: 'Immediately after showering, your skin is warm and the outer layer is still hydrated. Moisture absorption is significantly higher during this window. Wait 15 minutes and you\'ve largely missed it — the lotion sits on top rather than absorbing. The 3-minute rule is dermatology, not marketing.' },
  { q: 'Can I cancel or pause my subscription?', a: 'Yes. Any time. One click. No penalty, no phone calls, no retention flows designed to confuse you. Skip a month if you\'re travelling. Pause indefinitely. We\'d rather you come back when you\'re ready than resent us for charging you when you don\'t need it.' },
  { q: 'Does it work as a gift?', a: 'The World Kit is designed for gifting. Rigid matte black box, steel blue foil strip, ribbon pull, ritual card face-up. It looks like something that cost significantly more than it did. You can choose whether to include a subscription with it or let the recipient decide after they\'ve tried it.' },
];

export default function FullSite() {
  const [activeStep, setActiveStep] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);
  const [activeNav, setActiveNav] = useState('');
  const revealRefs = useRef([]);
  const timerRef = useRef(null);

  // Scroll reveals
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) setTimeout(() => e.target.classList.add('visible'), i * 80);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.reveal,.reveal-left').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Ritual auto-cycle
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActiveStep(s => (s + 1) % RITUAL_STEPS.length);
    }, 3200);
    return () => clearInterval(timerRef.current);
  }, []);

  const handleStepClick = (i) => {
    clearInterval(timerRef.current);
    setActiveStep(i);
    timerRef.current = setInterval(() => {
      setActiveStep(s => (s + 1) % RITUAL_STEPS.length);
    }, 3200);
  };

  // Nav active on scroll
  useEffect(() => {
    const handler = () => {
      let cur = '';
      document.querySelectorAll('section[id]').forEach(s => {
        if (window.scrollY >= s.offsetTop - 100) cur = s.id;
      });
      setActiveNav(cur);
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const step = RITUAL_STEPS[activeStep];

  return (
    <>
      <style>{CSS}</style>

      {/* NAV */}
      <nav>
        <a href="#home" className="nav-logo">SOLUM</a>
        <ul className="nav-links">
          {[['#truth','Why SOLUM'],['#products','Products'],['#ritual','The Ritual'],['#pricing','Pricing']].map(([href, label]) => (
            <li key={href}><a href={href} className={activeNav === href.slice(1) ? 'active-link' : ''}>{label}</a></li>
          ))}
        </ul>
        <a href="#pricing" className="nav-cta">Start Your Ritual</a>
      </nav>

      {/* HERO */}
      <section className="hero" id="home">
        <div className="hero-ghost">SOLUM</div>
        <div className="hero-glow" />
        <div className="hero-rule top" />
        <div className="hero-rule bot" />
        <div className="hero-content">
          <div className="hero-tag">The Men's Body Ritual</div>
          <h1 className="hero-title">Your Body.<br />Finally<br /><em>Done Right.</em></h1>
          <div className="hero-line" />
          <p className="hero-body">Most men shower every day and still have rough skin, a neglected back, and a scalp they've never once properly cleaned. Not laziness. Nobody ever built them a system worth following. SOLUM fixes that.</p>
          <div className="hero-scope">
            <span className="hero-scope-label">Body Care</span>
            <span className="hero-scope-divider" />
            <span className="hero-scope-note">Not Face. Not Hair. Your Body — Head to Toe.</span>
          </div>
          <div className="hero-actions">
            <a href="#pricing" className="btn-primary">Get The Kit</a>
            <a href="#truth" className="btn-ghost">Why It Matters</a>
          </div>
        </div>
        <div className="scroll-cue"><div className="scroll-line" />Scroll</div>
      </section>

      {/* MARQUEE */}
      <div className="marquee-wrap">
        <div className="marquee-track">
          {['Body Care','Not Face. Not Hair.','Korea · Morocco · UK','10 Minutes Daily','8 Products · One System','The Ritual Men Were Never Taught',
            'Body Care','Not Face. Not Hair.','Korea · Morocco · UK','10 Minutes Daily','8 Products · One System','The Ritual Men Were Never Taught'].map((item, i) => (
            <span key={i} className="marquee-item">{item}<span className="marquee-dot" /></span>
          ))}
        </div>
      </div>

      {/* SCOPE BANNER */}
      <div className="scope-banner">
        <div className="scope-item">
          <div className="scope-label">This Is About</div>
          <div className="scope-value">Body Hygiene &amp; Grooming</div>
          <div className="scope-note">Skin, scalp, back, texture, odour. The fundamentals most men have never addressed properly.</div>
        </div>
        <div className="scope-divider" />
        <div className="scope-item">
          <div className="scope-label">This Is Not</div>
          <div className="scope-value">A Face Routine</div>
          <div className="scope-note">SOLUM is dedicated entirely to the body — the most neglected part of every man's hygiene. Face routines are everywhere. This isn't one.</div>
        </div>
        <div className="scope-divider" />
        <div className="scope-item">
          <div className="scope-label">The Standard</div>
          <div className="scope-value">10 Min Daily. 22 Min Weekly.</div>
          <div className="scope-note">That's the full system. Stacked onto the shower you're already taking. Permanent results in 66 days.</div>
        </div>
      </div>

      {/* TRUTH */}
      <section className="truth-section" id="truth">
        <div className="truth-inner">
          <div className="truth-text reveal-left">
            <div className="sec-tag">The Reality</div>
            <div className="truth-quote">Nobody<br />Taught<br />You <em>This.</em></div>
            <p className="truth-body">You were taught to shower. You weren't taught what to do in there. Most men use one product on their entire body, rinse off, and consider it done. The result is years of dead skin buildup, persistent dryness, back breakouts no one talks about, and body odour that worsens because of accumulated dead cells — not just sweat.<br /><br />This isn't a grooming luxury. It's basic maintenance that was never explained. SOLUM is the system that should have existed twenty years ago.</p>
            <div className="truth-note">SOLUM is body care only. It does not replace your face routine, shampoo, or deodorant. It addresses everything else — the 90% of your skin most products ignore entirely.</div>
          </div>
          <div className="truth-stats reveal">
            {[['58%','of UK men use zero skincare products.',"Not because they don't care — because nothing was built for them."],
              ['0','Times the average man has properly exfoliated his back.','The exfoliating cloth exists because this area is almost universally neglected.'],
              ['3','Minute window after showering','when your skin absorbs moisture most efficiently. Most men miss it every single day.'],
              ['66','Days for a habit to become automatic.','SOLUM is designed around this number. The system is built to get you there.']
            ].map(([num, bold, rest]) => (
              <div key={num} className="truth-stat">
                <div className="ts-num">{num}</div>
                <div className="ts-body"><strong>{bold}</strong> {rest}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="products-section" id="products">
        <div className="products-header reveal">
          <div>
            <div className="sec-tag">The Products</div>
            <h2 className="sec-title">Eight Products.<br />One Body System.</h2>
          </div>
          <div style={{display:'flex',alignItems:'flex-end'}}>
            <p className="sec-body">Each product is numbered 01–08 and applied in sequence. All eight address the body — not the face. Sourced from the country that does each tradition best. The order is the system.</p>
          </div>
        </div>
        <div className="products-grid reveal">
          {[
            { num:'01', origin:'🇬🇧 United Kingdom', name:'Amino Acid\nBody Wash', tag:'Body · Daily · pH 4.5', desc:'Amino acid surfactants. Zero sulphates. pH 4.5 — matched to the body\'s natural level, safe for sensitive areas. Cleans without stripping the skin barrier.',
              svg: <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="28" y="50" width="44" height="90" rx="6" stroke="#4a8fc7" strokeWidth="1.5"/><rect x="38" y="30" width="24" height="22" rx="4" stroke="#4a8fc7" strokeWidth="1.2"/><rect x="46" y="18" width="8" height="14" rx="2" stroke="#4a8fc7" strokeWidth="1.2"/><line x1="54" y1="22" x2="70" y2="22" stroke="#4a8fc7" strokeWidth="1.2"/><circle cx="70" cy="22" r="4" stroke="#4a8fc7" strokeWidth="1.2"/><line x1="36" y1="80" x2="64" y2="80" stroke="#2e6da4" strokeWidth="0.8" opacity="0.5"/><line x1="36" y1="90" x2="58" y2="90" stroke="#2e6da4" strokeWidth="0.8" opacity="0.3"/><rect x="34" y="100" width="32" height="2" rx="1" fill="#2e6da4" opacity="0.4"/><text x="50" y="120" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fill="#4a8fc7" opacity="0.6" letterSpacing="1">250ml</text></svg> },
            { num:'02', origin:'🇰🇷 Korea', name:'Nylon Body\nScrub Cloth', tag:'Body · 3× Week', desc:'The Korean bathhouse standard for 60 years. Removes dead skin build-up that body wash alone cannot reach. The result is immediately visible.',
              svg: <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M25,90 Q22,60 30,40 Q38,20 50,22 Q62,20 70,40 Q78,60 75,90 Q72,120 50,130 Q28,120 25,90Z" stroke="#4a8fc7" strokeWidth="1.5"/><line x1="35" y1="50" x2="65" y2="50" stroke="#2e6da4" strokeWidth="0.8" opacity="0.5"/><line x1="33" y1="62" x2="67" y2="62" stroke="#2e6da4" strokeWidth="0.8" opacity="0.5"/><line x1="32" y1="74" x2="68" y2="74" stroke="#2e6da4" strokeWidth="0.8" opacity="0.5"/><line x1="32" y1="86" x2="68" y2="86" stroke="#2e6da4" strokeWidth="0.8" opacity="0.4"/><line x1="33" y1="98" x2="67" y2="98" stroke="#2e6da4" strokeWidth="0.8" opacity="0.3"/><path d="M38,128 Q50,135 62,128" stroke="#4a8fc7" strokeWidth="1.2" opacity="0.6"/><text x="50" y="150" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.6" letterSpacing="1">ITALY TOWEL</text></svg> },
            { num:'03', origin:'🇰🇷 Korea', name:'Exfoliating\nCloth 70cm', tag:'Back · Weekly', desc:'70cm. Full reach. Dual texture. Every inch of your back — the most consistently neglected area on the male body.',
              svg: <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="42" y="15" width="16" height="20" rx="3" stroke="#4a8fc7" strokeWidth="1.3"/><rect x="42" y="125" width="16" height="20" rx="3" stroke="#4a8fc7" strokeWidth="1.3"/><rect x="35" y="33" width="30" height="94" rx="2" stroke="#4a8fc7" strokeWidth="1.5"/>{['46','57','68','79','90','101','112'].map((y,i)=><line key={y} x1="35" y1={y} x2="65" y2={y} stroke="#2e6da4" strokeWidth="0.7" opacity={i<6?0.5:0.4}/>)}<text x="50" y="155" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.6" letterSpacing="1">70CM REACH</text></svg> },
            { num:'04', origin:'🇰🇷 Korea', name:'Silicone Scalp\nMassager', tag:'Scalp · Daily', desc:'Used during wash. Stimulates blood flow to follicles. Distributes product evenly. Takes 60 seconds. Most men have never done this once.',
              svg: <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="65" r="32" stroke="#4a8fc7" strokeWidth="1.5"/><circle cx="50" cy="65" r="22" stroke="#2e6da4" strokeWidth="0.8" opacity="0.4"/>{[[50,43],[64,50],[68,65],[64,80],[50,87],[36,80],[32,65],[36,50]].map(([cx,cy])=><circle key={`${cx}${cy}`} cx={cx} cy={cy} r="3" stroke="#4a8fc7" strokeWidth="1.2"/>)}<circle cx="50" cy="65" r="4" fill="#2e6da4" opacity="0.3"/><rect x="44" y="97" width="12" height="34" rx="6" stroke="#4a8fc7" strokeWidth="1.3"/><text x="50" y="148" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.6" letterSpacing="1">SILICONE</text></svg> },
            { num:'05', origin:'🇲🇦 Morocco', name:'Atlas Clay\nBody Mask', tag:'Body · Weekly', desc:'Atlas mountain clay. Used in Moroccan hammams for over 1,000 years. Draws out body impurities. The anchor of the weekly deep ritual.',
              svg: <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="55" width="60" height="72" rx="4" stroke="#4a8fc7" strokeWidth="1.5"/><rect x="18" y="42" width="64" height="16" rx="3" stroke="#4a8fc7" strokeWidth="1.3"/>{['78','91','104'].map(y=><line key={y} x1="28" y1={y} x2="72" y2={y} stroke="#2e6da4" strokeWidth="0.7" opacity="0.4"/>)}<rect x="28" y="64" width="44" height="26" rx="2" stroke="#2e6da4" strokeWidth="0.8" opacity="0.3"/><text x="50" y="73" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fill="#4a8fc7" opacity="0.7" letterSpacing="1">ATLAS CLAY</text><text x="50" y="83" textAnchor="middle" fontFamily="sans-serif" fontSize="5.5" fill="#4a8fc7" opacity="0.5" letterSpacing="1">ATLAS CLAY</text><text x="50" y="148" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.6" letterSpacing="1">MOROCCO</text></svg> },
            { num:'06', origin:'🇲🇦 Morocco', name:'Body Oil\nOrganic', tag:'Body · Weekly', desc:'Cold-pressed. Organic. Applied to damp body skin immediately after the weekly exfoliation. Absorption peaks on freshly exfoliated skin.',
              svg: <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="32" y="60" width="36" height="78" rx="5" stroke="#4a8fc7" strokeWidth="1.5"/><rect x="40" y="40" width="20" height="22" rx="3" stroke="#4a8fc7" strokeWidth="1.2"/><ellipse cx="50" cy="36" rx="10" ry="6" stroke="#4a8fc7" strokeWidth="1.2"/><line x1="50" y1="18" x2="50" y2="30" stroke="#4a8fc7" strokeWidth="1.2"/><circle cx="50" cy="16" r="3" stroke="#4a8fc7" strokeWidth="1.2"/><rect x="34" y="95" width="32" height="41" rx="3" fill="#1a4a78" opacity="0.15"/><line x1="34" y1="95" x2="66" y2="95" stroke="#4a8fc7" strokeWidth="0.8" opacity="0.5"/><text x="50" y="80" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fill="#4a8fc7" opacity="0.6" letterSpacing="1">ARGAN</text><text x="50" y="148" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.6" letterSpacing="1">COLD PRESSED</text></svg> },
            { num:'07', origin:'🇬🇧 United Kingdom', name:'Fast-Absorb\nBody Lotion', tag:'Body · Daily · 3 Min Rule', desc:'400ml. Applied to the full body within 3 minutes of towelling. This window is when skin absorbs moisture at its peak. Miss it and it\'s largely wasted.',
              svg: <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M34,145 L30,60 Q30,50 50,48 Q70,50 70,60 L66,145 Z" stroke="#4a8fc7" strokeWidth="1.5"/><rect x="38" y="36" width="24" height="14" rx="4" stroke="#4a8fc7" strokeWidth="1.3"/><line x1="32" y1="85" x2="68" y2="85" stroke="#2e6da4" strokeWidth="0.8" opacity="0.5"/><line x1="31" y1="100" x2="69" y2="100" stroke="#2e6da4" strokeWidth="0.8" opacity="0.4"/><text x="50" y="94" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fill="#4a8fc7" opacity="0.7" letterSpacing="1">400ml</text><text x="50" y="118" textAnchor="middle" fontFamily="sans-serif" fontSize="5.5" fill="#4a8fc7" opacity="0.45" letterSpacing="1">FAST ABSORB</text><text x="50" y="155" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.6" letterSpacing="1">BODY ONLY</text></svg> },
            { num:'08', origin:'Bamboo Fibre', name:'Bamboo Sensitive\nCloth', tag:'Intimate Zones · Daily', desc:'Ultra-soft bamboo fibre. Naturally antibacterial. Built for the intimate areas a standard scrub cloth should never touch. Pair with the 4.5pH body wash for a complete clean.',
              svg: <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="22" y="38" width="56" height="84" rx="8" stroke="#4a8fc7" strokeWidth="1.5"/><rect x="30" y="46" width="40" height="68" rx="5" stroke="#2e6da4" strokeWidth="0.8" opacity="0.4"/>{['58','70','82','94','106'].map((y,i)=><line key={y} x1="30" y1={y} x2="70" y2={y} stroke="#2e6da4" strokeWidth="0.6" opacity={0.45-i*0.04}/>)}{['42','54','66'].map(x=><line key={x} x1={x} y1="46" x2={x} y2="114" stroke="#2e6da4" strokeWidth="0.5" opacity="0.2"/>)}<text x="50" y="30" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fill="#4a8fc7" opacity="0.7" letterSpacing="1">BAMBOO</text><text x="50" y="148" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#4a8fc7" opacity="0.6" letterSpacing="1">ULTRA SOFT</text></svg> },
          ].map(p => (
            <div key={p.num} className="product-card">
              <div className="prod-num">{p.num}</div>
              <div className="prod-origin">{p.origin}</div>
              <div className="prod-name">{p.name.split('\n').map((l,i) => <span key={i}>{l}{i===0 && <br/>}</span>)}</div>
              <div className="prod-visual">{p.svg}</div>
              <div className="prod-body-tag"><div className="pbt-dot" /><span className="pbt-text">{p.tag}</span></div>
              <div className="prod-desc">{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* RITUAL */}
      <section className="ritual-section" id="ritual">
        <div className="ritual-inner">
          <div className="reveal-left">
            <div className="sec-tag">The Ritual</div>
            <h2 className="sec-title">10 Minutes.<br />Every Day.</h2>
            <p className="sec-body" style={{marginBottom:'40px'}}>All five steps happen in the shower you're already taking. The sequence is not arbitrary — each step builds on the last. Follow the numbers.</p>
            <div className="ritual-steps">
              {RITUAL_STEPS.map((s, i) => (
                <div key={i} className={`ritual-step${activeStep === i ? ' active' : ''}`} onClick={() => handleStepClick(i)}>
                  <div className="step-num">{s.num}</div>
                  <div className="step-info">
                    <div className="step-title">{s.title}</div>
                    <div className="step-time">{s.timeLabel}</div>
                    <div className="step-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="ritual-visual reveal">
            <div className="ritual-canvas">
              <div className="ritual-big-num">{step.num}</div>
              <div className="ritual-zone">{step.zone}</div>
              <div className="ritual-step-name">{step.name}</div>
              <div className="ritual-timer">{step.time}</div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <div className="stats-strip">
        {[['66','Days to habit','UCL research. Every design decision in SOLUM is built around making those 66 days achievable.'],
          ['10','Minutes daily','The full body ritual. Stacked onto the shower you\'re already taking. Nothing new to schedule.'],
          ['3','Countries sourced','Korea · Morocco · UK. The best of each tradition. One system.'],
          ['£52','Saved vs. retail','Equivalent products bought separately cost £104/month at retail. The Full sub is £52.']
        ].map(([num, label, note]) => (
          <div key={num} className="stat-item">
            <div className="stat-num">{num}</div>
            <div className="stat-label">{label}</div>
            <div className="stat-note">{note}</div>
          </div>
        ))}
      </div>

      {/* PRICING */}
      <section className="pricing-section" id="pricing">
        <div className="pricing-inner">
          <div className="pricing-header reveal">
            <div className="sec-tag">Pricing</div>
            <h2 className="sec-title">How It Works.</h2>
            <p className="sec-body">One upfront cost to get set up. A lower monthly cost for what runs out. That's the whole model.</p>
          </div>
          <div className="pricing-explainer reveal">
            <div className="pe-item">
              <div className="pe-label">First Box — One Time Only</div>
              <div className="pe-value">£72 / £89</div>
              <div className="pe-note">Includes all physical tools that last 6–12 months — plus your first supply of consumables. You pay this once. Not every month.</div>
            </div>
            <div className="pe-divider" />
            <div className="pe-item">
              <div className="pe-label">Monthly Subscription — Consumables Only</div>
              <div className="pe-value">£40 / £52 per month</div>
              <div className="pe-note">After your first box, only what runs out arrives — body wash, lotion, clay. Full adds argan oil. Pause or cancel any time, no penalty.</div>
            </div>
          </div>
          <div className="pricing-grid reveal">
            {/* Basic */}
            <div className="price-card">
              <div className="price-tag">Complete Daily System</div>
              <div className="price-name">Basic</div>
              <div className="price-box">
                <div className="price-row"><div className="price-row-label"><div className="price-first-label">First Box — One Time</div><div className="price-first-amount">£72</div><div className="price-first-note">All 7 products. Tools last 6–12 months.</div></div></div>
                <div className="price-then">then, every month</div>
                <div className="price-row"><div className="price-row-label"><div className="price-sub-label">Monthly Refills</div><div className="price-sub-amount">£40/mo</div><div className="price-sub-note">Wash + lotion + clay. Cancel any time.</div></div></div>
              </div>
              <div className="price-clarity"><div className="price-clarity-text"><strong>Tools last 6–12 months.</strong> You pay £72 once for the full setup. Then £40/month covers everything that runs out.</div></div>
              <div className="price-items">
                {[
                  ['01 · Body Wash 250ml','🇬🇧 UK'],
                  ['02 · Italy Towel Mitt','Korean Tradition'],
                  ['03 · Exfoliating Cloth','Korean Tradition'],
                  ['04 · Scalp Massager','🇰🇷 Korea'],
                  ['05 · Atlas Clay Mask','🇲🇦 Morocco'],
                  ['07 · Body Lotion 400ml','🇬🇧 UK'],
                  ['08 · Bamboo Sensitive Cloth','Bamboo Fibre'],
                  ['Ritual card + free shipping','Included'],
                ].map(([k,v]) => (
                  <div key={k} className="price-item"><span className="pi-k">{k}</span><span className="pi-v">{v}</span></div>
                ))}
              </div>
              <a href="#" className="btn-price">Start Basic</a>
              <div className="price-cancel">Cancel or pause any time</div>
            </div>
            {/* Full */}
            <div className="price-card featured">
              <div className="price-tag">★ Recommended</div>
              <div className="price-name">Full</div>
              <div className="price-box">
                <div className="price-row"><div className="price-row-label"><div className="price-first-label">First Box — One Time</div><div className="price-first-amount">£89</div><div className="price-first-note">All 8 products. The complete system.</div></div></div>
                <div className="price-then">then, every month</div>
                <div className="price-row"><div className="price-row-label"><div className="price-sub-label">Monthly Refills</div><div className="price-sub-amount">£52/mo</div><div className="price-sub-note">Wash + lotion + clay + argan oil.</div></div></div>
              </div>
              <div className="price-clarity"><div className="price-clarity-text"><strong>Everything in Basic, plus the argan oil.</strong> Applied weekly on damp skin — your skin absorbs it at peak capacity after exfoliation.</div></div>
              <div className="price-items">
                {[
                  ['01 · Body Wash 250ml','🇬🇧 UK'],
                  ['02 · Italy Towel Mitt','Korean Tradition'],
                  ['03 · Exfoliating Cloth','Korean Tradition'],
                  ['04 · Scalp Massager','🇰🇷 Korea'],
                  ['05 · Atlas Clay Mask','🇲🇦 Morocco'],
                  ['06 · Body Oil','🇲🇦 Morocco'],
                  ['07 · Body Lotion 400ml','🇬🇧 UK'],
                  ['08 · Bamboo Sensitive Cloth','Bamboo Fibre'],
                  ['Ritual card + free shipping','Included'],
                ].map(([k,v]) => (
                  <div key={k} className="price-item"><span className="pi-k">{k}</span><span className="pi-v">{v}</span></div>
                ))}
              </div>
              <a href="#" className="btn-price">Start Full</a>
              <div className="price-cancel">Cancel or pause any time</div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-section">
        <div className="how-inner reveal">
          <div className="sec-tag">How It Works</div>
          <h2 className="sec-title">Three Steps.<br />That's It.</h2>
          <div className="how-grid">
            {[['01','One-Time Box','Choose your kit. Pay once. Your box arrives with everything — tools that last 6–12 months, your first round of consumables, and a ritual card. You\'re fully set up from day one.','Ships in 2–3 days · RM Tracked'],
              ['02','Follow The Numbers','Every product is numbered 01–08. The ritual card shows which steps are daily, which are weekly. You don\'t need to think — that\'s the entire point of the system. Sequence is what turns products into a ritual.','Daily: 10 min · Weekly deep ritual: 20 min'],
              ['03','Monthly Refills Only','Each month, only what runs out arrives at your door — body wash, lotion, clay. The tools are already in your home. Pause or cancel any time. No phone calls, no dark patterns, no lock-in.','Cancel any time · No penalty · No lock-in']
            ].map(([num, title, body, detail]) => (
              <div key={num} className="how-step">
                <div className="how-num">{num}</div>
                <div className="how-title">{title}</div>
                <div className="how-body">{body}</div>
                <div className="how-detail">{detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ORIGINS */}
      <section className="origins" id="sourcing">
        <div className="origins-inner">
          <div className="reveal-left">
            <div className="sec-tag">Global Sourcing</div>
            <h2 className="sec-title">Sourced<br />From Where<br />It's Best.</h2>
            <p className="sec-body" style={{marginBottom:'32px'}}>We don't manufacture everything in one factory and call it curated. Every SOLUM product is sourced from the tradition that perfected it. The country of origin is on every label. Always. No exceptions.</p>
            <p className="sec-body">This isn't marketing. Korean exfoliation science is demonstrably different to what's available in the UK. Moroccan rhassoul clay is mined from a specific geological source. You can feel the difference.</p>
          </div>
          <div className="origins-grid reveal">
            {[
              ['🇬🇧','United Kingdom','Amino Acid Body Wash','Preserves skin barrier. The formulation standard most brands ignore to cut costs.'],
              ['🇰🇷','Korea','Nylon Scrub Cloth','The Korean bathhouse standard for 60 years. Nothing exfoliates the body like it.'],
              ['🇰🇷','Korea','Exfoliating Cloth','70cm reach. Dual-texture weave. Addresses the part of the body most men have never properly cleaned.'],
              ['🇰🇷','Korea','Scalp Massager','Silicone. Used during wash. Stimulates blood flow. A maintenance tool, not a luxury.'],
              ['🇲🇦','Morocco','Atlas Clay + Body Oil','Atlas mountain minerals. 1,000-year hammam tradition. Cold-pressed organic oil.'],
              ['🇬🇧','United Kingdom','Body Lotion 400ml','Fast-absorb. CPSR certified. Formulated for the British climate. Applied within 3 minutes.'],
            ].map(([flag, country, product, why]) => (
              <div key={product} className="origin-tile">
                <div className="origin-flag">{flag}</div>
                <div className="origin-country">{country}</div>
                <div className="origin-product">{product}</div>
                <div className="origin-why">{why}</div>
              </div>
            ))}
            <div className="origin-tile" style={{background:'var(--mid)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{textAlign:'center'}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'28px',letterSpacing:'0.1em',color:'var(--bone)',marginBottom:'6px'}}>3</div>
                <div style={{fontSize:'8px',letterSpacing:'4px',textTransform:'uppercase',color:'var(--blue)',fontWeight:600}}>Countries</div>
                <div style={{fontSize:'8px',letterSpacing:'4px',textTransform:'uppercase',color:'var(--blue)',fontWeight:600,marginTop:'2px'}}>One System</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROOF */}
      <section className="proof-section">
        <div className="proof-inner">
          <div className="reveal">
            <div className="sec-tag">Early Subscribers</div>
            <h2 className="sec-title">What Men<br />Are Saying.</h2>
          </div>
          <div className="proof-grid reveal">
            {[
              ['"The first time I used the scrub cloth I was genuinely shocked. I\'d been showering every day for 30 years thinking I was clean. I wasn\'t. The first result alone justified everything."','James T.','Full Ritual · London · 4 months in'],
              ['"I bought this thinking it was going to be another grooming subscription I\'d cancel. The back cloth changed that. I have a back issue — I genuinely couldn\'t reach properly. It solved a problem I\'d had for years."','Marcus R.','World Kit · Manchester · 6 months in'],
              ['"I got this for my partner who claims he \'doesn\'t do skincare.\' He now does the full Sunday ritual without prompting. The numbered system is clever — he doesn\'t have to think about it, so he actually does it."','Sarah K.','World Kit Gift · Bristol · 3 months in'],
            ].map(([quote, name, info]) => (
              <div key={name} className="proof-card">
                <div className="proof-stars">★★★★★</div>
                <div className="proof-quote">{quote}</div>
                <div className="proof-author">
                  <div className="proof-name">{name}</div>
                  <div className="proof-info">{info}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="faq-inner">
          <div className="reveal">
            <div className="sec-tag">Questions</div>
            <h2 className="sec-title" style={{marginBottom:'48px'}}>Answered<br />Plainly.</h2>
          </div>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className={`faq-item${openFaq === i ? ' open' : ''}`}>
              <div className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                {item.q}<span className="faq-toggle">+</span>
              </div>
              <div className="faq-a">{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-tag">Ready?</div>
        <h2 className="cta-title">Start Your<br />Body Ritual Today.</h2>
        <p className="cta-body">One first box. A lower monthly refill after that. Tools that last 6–12 months. Cancel any time. Your body, finally done right.</p>
        <div className="cta-btns">
          <a href="#pricing" className="btn-primary">Get The Full Kit — £89</a>
          <a href="#pricing" className="btn-ghost">Compare all kits</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-inner">
          <div>
            <span className="footer-logo">SOLUM</span>
            <div className="footer-tagline">Your body. Done right.</div>
            <div className="footer-scope">Body Care · Not Face · Not Hair</div>
          </div>
          <div>
            <div className="footer-col-title">The System</div>
            <ul className="footer-links">
              {[['#products','The Products'],['#ritual','The Ritual'],['#sourcing','Global Sourcing'],['#pricing','Pricing']].map(([href,label]) => (
                <li key={href}><a href={href}>{label}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Account</div>
            <ul className="footer-links">
              {['Start Subscription','Manage Subscription','Gift a Kit','Track Order'].map(l => (
                <li key={l}><a href="#">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Company</div>
            <ul className="footer-links">
              {['About SOLUM','Sourcing Standards','Sustainability','Contact'].map(l => (
                <li key={l}><a href="#">{l}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 SOLUM. All rights reserved.</span>
          <span>Body Care · Men's Grooming · UK</span>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",letterSpacing:'.15em',fontSize:'13px'}}>BUILT FROM THE GROUND UP</span>
        </div>
      </footer>
    </>
  );
}
