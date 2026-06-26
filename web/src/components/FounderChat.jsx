import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.js';

const DISMISS_KEY = 'founder_chat_dismissed';
const FULL_DISMISS_KEY = 'founder_chat_full_dismissed';

const SUGGESTED = [
  { label: 'Why SOLUM?',          text: 'Why did you build SOLUM and what makes it different?' },
  { label: 'GROUND at £65?',      text: 'Is the GROUND kit at £65 worth it?' },
  { label: 'RITUAL at £85?',      text: 'Is the RITUAL kit at £85 worth it?' },
];

function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

const CSS = `
.fc-launcher{
  position:fixed;bottom:24px;right:24px;z-index:9000;
  display:flex;align-items:center;gap:10px;
}
.fc-launcher-label{
  background:#181C24;border:1px solid #1e2530;
  border-radius:20px;padding:8px 14px;
  font-size:11px;letter-spacing:1px;
  color:rgba(240,236,226,0.6);
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
  white-space:nowrap;cursor:pointer;
}
.fc-launcher-label:hover{color:#F0ECE2;border-color:#2E6DA4;}
.fc-avatar{
  width:48px;height:48px;border-radius:50%;
  border:2px solid #2E6DA4;
  object-fit:cover;object-position:center top;
  cursor:pointer;
  box-shadow:0 4px 20px rgba(46,109,164,0.4);
  flex-shrink:0;
  transition:transform .2s;
}
.fc-avatar:hover{transform:scale(1.05);}
.fc-avatar-wrap{position:relative;flex-shrink:0;}
.fc-launcher-dismiss{
  position:absolute;top:-6px;right:-6px;
  width:20px;height:20px;border-radius:50%;
  background:#181C24;border:1px solid #1e2530;
  color:rgba(240,236,226,0.6);
  font-size:11px;line-height:1;cursor:pointer;
  display:flex;align-items:center;justify-content:center;padding:0;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
  box-shadow:0 2px 8px rgba(0,0,0,0.5);
}
.fc-launcher-dismiss:hover{color:#F0ECE2;border-color:#2E6DA4;}

.fc-bubble{
  position:fixed;bottom:86px;right:24px;z-index:9000;
  max-width:240px;
  background:#181C24;border:1px solid #2E6DA4;
  border-radius:12px 12px 0 12px;
  padding:14px 16px;
  font-size:13px;color:#F0ECE2;line-height:1.5;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
  animation:fc-fade-in .3s ease;
  box-shadow:0 4px 20px rgba(0,0,0,0.4);
}
.fc-bubble-actions{
  margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;
}
.fc-bubble-cta{
  font-size:12px;color:#4A8FC7;
  background:none;border:none;cursor:pointer;padding:0;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
}
.fc-bubble-cta:hover{color:#F0ECE2;}
.fc-bubble-dismiss{
  background:none;border:none;cursor:pointer;padding:0;
  font-size:11px;color:rgba(240,236,226,0.35);
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
}
.fc-bubble-dismiss:hover{color:rgba(240,236,226,0.7);}

.fc-panel{
  position:fixed;bottom:86px;right:24px;z-index:9000;
  width:320px;max-width:calc(100vw - 32px);
  background:#08090B;border:1px solid #1e2530;
  border-radius:16px;overflow:hidden;
  box-shadow:0 8px 40px rgba(0,0,0,0.7);
  display:flex;flex-direction:column;
  animation:fc-fade-in .2s ease;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
}
@keyframes fc-fade-in{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}

.fc-header{
  background:#181C24;border-bottom:1px solid #1e2530;
  padding:14px 16px;display:flex;align-items:center;gap:10px;
  flex-shrink:0;
}
.fc-header-avatar{
  width:36px;height:36px;border-radius:50%;
  border:2px solid #2E6DA4;object-fit:cover;object-position:center top;flex-shrink:0;
}
.fc-header-name{font-size:13px;font-weight:600;color:#F0ECE2;}
.fc-header-title{font-size:10px;color:#4A8FC7;letter-spacing:1px;margin-top:1px;}
.fc-status{display:flex;align-items:center;gap:6px;margin-left:auto;flex-shrink:0;}
.fc-status-dot{width:8px;height:8px;border-radius:50%;background:rgba(240,236,226,0.3);flex-shrink:0;}
.fc-status-text{font-size:11px;color:rgba(240,236,226,0.4);letter-spacing:0.3px;}
.fc-close{
  background:none;border:none;color:rgba(240,236,226,0.4);
  font-size:18px;cursor:pointer;padding:0 0 0 8px;line-height:1;
  transition:color .2s;
}
.fc-close:hover{color:#F0ECE2;}

.fc-messages{
  flex:1;overflow-y:auto;padding:14px;
  display:flex;flex-direction:column;gap:10px;
  max-height:280px;min-height:120px;
}
.fc-msg-ai{
  background:#181C24;border-radius:12px 12px 12px 2px;
  padding:10px 12px;max-width:90%;
  font-size:13px;color:#F0ECE2;line-height:1.55;
}
.fc-msg-user{
  background:#1A4A78;border-radius:12px 12px 2px 12px;
  padding:10px 12px;max-width:90%;align-self:flex-end;
  font-size:13px;color:#fff;line-height:1.55;
}
.fc-typing{display:flex;gap:4px;align-items:center;padding:4px 0;}
.fc-dot{width:6px;height:6px;border-radius:50%;background:#4A8FC7;animation:fc-bounce .9s infinite;}
.fc-dot:nth-child(2){animation-delay:.15s;}
.fc-dot:nth-child(3){animation-delay:.3s;}
@keyframes fc-bounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-5px);}}

.fc-chips{
  padding:0 14px 10px;display:flex;flex-wrap:wrap;gap:6px;flex-shrink:0;
}
.fc-chip{
  background:#181C24;border:1px solid #1e2530;border-radius:20px;
  padding:5px 10px;font-size:11px;color:rgba(240,236,226,0.65);
  cursor:pointer;transition:border-color .2s,color .2s;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
}
.fc-chip:hover{border-color:#2E6DA4;color:#F0ECE2;}
.fc-chip-email{color:#4A8FC7;border-color:#1A4A78;}
.fc-chip-email:hover{border-color:#4A8FC7;}

.fc-input-row{
  border-top:1px solid #1e2530;padding:10px 14px;
  display:flex;gap:8px;align-items:center;flex-shrink:0;
}
.fc-input{
  flex:1;background:none;border:none;outline:none;
  font-size:13px;color:#F0ECE2;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
}
.fc-input::placeholder{color:rgba(240,236,226,0.3);}
.fc-send{
  width:30px;height:30px;border-radius:50%;
  background:#2E6DA4;border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;transition:background .2s;
}
.fc-send:hover{background:#4A8FC7;}
.fc-send:disabled{background:#1e2530;cursor:not-allowed;}
`;

function MdText({ text }) {
  return (
    <span style={{ display: 'block' }}>
      {text.split('\n').map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((chunk, j) => {
          if (chunk.startsWith('**') && chunk.endsWith('**')) {
            return <strong key={j}>{chunk.slice(2, -2)}</strong>;
          }
          return chunk;
        });
        return <span key={i} style={{ display: 'block', marginTop: i > 0 && line === '' ? 6 : 0 }}>{parts}</span>;
      })}
    </span>
  );
}

export default function FounderChat() {
  const [open, setOpen]       = useState(false);
  const [bubble, setBubble]   = useState(false);
  const [launched, setLaunch] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey — I built SOLUM from scratch. What do you want to know?" }
  ]);
  const [input, setInput]  = useState('');
  const [loading, setLoad] = useState(false);
  const bottomRef          = useRef(null);
  const sessionId          = useRef(genId());

  // Surface launcher + bubble after 1m 20s
  useEffect(() => {
    if (sessionStorage.getItem(FULL_DISMISS_KEY)) return; // user fully dismissed — never resurface
    const bubbleDismissed = !!sessionStorage.getItem(DISMISS_KEY);
    const t = setTimeout(() => {
      setLaunch(true);
      if (!bubbleDismissed) setBubble(true);
    }, 80000);
    return () => clearTimeout(t);
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setBubble(false);
  }

  function fullyDismiss() {
    sessionStorage.setItem(FULL_DISMISS_KEY, '1');
    setBubble(false);
    setLaunch(false);
    setOpen(false);
  }

  function openChat() {
    setBubble(false);
    setOpen(true);
    sessionStorage.setItem(DISMISS_KEY, '1');
  }

  async function send(text) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    const next = [...messages, { role: 'user', content: msg }];
    setMessages(next);
    setLoad(true);
    try {
      const { data, error } = await supabase.functions.invoke('founder-chat', {
        body: {
          message:    msg,
          history:    next.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
          session_id: sessionId.current,
          page_path:  window.location.pathname,
        },
      });
      if (error) throw error;
      const reply = data.reply ?? '';
      // Hold the reply back — delay based on response length (simulates typing) + random jitter
      const typingMs = Math.min(1500 + reply.length * 14 + Math.random() * 900, 5500);
      await new Promise(r => setTimeout(r, typingMs));
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Something went wrong — email harsha@bysolum.com and I'll get back to you.",
      }]);
    } finally {
      setLoad(false);
    }
  }

  if (!launched && !open) return null;

  return (
    <>
      <style>{CSS}</style>

      {/* Bubble prompt */}
      {bubble && !open && (
        <div className="fc-bubble">
          Got a question about the kit? I built SOLUM — ask me anything.
          <div className="fc-bubble-actions">
            <button className="fc-bubble-cta" onClick={openChat}>Ask now →</button>
            <button className="fc-bubble-dismiss" onClick={dismiss}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Open chat panel */}
      {open && (
        <div className="fc-panel">
          <div className="fc-header">
            <img src="/harsha.jpg" alt="Harsha" className="fc-header-avatar" />
            <div>
              <div className="fc-header-name">Harsha</div>
              <div className="fc-header-title">Founder · SOLUM</div>
            </div>
            <div className="fc-status">
              <span className="fc-status-dot" />
              <span className="fc-status-text">Offline</span>
            </div>
            <button className="fc-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>

          <div className="fc-messages">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'fc-msg-user' : 'fc-msg-ai'}>
                {m.role === 'assistant' ? <MdText text={m.content} /> : m.content}
              </div>
            ))}
            {loading && (
              <div className="fc-msg-ai">
                <div className="fc-typing">
                  <span className="fc-dot" /><span className="fc-dot" /><span className="fc-dot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="fc-chips">
            {SUGGESTED.map(s => (
              <button key={s.label} className="fc-chip" onClick={() => send(s.text)}>
                {s.label}
              </button>
            ))}
            <button
              className="fc-chip fc-chip-email"
              onClick={() => { window.location.href = 'mailto:harsha@bysolum.com?subject=Question%20about%20SOLUM'; }}
            >
              Email Harsha →
            </button>
          </div>

          <div className="fc-input-row">
            <input
              className="fc-input"
              placeholder="Ask anything..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              autoFocus
            />
            <button
              className="fc-send"
              onClick={() => send()}
              disabled={!input.trim() || loading}
              aria-label="Send"
            >
              <span style={{ color: '#fff', fontSize: 13, lineHeight: 1 }}>↑</span>
            </button>
          </div>
        </div>
      )}

      {/* Launcher — always visible once surfaced */}
      {!open && launched && (
        <div className="fc-launcher">
          {!bubble && (
            <span className="fc-launcher-label" onClick={openChat}>Ask Harsha</span>
          )}
          <div className="fc-avatar-wrap">
            <img
              src="/harsha.jpg"
              alt="Ask Harsha"
              className="fc-avatar"
              onClick={openChat}
            />
            {!bubble && (
              <button
                className="fc-launcher-dismiss"
                onClick={fullyDismiss}
                aria-label="Dismiss Harsha for this visit"
                title="Dismiss"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
