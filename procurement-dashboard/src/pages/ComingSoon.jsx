export default function ComingSoon({ title }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '60vh', gap: 16,
    }}>
      <div style={{ fontSize: 52 }}>🚧</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#191F28', letterSpacing: '-0.5px' }}>
        준비중입니다
      </div>
      {title && (
        <div style={{ fontSize: 15, color: '#8B95A1', fontWeight: 500 }}>{title}</div>
      )}
    </div>
  );
}
