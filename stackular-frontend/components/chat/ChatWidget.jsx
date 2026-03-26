'use client';

import { useState, useRef, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_CHATBOT_API_URL || 'http://localhost:8000';

const SUGGESTIONS = [
  'What services do you offer?',
  'Who founded Stackular?',
  'Open positions',
  'Contact Information'
];

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignSelf: 'flex-start', maxWidth: '85%' }}>
      <div style={{
        padding: '10px 14px',
        background: '#f3f4f6',
        borderRadius: '12px 12px 12px 3px',
        display: 'flex', gap: '4px', alignItems: 'center'
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: '50%', background: '#9ca3af',
            animation: 'bounce 1.2s infinite',
            animationDelay: `${i * 0.2}s`,
            display: 'inline-block'
          }} />
        ))}
      </div>
    </div>
  );
}

function Message({ role, text }) {
  const isBot = role === 'bot';

  // Simple markdown renderer for bold and links
  const renderText = (str) => {
    const parts = str.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer"
          style={{ color: '#4f8ef7', textDecoration: 'none' }}>{linkMatch[1]}</a>;
      }
      return part;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignSelf: isBot ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
      <div style={{
        padding: '9px 12px',
        borderRadius: isBot ? '12px 12px 12px 3px' : '12px 12px 3px 12px',
        fontSize: 13,
        lineHeight: 1.5,
        background: isBot ? '#f3f4f6' : '#1a1a2e',
        color: isBot ? '#111827' : '#ffffff',
        whiteSpace: 'pre-wrap',
      }}>
        {renderText(text)}
      </div>
    </div>
  );
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi! I'm Stackular's assistant. Ask me anything about our services, team, or how we can help your business. 👋" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const fetchAnswer = async (question) => {
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', text: question }]);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'bot', text: data.answer }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: 'I\'m having trouble connecting right now. Please visit [stackular.com](https://www.stackular.com) directly.'
      }]);
    }

    setIsLoading(false);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    setShowSuggestions(false);
    fetchAnswer(text);
  };

  const handleChip = (text) => {
    setShowSuggestions(false);
    fetchAnswer(text);
  };

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        @keyframes widgetOpen {
          from { opacity: 0; transform: scale(0.85) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Floating bubble */}
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24,
          width: 52, height: 52, borderRadius: '50%',
          background: '#1a1a2e', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, transition: 'transform 0.2s ease',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        aria-label="Open chat"
      >
        {isOpen ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: 88, right: 24,
          width: 340, height: 480,
          background: '#ffffff', borderRadius: 16,
          border: '0.5px solid rgba(0,0,0,0.1)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', zIndex: 9998,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          animation: 'widgetOpen 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>

          {/* Header */}
          <div style={{
            background: '#1a1a2e', padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#fff' }}>Stackular Assistant</p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Online · replies instantly
              </p>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 14px 8px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {messages.map((msg, i) => <Message key={i} role={msg.role} text={msg.text} />)}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion chips */}
          {showSuggestions && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 14px 10px', flexShrink: 0 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => handleChip(s)} style={{
                  fontSize: 11, padding: '5px 10px',
                  border: '0.5px solid #e5e7eb', borderRadius: 20,
                  background: '#fff', color: '#6b7280',
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.color = '#111827'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6b7280'; }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', borderTop: '0.5px solid #f3f4f6', flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question..."
              style={{
                flex: 1, border: 'none', background: 'transparent',
                fontSize: 13, fontFamily: 'inherit', outline: 'none',
                color: '#111827',
              }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: isLoading || !input.trim() ? '#e5e7eb' : '#1a1a2e',
                border: 'none', cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s', flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
              </svg>
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: 10, color: '#9ca3af', padding: '0 0 8px', margin: 0, flexShrink: 0 }}>
            Powered by Stackular AI
          </p>
        </div>
      )}
    </>
  );
}