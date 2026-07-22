import { useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '';

export default function LoginPage({ onLogin }) {
  const [id, setId]           = useState('');
  const [pw, setPw]           = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: id, password: pw }),
      });
      if (res.ok) {
        const { token } = await res.json();
        localStorage.setItem('token', token);
        onLogin();
      } else {
        setError('접속 정보가 올바르지 않습니다');
      }
    } catch {
      setError('서버에 연결할 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logoWrap}>
          <span style={S.logoIcon}>📊</span>
          <span style={S.logoText}>예산 및 공공구매 현황 대시보드</span>
        </div>
        <div style={S.title}>로그인</div>
        <form onSubmit={handleSubmit} style={S.form}>
          <div style={S.field}>
            <label style={S.label}>아이디</label>
            <input
              type="text"
              value={id}
              onChange={e => setId(e.target.value)}
              style={S.input}
              placeholder="아이디를 입력하세요"
              autoComplete="username"
              autoFocus
            />
          </div>
          <div style={S.field}>
            <label style={S.label}>비밀번호</label>
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              style={S.input}
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
            />
          </div>
          {error && <div style={S.error}>{error}</div>}
          <button type="submit" style={{ ...S.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}

const S = {
  page:     { minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "-apple-system, 'Pretendard', 'Apple SD Gothic Neo', sans-serif" },
  card:     { background: '#fff', borderRadius: 20, padding: '44px 40px 40px', width: 380, boxShadow: '0 4px 32px rgba(0,0,0,0.08)' },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 },
  logoIcon: { fontSize: 22 },
  logoText: { fontSize: 15, fontWeight: 700, color: '#3182F6', letterSpacing: '-0.3px' },
  title:    { fontSize: 26, fontWeight: 800, color: '#191F28', marginBottom: 28, letterSpacing: '-0.8px' },
  form:     { display: 'flex', flexDirection: 'column', gap: 18 },
  field:    { display: 'flex', flexDirection: 'column', gap: 7 },
  label:    { fontSize: 14, fontWeight: 600, color: '#191F28' },
  input:    { padding: '14px 16px', border: '1.5px solid #E5E8EB', borderRadius: 12, fontSize: 15, outline: 'none', color: '#191F28', background: '#F9FAFB', transition: 'border-color 0.15s' },
  error:    { padding: '12px 14px', borderRadius: 10, background: '#FFF0F1', color: '#F04452', fontSize: 13, fontWeight: 500 },
  btn:      { marginTop: 6, padding: '16px', background: '#3182F6', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.3px', transition: 'opacity 0.15s' },
};
