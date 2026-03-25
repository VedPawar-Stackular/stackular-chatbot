'use client';

export default function Home() {
  return (
    <main style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#060b14', color: '#fff', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 64, position: 'fixed', top: 0, left: 0, right: 0,
        background: 'rgba(6,11,20,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '0.5px solid rgba(255,255,255,0.07)', zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="14" height="14" rx="2" fill="#1d6ef5"/>
            <rect x="18" width="14" height="14" rx="2" fill="#1d6ef5" opacity="0.5"/>
            <rect y="18" width="14" height="14" rx="2" fill="#1d6ef5" opacity="0.5"/>
          </svg>
          <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>STACKULAR</span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          {['Home', 'About', 'Services', 'Industries', 'Portfolio', 'Join Us'].map((item, i) => (
            <a key={item} href="#" style={{
              fontSize: 14, color: i === 0 ? '#fff' : 'rgba(255,255,255,0.6)',
              textDecoration: 'none', transition: 'color 0.15s',
              borderBottom: i === 0 ? '1.5px solid #1d6ef5' : 'none',
              paddingBottom: i === 0 ? 2 : 0,
            }}
              onMouseEnter={e => e.target.style.color = '#fff'}
              onMouseLeave={e => { if (i !== 0) e.target.style.color = 'rgba(255,255,255,0.6)' }}
            >{item}</a>
          ))}
          <a href="#" style={{
            fontSize: 14, padding: '8px 20px', background: '#1d6ef5',
            color: '#fff', borderRadius: 6, textDecoration: 'none',
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.target.style.background = '#1558d0'}
            onMouseLeave={e => e.target.style.background = '#1d6ef5'}
          >Contact Us</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        padding: '120px 48px 80px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '10%', right: '-5%',
          width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(29,110,245,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Globe illustration */}
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
            {/* Grid lines */}
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
            {/* Connection dots */}
            {[[180,200],[320,160],[390,240],[220,310],[300,350],[420,300],[160,340]].map(([x,y],i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="4" fill="#1d6ef5" opacity="0.9"/>
                <circle cx={x} cy={y} r="8" fill="#1d6ef5" opacity="0.2"/>
              </g>
            ))}
            {/* Connection lines */}
            <line x1="180" y1="200" x2="320" y2="160" stroke="rgba(29,110,245,0.4)" strokeWidth="0.8"/>
            <line x1="320" y1="160" x2="390" y2="240" stroke="rgba(29,110,245,0.4)" strokeWidth="0.8"/>
            <line x1="390" y1="240" x2="420" y2="300" stroke="rgba(29,110,245,0.3)" strokeWidth="0.8"/>
            <line x1="180" y1="200" x2="220" y2="310" stroke="rgba(29,110,245,0.3)" strokeWidth="0.8"/>
            <line x1="220" y1="310" x2="300" y2="350" stroke="rgba(29,110,245,0.3)" strokeWidth="0.8"/>
            <line x1="300" y1="350" x2="420" y2="300" stroke="rgba(29,110,245,0.25)" strokeWidth="0.8"/>
            <line x1="160" y1="340" x2="220" y2="310" stroke="rgba(29,110,245,0.25)" strokeWidth="0.8"/>
          </svg>
        </div>

        {/* Hero text */}
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

      {/* ── WORLD MAP / HONEST SECTION ── */}
      <section style={{
        margin: '0 32px 48px', borderRadius: 16,
        background: 'linear-gradient(135deg, #0d1b2e 0%, #0a1525 100%)',
        border: '0.5px solid rgba(255,255,255,0.07)',
        padding: '48px', display: 'flex', gap: 48, alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        {/* World map SVG */}
        <div style={{ flex: '1 1 340px', minWidth: 280, opacity: 0.85 }}>
          <svg viewBox="0 0 500 280" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%' }}>
            {/* Simplified world map continents */}
            {/* North America */}
            <path d="M60 60 L120 50 L140 70 L130 110 L110 130 L80 140 L60 120 L50 90 Z" fill="rgba(29,110,245,0.25)" stroke="rgba(29,110,245,0.4)" strokeWidth="0.5"/>
            {/* South America */}
            <path d="M100 160 L130 155 L140 180 L130 220 L110 240 L90 220 L85 190 Z" fill="rgba(29,110,245,0.2)" stroke="rgba(29,110,245,0.35)" strokeWidth="0.5"/>
            {/* Europe */}
            <path d="M210 50 L250 45 L260 65 L250 80 L225 85 L210 70 Z" fill="rgba(29,110,245,0.25)" stroke="rgba(29,110,245,0.4)" strokeWidth="0.5"/>
            {/* Africa */}
            <path d="M215 100 L250 95 L265 120 L260 170 L240 195 L215 185 L200 155 L205 120 Z" fill="rgba(29,110,245,0.2)" stroke="rgba(29,110,245,0.35)" strokeWidth="0.5"/>
            {/* Asia */}
            <path d="M270 40 L380 35 L400 55 L390 90 L350 110 L290 105 L265 80 Z" fill="rgba(29,110,245,0.25)" stroke="rgba(29,110,245,0.4)" strokeWidth="0.5"/>
            {/* India bump */}
            <path d="M320 110 L340 108 L345 140 L330 150 L315 135 Z" fill="rgba(29,110,245,0.2)" stroke="rgba(29,110,245,0.35)" strokeWidth="0.5"/>
            {/* Australia */}
            <path d="M380 160 L430 155 L445 180 L430 205 L390 200 L375 180 Z" fill="rgba(29,110,245,0.2)" stroke="rgba(29,110,245,0.35)" strokeWidth="0.5"/>

            {/* Office location pins */}
            {/* USA - Maryland */}
            <circle cx="115" cy="90" r="5" fill="#1d6ef5" opacity="0.95"/>
            <circle cx="115" cy="90" r="9" fill="#1d6ef5" opacity="0.2"/>
            {/* Costa Rica */}
            <circle cx="108" cy="138" r="4" fill="#1d6ef5" opacity="0.8"/>
            <circle cx="108" cy="138" r="7" fill="#1d6ef5" opacity="0.15"/>
            {/* India - Hyderabad */}
            <circle cx="328" cy="128" r="5" fill="#1d6ef5" opacity="0.95"/>
            <circle cx="328" cy="128" r="9" fill="#1d6ef5" opacity="0.2"/>

            {/* Connection lines between offices */}
            <line x1="115" y1="90" x2="328" y2="128" stroke="rgba(29,110,245,0.3)" strokeWidth="0.8" strokeDasharray="4 3"/>
            <line x1="115" y1="90" x2="108" y2="138" stroke="rgba(29,110,245,0.3)" strokeWidth="0.8" strokeDasharray="4 3"/>
          </svg>
        </div>

        {/* Text content */}
        <div style={{ flex: '1 1 280px' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, lineHeight: 1.2, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            Zero sales tactics. Just honest, straightforward conversations.
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: '0 0 20px' }}>
            We're a dedicated team of trusted IT advisors with years of industry experience and over 100+ elite consultants in the USA, Costa Rica and India. We utilize cutting-edge technologies and industry best practices to develop efficient and scalable solutions to enhance productivity and streamline processes.
          </p>
        </div>
      </section>

      {/* ── CLIENT LOGOS ── */}
      <section style={{ padding: '32px 48px 80px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
          {['RFICO', 'aramark', 'DELL', 'Deloitte.', 'WARNER BROS.', 'Ub'].map(logo => (
            <span key={logo} style={{ fontSize: logo === 'Deloitte.' ? 20 : 16, fontWeight: logo === 'DELL' ? 700 : 500, color: 'rgba(255,255,255,0.3)', letterSpacing: logo === 'DELL' ? '0.05em' : 0 }}>
              {logo}
            </span>
          ))}
        </div>
      </section>

    </main>
  );
}