import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_BASE = 'http://localhost:4001';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ username: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      navigate('/');
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
        <p style={S.sub}>로그인</p>

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

          <label style={S.label}>비밀번호</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            style={S.input}
            placeholder="비밀번호 입력"
            required
          />

          {error && <div style={S.error}>{error}</div>}

          <button type="submit" style={S.btn} disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p style={S.footer}>
          계정이 없으신가요?{' '}
          <Link to="/register" style={S.link}>회원가입</Link>
        </p>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: '100vh',
    background: '#f0f2f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '40px 48px',
    width: 380,
    boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 28,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 2 },
  input: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    fontSize: 14,
    outline: 'none',
    marginBottom: 12,
    width: '100%',
    boxSizing: 'border-box',
  },
  error: {
    padding: '10px 12px',
    background: '#fef2f2',
    color: '#ef4444',
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 8,
  },
  btn: {
    marginTop: 4,
    padding: '11px',
    background: '#1677ff',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  footer: { textAlign: 'center', fontSize: 13, color: '#94a3b8', marginTop: 20, marginBottom: 0 },
  link: { color: '#1677ff', textDecoration: 'none', fontWeight: 500 },
};
