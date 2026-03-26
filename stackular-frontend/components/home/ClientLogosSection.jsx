export default function ClientLogosSection() {
  return (
    <section style={{ padding: '32px 48px 80px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
        {['RFICO', 'aramark', 'DELL', 'Deloitte.', 'WARNER BROS.', 'Ub'].map(logo => (
          <span key={logo} style={{ fontSize: logo === 'Deloitte.' ? 20 : 16, fontWeight: logo === 'DELL' ? 700 : 500, color: 'rgba(255,255,255,0.3)', letterSpacing: logo === 'DELL' ? '0.05em' : 0 }}>
            {logo}
          </span>
        ))}
      </div>
    </section>
  );
}
