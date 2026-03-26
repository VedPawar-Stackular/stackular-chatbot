export default function WorldMapSection() {
  return (
    <section style={{
      margin: '0 32px 48px', borderRadius: 16,
      background: 'linear-gradient(135deg, #0d1b2e 0%, #0a1525 100%)',
      border: '0.5px solid rgba(255,255,255,0.07)',
      padding: '48px', display: 'flex', gap: 48, alignItems: 'center',
      flexWrap: 'wrap',
    }}>
      <div style={{ flex: '1 1 340px', minWidth: 280, opacity: 0.85 }}>
        <svg viewBox="0 0 500 280" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%' }}>
          <path d="M60 60 L120 50 L140 70 L130 110 L110 130 L80 140 L60 120 L50 90 Z" fill="rgba(29,110,245,0.25)" stroke="rgba(29,110,245,0.4)" strokeWidth="0.5"/>
          <path d="M100 160 L130 155 L140 180 L130 220 L110 240 L90 220 L85 190 Z" fill="rgba(29,110,245,0.2)" stroke="rgba(29,110,245,0.35)" strokeWidth="0.5"/>
          <path d="M210 50 L250 45 L260 65 L250 80 L225 85 L210 70 Z" fill="rgba(29,110,245,0.25)" stroke="rgba(29,110,245,0.4)" strokeWidth="0.5"/>
          <path d="M215 100 L250 95 L265 120 L260 170 L240 195 L215 185 L200 155 L205 120 Z" fill="rgba(29,110,245,0.2)" stroke="rgba(29,110,245,0.35)" strokeWidth="0.5"/>
          <path d="M270 40 L380 35 L400 55 L390 90 L350 110 L290 105 L265 80 Z" fill="rgba(29,110,245,0.25)" stroke="rgba(29,110,245,0.4)" strokeWidth="0.5"/>
          <path d="M320 110 L340 108 L345 140 L330 150 L315 135 Z" fill="rgba(29,110,245,0.2)" stroke="rgba(29,110,245,0.35)" strokeWidth="0.5"/>
          <path d="M380 160 L430 155 L445 180 L430 205 L390 200 L375 180 Z" fill="rgba(29,110,245,0.2)" stroke="rgba(29,110,245,0.35)" strokeWidth="0.5"/>

          <circle cx="115" cy="90" r="5" fill="#1d6ef5" opacity="0.95"/>
          <circle cx="115" cy="90" r="9" fill="#1d6ef5" opacity="0.2"/>
          <circle cx="108" cy="138" r="4" fill="#1d6ef5" opacity="0.8"/>
          <circle cx="108" cy="138" r="7" fill="#1d6ef5" opacity="0.15"/>
          <circle cx="328" cy="128" r="5" fill="#1d6ef5" opacity="0.95"/>
          <circle cx="328" cy="128" r="9" fill="#1d6ef5" opacity="0.2"/>

          <line x1="115" y1="90" x2="328" y2="128" stroke="rgba(29,110,245,0.3)" strokeWidth="0.8" strokeDasharray="4 3"/>
          <line x1="115" y1="90" x2="108" y2="138" stroke="rgba(29,110,245,0.3)" strokeWidth="0.8" strokeDasharray="4 3"/>
        </svg>
      </div>

      <div style={{ flex: '1 1 280px' }}>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, lineHeight: 1.2, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
          Zero sales tactics. Just honest, straightforward conversations.
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: '0 0 20px' }}>
          We're a dedicated team of trusted IT advisors with years of industry experience and over 100+ elite consultants in the USA, Costa Rica and India. We utilize cutting-edge technologies and industry best practices to develop efficient and scalable solutions to enhance productivity and streamline processes.
        </p>
      </div>
    </section>
  );
}
