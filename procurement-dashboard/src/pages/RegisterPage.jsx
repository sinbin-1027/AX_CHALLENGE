import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_BASE = 'http://localhost:4001';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ username: '', password: '', department: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h2 style={S.title}>공공구매 대시보드</h2>
        <p style={S.sub}>회원가입</p>

        <form onSubmit={handleSubmit} style={S.form}>
          <label style={S.label}>아이디</label>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            style={S.input}
            placeholder="아이디 입력"
            autoFocus
            required
          />

          <label style={S.label}>비밀번호 (6자 이상)</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            style={S.input}
            placeholder="비밀번호 입력"
            required
          />

          <label style={S.label}>부서명 (선택)</label>
          <input
            name="department"
            value={form.department}
            onChange={handleChange}
            style={S.input}
            placeholder="예: 총무과"
          />

          {error && <div style={S.error}>{error}</div>}

          <button type="submit" style={S.btn} disabled={loading}>
            {loading ? '처리 중...' : '회원가입'}
          </button>
        </form>

        <p style={S.footer}>
          이미 계정이 있으신가요?{' '}
          <Link to="/login" style={S.link}>로그인</Link>
        </p>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: '100vh',
    background: '#F9FAFB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    background: '#FFFFFF',
    borderRadius: 20,
    padding: '44px 48px',
    width: 400,
    border: '1px solid #F2F4F6',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: '#191F28',
    margin: 0,
    textAlign: 'center',
    letterSpacing: '-0.5px',
  },
  sub: {
    fontSize: 14,
    color: '#8B95A1',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 28,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#191F28', marginBottom: 4 },
  input: {
    padding: '12px 16px',
    borderRadius: 10,
    border: '1px solid #F2F4F6',
    fontSize: 14,
    outline: 'none',
    marginBottom: 12,
    width: '100%',
    boxSizing: 'border-box',
    background: '#F9FAFB',
    color: '#191F28',
  },
  error: {
    padding: '10px 14px',
    background: '#FFF0F1',
    color: '#F04452',
    borderRadius: 10,
    fontSize: 13,
    marginBottom: 8,
  },
  btn: {
    marginTop: 4,
    padding: '13px',
    background: '#3182F6',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
    letterSpacing: '-0.2px',
  },
  footer: { textAlign: 'center', fontSize: 13, color: '#8B95A1', marginTop: 22, marginBottom: 0 },
  link: { color: '#3182F6', textDecoration: 'none', fontWeight: 600 },
};
