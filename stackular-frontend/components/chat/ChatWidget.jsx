'use client';

import { useState, useRef, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_CHATBOT_API_URL || 'http://localhost:8000';

const SpeechRecognition =
  typeof window !== 'undefined' &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

const SUGGESTIONS = [
  'What services do you offer?',
  'Who founded Stackular?',
  'Open positions',
  'Contact Information',
];

// High-intent is now an analytics signal only (the lead-capture card was removed).
const HIGH_INTENT = /\b(pricing|price|cost|quote|how much|demo|hire|engage|work with|partner|start a project|get started|project rate|rate card|retainer)\b/i;


// ---------- analytics (fire-and-forget; never blocks or breaks the chat) ----------

function postJSON(path, payload) {
  try {
    fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics must never surface an error to the user */
  }
}


// ---------- helpers ----------

function sourceLabel(url) {
  try {
    const u = new URL(url);
    const seg = u.pathname.split('/').filter(Boolean).pop();
    const raw = seg ? seg.replace(/[-_]/g, ' ') : u.hostname.replace(/^www\./, '');
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  } catch {
    return 'Source';
  }
}

function isSafeUrl(url) {
  return /^https?:\/\//.test(url) || (typeof url === 'string' && url.startsWith('/'));
}


// ---------- sub-components ----------

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignSelf: 'flex-start', maxWidth: '85%' }} aria-label="Assistant is typing">
      <div style={{
        padding: '10px 14px',
        background: 'rgba(255, 255, 255, 0.04)',
        border: '0.5px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px 12px 12px 3px',
        display: 'flex', gap: '4px', alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.4)',
            animation: 'bounce 1.2s infinite',
            animationDelay: `${i * 0.2}s`,
            display: 'inline-block',
          }} />
        ))}
      </div>
    </div>
  );
}

function renderInline(str, baseKey) {
  if (!str) return null;
  const regex = /(\*\*[^*]+\*\*)|(\[[^\]]*\]\([^)]*\))|(`[^`]+`)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`${baseKey}-t${lastIndex}`}>{str.slice(lastIndex, match.index)}</span>);
    }
    const m = match[0];
    const k = `${baseKey}-m${match.index}`;
    if (m.startsWith('**')) {
      parts.push(<strong key={k} style={{ fontWeight: 700 }}>{m.slice(2, -2)}</strong>);
    } else if (m.startsWith('[')) {
      const lm = m.match(/\[([^\]]*)\]\(([^)]*)\)/);
      if (lm) {
        const safe = isSafeUrl(lm[2]);
        parts.push(safe
          ? <a key={k} href={lm[2]} target="_blank" rel="noopener noreferrer"
              style={{ color: '#1d6ef5', textDecoration: 'underline', fontWeight: 600 }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>{lm[1]}</a>
          : <span key={k}>{lm[1]}</span>
        );
      }
    } else if (m.startsWith('`')) {
      parts.push(
        <code key={k} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 3, padding: '1px 4px', fontFamily: 'monospace', fontSize: 12 }}>
          {m.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < str.length) {
    parts.push(<span key={`${baseKey}-t${lastIndex}`}>{str.slice(lastIndex)}</span>);
  }
  return parts;
}

function renderMarkdown(str) {
  if (!str) return null;
  const lines = str.split('\n');
  const result = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (/^[-*] /.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i].trim())) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      result.push(
        <ul key={key++} style={{ margin: '2px 0 4px', paddingLeft: 18, listStyleType: 'disc' }}>
          {items.map((item, j) => <li key={j} style={{ marginBottom: 2 }}>{renderInline(item, `ul${key}-${j}`)}</li>)}
        </ul>
      );
      continue;
    }
    if (/^\d+\. /.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\. /, ''));
        i++;
      }
      result.push(
        <ol key={key++} style={{ margin: '2px 0 4px', paddingLeft: 18 }}>
          {items.map((item, j) => <li key={j} style={{ marginBottom: 2 }}>{renderInline(item, `ol${key}-${j}`)}</li>)}
        </ol>
      );
      continue;
    }
    if (!trimmed) {
      result.push(<div key={key++} style={{ height: 6 }} />);
      i++;
      continue;
    }
    result.push(<p key={key++} style={{ margin: '0 0 3px' }}>{renderInline(lines[i], `p${key}`)}</p>);
    i++;
  }
  return result;
}

function SourcesFooter({ sources }) {
  // Only the single most-relevant source is shown — a wall of citation chips
  // read as noise, and the reranked top result is the one worth surfacing.
  const safe = sources.filter(isSafeUrl).slice(0, 1);
  if (safe.length === 0) return null;
  return (
    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Sources
      </span>
      {safe.map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
          style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 6,
            background: 'rgba(29,110,245,0.1)', border: '1px solid rgba(29,110,245,0.25)',
            color: '#7eb0ff', textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
          {sourceLabel(url)}
        </a>
      ))}
    </div>
  );
}

function MessageActions({ msg, onCopy, onFeedback, copied }) {
  const iconBtn = (extra = {}) => ({
    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
    color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 1,
    display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'inherit',
    transition: 'color 0.15s', ...extra,
  });
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
      <button
        onClick={() => onCopy(msg)}
        aria-label="Copy message"
        title="Copy"
        style={iconBtn()}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
      >
        {copied ? '✓ Copied' : '⧉ Copy'}
      </button>
      <button
        onClick={() => onFeedback(msg, 'up')}
        aria-label="Helpful"
        title="Helpful"
        style={iconBtn({ color: msg.feedback === 'up' ? '#4ade80' : 'rgba(255,255,255,0.4)' })}
      >
        👍
      </button>
      <button
        onClick={() => onFeedback(msg, 'down')}
        aria-label="Not helpful"
        title="Not helpful"
        style={iconBtn({ color: msg.feedback === 'down' ? '#ef4444' : 'rgba(255,255,255,0.4)' })}
      >
        👎
      </button>
    </div>
  );
}

function Message({ msg, onCopy, onFeedback, onRetry, copied }) {
  const isBot = msg.role === 'bot';
  const showActions = isBot && msg.id && !msg.error;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignSelf: isBot ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
      <div style={{
        padding: '10px 14px',
        borderRadius: isBot ? '12px 12px 12px 3px' : '12px 12px 3px 12px',
        fontSize: 13,
        lineHeight: 1.55,
        background: isBot ? 'rgba(255, 255, 255, 0.05)' : '#1d6ef5',
        color: '#ffffff',
        border: isBot ? '0.5px solid rgba(255, 255, 255, 0.1)' : 'none',
        boxShadow: isBot ? 'none' : '0 4px 12px rgba(29, 110, 245, 0.2)',
      }}>
        {isBot ? renderMarkdown(msg.text) : <span>{msg.text}</span>}
        {isBot && msg.sources?.length > 0 && !msg.error && <SourcesFooter sources={msg.sources} />}
      </div>

      {showActions && (
        <MessageActions msg={msg} onCopy={onCopy} onFeedback={onFeedback} copied={copied} />
      )}

      {isBot && msg.error && (
        <button
          onClick={onRetry}
          style={{
            alignSelf: 'flex-start', marginTop: 6, fontSize: 11, fontWeight: 600,
            padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
            background: 'rgba(29,110,245,0.12)', border: '1px solid rgba(29,110,245,0.35)', color: '#7eb0ff',
          }}
        >
          ↻ Retry
        </button>
      )}
    </div>
  );
}

// ---------- main widget ----------

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Welcome to Stackular! How can we help you today? 👋" },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);   // awaiting first token (typing indicator)
  const [isStreaming, setIsStreaming] = useState(false); // request in flight (enables Stop)
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [sessionId, setSessionId] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [botExchangeCount, setBotExchangeCount] = useState(0);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const chipsRef = useRef(null);
  const abortRef = useRef(null);
  const lastQuestionRef = useRef('');
  const chatStartedRef = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const trackEvent = (name, props) => {
    if (!sessionId) return;
    postJSON('/event', { name, session_id: sessionId, props: props || {} });
  };

  const checkChipsScroll = () => {
    const el = chipsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    if (!isOpen || !showSuggestions) return;
    const el = chipsRef.current;
    if (!el) return;
    requestAnimationFrame(checkChipsScroll);
    el.addEventListener('scroll', checkChipsScroll);
    return () => el.removeEventListener('scroll', checkChipsScroll);
  }, [isOpen, showSuggestions]);

  // Fresh session ID on every mount — chat resets on page refresh (intentional, no persistence).
  useEffect(() => {
    setSessionId(Math.random().toString(36).substring(2, 11) + Date.now().toString(36));
  }, []);

  // Fire chat_started once, the first time the widget is opened.
  useEffect(() => {
    if (isOpen && sessionId && !chatStartedRef.current) {
      chatStartedRef.current = true;
      trackEvent('chat_started');
    }
  }, [isOpen, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const fetchAnswer = async (question, { isRetry = false } = {}) => {
    const isHighIntent = HIGH_INTENT.test(question);
    lastQuestionRef.current = question;
    setIsLoading(true);
    setIsStreaming(true);
    if (!isRetry) {
      setMessages(prev => [...prev, { role: 'user', text: question }]);
    }

    trackEvent('message_sent', { high_intent: isHighIntent });
    if (isHighIntent) trackEvent('high_intent_matched');

    const controller = new AbortController();
    abortRef.current = controller;

    // Local accumulators for this single response (loop is single-threaded).
    const botId = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let fullText = '';
    let sources = [];
    let errored = false;
    let aborted = false;

    // Whether to append or replace-last is decided from the actual queued state
    // (matching on botId), not an external flag. setMessages(prev => ...) only
    // *schedules* the updater — React may run several queued updaters back to
    // back later, so a plain outer-scope "already created?" flag can flip true
    // before earlier updaters actually run, making them replace the prior
    // message (the visitor's own bubble) instead of appending the new one.
    const writeBot = () => {
      const payload = { role: 'bot', id: botId, text: fullText, sources, error: errored };
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.id === botId) {
          const next = [...prev];
          next[next.length - 1] = payload;
          return next;
        }
        return [...prev, payload];
      });
    };

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, session_id: sessionId }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`API ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sep;
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const block = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const dataLine = block.split('\n').find(l => l.startsWith('data:'));
          if (!dataLine) continue;
          let evt;
          try { evt = JSON.parse(dataLine.slice(5).trim()); } catch { continue; }

          if (evt.type === 'sources') {
            sources = Array.isArray(evt.data) ? evt.data : [];
            writeBot();
          } else if (evt.type === 'token') {
            setIsLoading(false); // hide typing indicator once text starts (no-op if already false)
            fullText += evt.data;
            writeBot();
          } else if (evt.type === 'error') {
            errored = true;
            fullText = evt.data || 'Something went wrong. Please try again.';
            sources = [];
            writeBot();
          }
          // 'done' needs no extra handling.
        }
      }
      decoder.decode();
    } catch (err) {
      if (err.name === 'AbortError') {
        aborted = true;
      } else {
        console.error('Streaming error:', err);
        errored = true;
        fullText = "I'm having trouble connecting right now. Please try again, or visit [stackular.com](https://www.stackular.com/contact-us) directly.";
        sources = [];
        writeBot();
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortRef.current = null;
    }

    if (!errored && !aborted) {
      setBotExchangeCount(c => c + 1);
    }
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    trackEvent('stop_clicked');
  };

  const handleRetry = () => {
    trackEvent('retry_clicked');
    // Drop the errored bot message, then re-ask without re-adding the user message.
    setMessages(prev => {
      const next = [...prev];
      if (next.length && next[next.length - 1].role === 'bot' && next[next.length - 1].error) {
        next.pop();
      }
      return next;
    });
    fetchAnswer(lastQuestionRef.current, { isRetry: true });
  };

  const handleCopy = (msg) => {
    try {
      navigator.clipboard?.writeText(msg.text);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(c => (c === msg.id ? null : c)), 1500);
    } catch { /* clipboard unavailable */ }
  };

  const handleFeedback = (msg, rating) => {
    setMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, feedback: rating } : m)));
    postJSON('/feedback', { session_id: sessionId, message_id: msg.id, rating });
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error !== 'no-speech') console.warn('Voice error:', e.error);
    };
    recognition.onresult = (event) => setInput(event.results[0][0].transcript);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    setShowSuggestions(false);
    fetchAnswer(text);
  };

  const handleChip = (text) => {
    if (isStreaming) return;
    setShowSuggestions(false);
    trackEvent('chip_clicked', { text });
    fetchAnswer(text);
  };

  const showHumanCTA = botExchangeCount >= 3;

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        @keyframes widgetOpen {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Floating bubble */}
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 32, right: 32,
          width: 56, height: 56, borderRadius: '50%',
          background: '#1d6ef5', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          boxShadow: '0 8px 24px rgba(29, 110, 245, 0.35)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(29, 110, 245, 0.5)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(29, 110, 245, 0.35)';
        }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden="true">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" stroke="white" strokeWidth="0.5"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: 104, right: 32,
          width: 'min(450px, calc(100vw - 32px))',
          height: 750,
          background: 'rgba(6, 11, 20, 0.96)',
          backdropFilter: 'blur(20px)',
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', zIndex: 9998,
          boxShadow: '0 12px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          animation: 'widgetOpen 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        role="dialog"
        aria-label="Stackular AI Assistant">

          {/* Header */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            padding: '18px 20px',
            display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'rgba(29, 110, 245, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <rect width="10" height="10" rx="2" fill="#1d6ef5"/>
                <rect x="13" width="10" height="10" rx="2" fill="#1d6ef5" opacity="0.6"/>
                <rect y="13" width="10" height="10" rx="2" fill="#1d6ef5" opacity="0.6"/>
              </svg>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: '0.01em' }}>STACKULAR</p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255, 255, 255, 0.45)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                AI Assistant · Active
              </p>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1, overflowY: 'auto', padding: '20px',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {messages.map((msg, i) => (
              <Message
                key={msg.id || i}
                msg={msg}
                onCopy={handleCopy}
                onFeedback={handleFeedback}
                onRetry={handleRetry}
                copied={copiedId === msg.id}
              />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion chips */}
          {showSuggestions && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <style>{`.chip-row::-webkit-scrollbar { display: none; }`}</style>
              {canScrollLeft && (
                <button onClick={() => chipsRef.current.scrollBy({ left: -130, behavior: 'smooth' })} aria-label="Scroll suggestions left" style={{
                  position: 'absolute', left: 4, top: '40%', transform: 'translateY(-50%)', zIndex: 2,
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'rgba(20,20,32,0.95)', border: '1px solid rgba(255,255,255,0.18)',
                  color: '#fff', fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                }}>‹</button>
              )}
              {canScrollRight && (
                <button onClick={() => chipsRef.current.scrollBy({ left: 130, behavior: 'smooth' })} aria-label="Scroll suggestions right" style={{
                  position: 'absolute', right: 4, top: '40%', transform: 'translateY(-50%)', zIndex: 2,
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'rgba(20,20,32,0.95)', border: '1px solid rgba(255,255,255,0.18)',
                  color: '#fff', fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                }}>›</button>
              )}
              <div ref={chipsRef} className="chip-row" style={{ display: 'flex', overflowX: 'auto', gap: 8, padding: '0 20px 16px', scrollbarWidth: 'none' }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => handleChip(s)} style={{
                    fontSize: 11, padding: '7px 14px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 8, background: 'transparent',
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.2s ease', whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(29, 110, 245, 0.1)';
                      e.currentTarget.style.borderColor = '#1d6ef5';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* "Talk to the team" CTA — appears after 3 exchanges */}
          {showHumanCTA && (
            <div style={{
              background: 'rgba(29, 110, 245, 0.07)',
              borderTop: '1px solid rgba(29, 110, 245, 0.18)',
              padding: '9px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Ready to get started?</span>
              <a
                href="https://www.stackular.com/contact-us"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('cta_clicked', { location: 'cta_bar' })}
                style={{ fontSize: 11, color: '#1d6ef5', fontWeight: 600, textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
              >
                Talk to the team →
              </a>
            </div>
          )}

          {/* Input row */}
          <div style={{
            background: 'rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px',
            borderTop: showHumanCTA ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
            flexShrink: 0,
          }}>
            <button
              onClick={toggleListening}
              aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              style={{
                background: isListening ? '#ef4444' : 'transparent',
                border: 'none', cursor: 'pointer', padding: 4, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
                boxShadow: isListening ? '0 0 12px rgba(239, 68, 68, 0.4)' : 'none',
                flexShrink: 0,
              }}
              title={isListening ? 'Stop Listening' : 'Voice Typing'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={isListening ? 'white' : 'rgba(255,255,255,0.45)'} aria-hidden="true">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={isListening ? 'Listening...' : 'Type your message...'}
              aria-label="Type your message"
              maxLength={1000}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                fontSize: 13, fontFamily: 'inherit', outline: 'none',
                color: '#ffffff',
              }}
            />
            {isStreaming ? (
              <button
                onClick={stopStreaming}
                aria-label="Stop generating"
                title="Stop"
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: '#ef4444', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s ease', flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                  <rect x="5" y="5" width="14" height="14" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                aria-label="Send message"
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: !input.trim() ? 'rgba(255, 255, 255, 0.05)' : '#1d6ef5',
                  border: 'none',
                  cursor: !input.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s ease', flexShrink: 0,
                  boxShadow: !input.trim() ? 'none' : '0 4px 12px rgba(29, 110, 245, 0.3)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            )}
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', textAlign: 'center', padding: '0 0 10px', flexShrink: 0 }}>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Engineered by Stackular
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
