export default function HeroSection() {
  return (
    <section style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      padding: '120px 48px 80px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '10%', right: '-5%',
        width: 700, height: 700, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(29,110,245,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute', right: -60, top: '50%', transform: 'translateY(-50%)',
        width: 560, height: 560, pointerEvents: 'none',
      }}>
        <svg viewBox="0 0 560 560" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <defs>
            <radialGradient id="globeGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1d6ef5" stopOpacity="0.25"/>
              <stop offset="60%" stopColor="#0a2a6e" stopOpacity="0.15"/>
              <stop offset="100%" stopColor="#060b14" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="coreGrad" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#2a7fff" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#060b14" stopOpacity="0.8"/>
            </radialGradient>
          </defs>
          <circle cx="280" cy="280" r="260" fill="url(#globeGrad)"/>
          <circle cx="280" cy="280" r="220" fill="url(#coreGrad)" stroke="rgba(29,110,245,0.3)" strokeWidth="0.5"/>
          {[0,1,2,3,4,5,6].map(i => (
            <ellipse key={`h${i}`} cx="280" cy="280" rx="220" ry={30 + i * 32}
              stroke="rgba(29,110,245,0.18)" strokeWidth="0.5" fill="none"/>
          ))}
          {[0,1,2,3,4,5,6,7].map(i => (
            <line key={`v${i}`}
              x1={280 + 220 * Math.cos(i * Math.PI / 4)} y1={280 + 10 * Math.sin(i * Math.PI / 4)}
              x2={280 - 220 * Math.cos(i * Math.PI / 4)} y2={280 - 10 * Math.sin(i * Math.PI / 4)}
              stroke="rgba(29,110,245,0.15)" strokeWidth="0.5"/>
          ))}
          {[[180,200],[320,160],[390,240],[220,310],[300,350],[420,300],[160,340]].map(([x,y],i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="4" fill="#1d6ef5" opacity="0.9"/>
              <circle cx={x} cy={y} r="8" fill="#1d6ef5" opacity="0.2"/>
            </g>
          ))}
          <line x1="180" y1="200" x2="320" y2="160" stroke="rgba(29,110,245,0.4)" strokeWidth="0.8"/>
          <line x1="320" y1="160" x2="390" y2="240" stroke="rgba(29,110,245,0.4)" strokeWidth="0.8"/>
          <line x1="390" y1="240" x2="420" y2="300" stroke="rgba(29,110,245,0.3)" strokeWidth="0.8"/>
          <line x1="180" y1="200" x2="220" y2="310" stroke="rgba(29,110,245,0.3)" strokeWidth="0.8"/>
          <line x1="220" y1="310" x2="300" y2="350" stroke="rgba(29,110,245,0.3)" strokeWidth="0.8"/>
          <line x1="300" y1="350" x2="420" y2="300" stroke="rgba(29,110,245,0.25)" strokeWidth="0.8"/>
          <line x1="160" y1="340" x2="220" y2="310" stroke="rgba(29,110,245,0.25)" strokeWidth="0.8"/>
        </svg>
      </div>

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 620 }}>
        <h1 style={{
          fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 700,
          lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 20px',
        }}>
          Scaling customer success,<br />one stack at a time.
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', margin: '0 0 36px', lineHeight: 1.6, maxWidth: 480 }}>
          We build AI-driven, customer-centric solutions to fuel digital transformation and business growth.
        </p>
        <a href="#" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '11px 22px', border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 6, color: '#fff', textDecoration: 'none', fontSize: 14,
          transition: 'border-color 0.15s, background 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#1d6ef5'; e.currentTarget.style.background = 'rgba(29,110,245,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent'; }}
        >
          Get In Touch
          <span style={{ width: 22, height: 22, background: '#1d6ef5', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M6 2l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
        </a>
      </div>
    </section>
  );
}
