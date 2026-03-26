export default function Navbar() {
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 48px', height: 64, position: 'fixed', top: 0, left: 0, right: 0,
      background: 'rgba(6,11,20,0.92)', backdropFilter: 'blur(12px)',
      borderBottom: '0.5px solid rgba(255,255,255,0.07)', zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect width="14" height="14" rx="2" fill="#1d6ef5"/>
          <rect x="18" width="14" height="14" rx="2" fill="#1d6ef5" opacity="0.5"/>
          <rect y="18" width="14" height="14" rx="2" fill="#1d6ef5" opacity="0.5"/>
        </svg>
        <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>STACKULAR</span>
      </div>

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
  );
}
