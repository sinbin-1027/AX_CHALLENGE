import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DetailsPage from './pages/DetailsPage';
import { calcEngine } from './utils/calcEngine';

const API_BASE = 'http://localhost:4001';

const OVERRIDES = {
  headcount: 14,
  fixedTargets: { green_product: 2247000, jawal_veteran: 1420000 },
};

function formatDateTime(str) {
  if (!str) return '';
  const d = new Date(str.replace(' ', 'T'));
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ── 인증 후 레이아웃 ──────────────────────────────────────────────────────────
function AppLayout() {
  const navigate = useNavigate();
  const [rows, setRows]             = useState([]);
  const [result, setResult]         = useState(null);
  const [uploadedAt, setUploadedAt] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const username = localStorage.getItem('username') ?? '사용자';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setInitLoading(false); setShowUpload(true); return; }

    fetch(`${API_BASE}/api/data/latest`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => {
        setRows(data.rows);
        setResult(calcEngine(data.rows, OVERRIDES));
        setUploadedAt(data.uploadedAt);
      })
      .catch(() => setShowUpload(true))
      .finally(() => setInitLoading(false));
  }, []);

  const handleDataLoad = (newRows, meta) => {
    setRows(newRows);
    setResult(calcEngine(newRows, OVERRIDES));
    setUploadedAt(meta?.uploadedAt ?? new Date().toISOString());
    setShowUpload(false);
  };

  // DetailsPage에서 행 추가/삭제 시 calcEngine 재계산
  const handleRowsChange = (newRows) => {
    setRows(newRows);
    setResult(calcEngine(newRows, OVERRIDES));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const mainContent = initLoading ? (
    <div style={S.loading}>데이터 불러오는 중...</div>
  ) : showUpload ? (
    <FileUpload onDataLoad={handleDataLoad} />
  ) : (
    <Routes>
      <Route
        path="/"
        element={
          result ? (
            <Dashboard
              results={result.results}
              totalScore={result.totalScore}
              finalScore={result.finalScore}
              stats={result.stats}
              rows={rows}
            />
          ) : (
            <FileUpload onDataLoad={handleDataLoad} />
          )
        }
      />
      <Route
        path="/details"
        element={<DetailsPage rows={rows} onRowsChange={handleRowsChange} />}
      />
    </Routes>
  );

  return (
    <div style={S.root}>
      <Sidebar />

      <div style={S.main}>
        {/* 상단 헤더 */}
        <div style={S.header}>
          <div style={S.headerLeft}>
            {uploadedAt && !showUpload && (
              <span style={S.uploadedAt}>마지막 업로드: {formatDateTime(uploadedAt)}</span>
            )}
            {!showUpload && result && (
              <button onClick={() => setShowUpload(true)} style={S.updateBtn}>데이터 업데이트</button>
            )}
          </div>
          <div style={S.headerRight}>
            <span style={S.headerUser}>{username}</span>
            <button onClick={handleLogout} style={S.logoutBtn}>로그아웃</button>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div style={S.content}>
          {mainContent}
        </div>
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
        <Route path="/*" element={<PrivateRoute><AppLayout /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

const S = {
  root:       { display: 'flex', minHeight: '100vh', fontFamily: "'Apple SD Gothic Neo', sans-serif" },
  main:       { flex: 1, display: 'flex', flexDirection: 'column', background: '#f0f2f5', minWidth: 0 },
  header:     { background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '0 28px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  uploadedAt: { fontSize: 13, color: '#94a3b8' },
  updateBtn:  { padding: '5px 14px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  headerRight:{ display: 'flex', alignItems: 'center', gap: 14 },
  headerUser: { fontSize: 14, color: '#64748b' },
  logoutBtn:  { padding: '5px 14px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#64748b', cursor: 'pointer' },
  content:    { flex: 1, padding: '24px 28px', overflowY: 'auto' },
  loading:    { textAlign: 'center', padding: '80px 0', fontSize: 15, color: '#94a3b8' },
};
