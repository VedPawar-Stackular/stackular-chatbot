'use client';

import { useState, useRef, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_CHATBOT_API_URL || 'http://localhost:8000';

const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

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
        background: 'rgba(255, 255, 255, 0.04)',
        border: '0.5px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px 12px 12px 3px',
        display: 'flex', gap: '4px', alignItems: 'center'
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.4)',
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

  // Robust markdown renderer for bold text and hyperlinks
  const renderText = (str) => {
    if (!str) return null;
    
    // Pattern to match [link text](url) and **bold text**
    const regex = /(\[.*?\]\(.*?\))|(\*\*.*?\*\*)/g;
    const parts = str.split(regex);
    
    return parts.map((part, i) => {
      if (!part) return null;

      // Handle Markdown Link: [text](url)
      if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
        const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
        if (linkMatch) {
          return (
            <a 
              key={i} 
              href={linkMatch[2]} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                color: '#1d6ef5', 
                textDecoration: 'underline', 
                fontWeight: 600,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {linkMatch[1]}
            </a>
          );
        }
      }

      // Handle Markdown Bold: **text**
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: '#fff', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }

      // Return plain text
      return <span key={i}>{part}</span>;
    });
  };

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
        whiteSpace: 'pre-wrap',
        boxShadow: isBot ? 'none' : '0 4px 12px rgba(29, 110, 245, 0.2)',
      }}>
        {renderText(text)}
      </div>
    </div>
  );
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Welcome to Stackular! How can we help you today? 👋" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [sessionId, setSessionId] = useState('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Generate a simple unique session ID on mount
    const newSessionId = Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    setSessionId(newSessionId);
  }, []);

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
        body: JSON.stringify({ question, session_id: sessionId }),
      });

      if (!res.ok) throw new Error('API Error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        if (isFirstChunk && chunk.trim()) {
          setIsLoading(false);
          setMessages(prev => [...prev, { role: 'bot', text: fullText }]);
          isFirstChunk = false;
        } else if (!isFirstChunk) {
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { role: 'bot', text: fullText };
            return newMessages;
          });
        }
      }
    } catch (err) {
      console.error('Streaming error:', err);
      setIsLoading(false);
      setMessages(prev => [...prev, {
        role: 'bot',
        text: 'I\'m having trouble connecting right now. Please visit [stackular.co](https://www.stackular.co) directly.'
      }]);
    }
    setIsLoading(false);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
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
          zIndex: 9999, transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
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
        aria-label="Open chat"
      >
        {isOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" stroke="white" strokeWidth="0.5"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: 104, right: 32,
          width: 360, height: 520,
          background: 'rgba(6, 11, 20, 0.96)', 
          backdropFilter: 'blur(20px)',
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', zIndex: 9998,
          boxShadow: '0 12px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          animation: 'widgetOpen 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>

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
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
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
          <div style={{
            flex: 1, overflowY: 'auto', padding: '20px',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            {messages.map((msg, i) => <Message key={i} role={msg.role} text={msg.text} />)}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion chips */}
          {showSuggestions && (
            <div style={{ display: 'flex', overflowX: 'auto', gap: 8, padding: '0 20px 16px', flexShrink: 0, scrollbarWidth: 'none' }}>
              <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
              <div className="hide-scrollbar" style={{ display: 'flex', gap: 8 }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => handleChip(s)} style={{
                    fontSize: 11, padding: '7px 14px',
                    border: '1px solid rgba(255, 255, 255, 0.15)', 
                    borderRadius: 8,
                    background: 'transparent', 
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
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

          {/* Input row */}
          <div style={{
            background: 'rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', flexShrink: 0,
          }}>
            <button
              onClick={toggleListening}
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill={isListening ? 'white' : 'rgba(255,255,255,0.45)'}>
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={isListening ? "Listening..." : "Type your message..."}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                fontSize: 13, fontFamily: 'inherit', outline: 'none',
                color: '#ffffff',
              }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: isLoading || !input.trim() ? 'rgba(255, 255, 255, 0.05)' : '#1d6ef5',
                border: 'none', cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease', flexShrink: 0,
                boxShadow: isLoading || !input.trim() ? 'none' : '0 4px 12px rgba(29, 110, 245, 0.3)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
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