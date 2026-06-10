import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { calcEngine } from './utils/calcEngine';

const API_BASE = 'http://localhost:4001';

const OVERRIDES = {
  headcount: 14,
  fixedTargets: {
    green_product: 2247000,
    jawal_veteran:  1420000,
  },
};

function formatDateTime(str) {
  if (!str) return '';
  const d = new Date(str.replace(' ', 'T'));
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function DashboardPage() {
  const navigate = useNavigate();
  const [result, setResult]         = useState(null);
  const [uploadedAt, setUploadedAt] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const username = localStorage.getItem('username') ?? '사용자';

  // 앱 시작 시 최신 데이터 조회
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setInitLoading(false); setShowUpload(true); return; }

    fetch(`${API_BASE}/api/data/latest`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        setResult(calcEngine(data.rows, OVERRIDES));
        setUploadedAt(data.uploadedAt);
        setShowUpload(false);
      })
      .catch(() => setShowUpload(true))
      .finally(() => setInitLoading(false));
  }, []);

  const handleDataLoad = (rows, meta) => {
    setResult(calcEngine(rows, OVERRIDES));
    setUploadedAt(meta?.uploadedAt ?? new Date().toISOString());
    setShowUpload(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/login');
  };

  return (
    <div style={S.page}>
      {/* 헤더 */}
      <div style={S.header}>
        <span style={S.headerTitle}>공공구매 실적 대시보드</span>
        <div style={S.headerRight}>
          {uploadedAt && !showUpload && (
            <>
              <span style={S.uploadedAt}>마지막 업로드: {formatDateTime(uploadedAt)}</span>
              <button onClick={() => { setShowUpload(true); }} style={S.updateBtn}>
                데이터 업데이트
              </button>
            </>
          )}
          <span style={S.headerUser}>{username}</span>
          <button onClick={handleLogout} style={S.logoutBtn}>로그아웃</button>
        </div>
      </div>

      {/* 본문 */}
      <div style={S.body}>
        {initLoading ? (
          <div style={S.loading}>데이터 불러오는 중...</div>
        ) : showUpload ? (
          <FileUpload onDataLoad={handleDataLoad} />
        ) : result ? (
          <Dashboard
            results={result.results}
            totalScore={result.totalScore}
            finalScore={result.finalScore}
            stats={result.stats}
          />
        ) : (
          <FileUpload onDataLoad={handleDataLoad} />
        )}
      </div>
    </div>
  );
}

function PrivateRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

const S = {
  page:        { minHeight: '100vh', background: '#f0f2f5', fontFamily: 'sans-serif' },
  header:      { background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  headerTitle: { fontSize: 17, fontWeight: 700, color: '#1e293b' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 16 },
  uploadedAt:  { fontSize: 13, color: '#94a3b8' },
  updateBtn:   { padding: '6px 14px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  headerUser:  { fontSize: 14, color: '#64748b' },
  logoutBtn:   { padding: '6px 16px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#64748b', cursor: 'pointer' },
  body:        { maxWidth: 1200, margin: '0 auto', padding: '32px 24px' },
  loading:     { textAlign: 'center', padding: '80px 0', fontSize: 15, color: '#94a3b8' },
};
