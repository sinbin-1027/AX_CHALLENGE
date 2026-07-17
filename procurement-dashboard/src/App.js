import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DetailsPage from './pages/DetailsPage';
import VendorRecommend from './components/VendorRecommend';
import VendorList from './components/VendorList';
import ComingSoon from './pages/ComingSoon';
import IndicatorStatusPage from './pages/IndicatorStatusPage';
import IndicatorDetailPage from './pages/IndicatorDetailPage';
import { calcEngine } from './utils/calcEngine';

const API_BASE = process.env.REACT_APP_API_URL;

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

    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_BASE}/api/purchases/calc`, { headers }).then(r => r.ok ? r.json() : Promise.reject()),
      fetch(`${API_BASE}/api/purchases/list`, { headers }).then(r => r.ok ? r.json() : Promise.reject()),
    ])
      .then(([calcData, listData]) => {
        const calcRows = calcData.rows ?? [];
        const listRows = listData.rows ?? [];
        if (!calcRows.length && !listRows.length) { setShowUpload(true); return; }
        setRows(listRows);
        try { setResult(calcRows.length ? calcEngine(calcRows, OVERRIDES) : null); }
        catch (e) { console.error('calcEngine 오류:', e); setResult(null); }
      })
      .catch(() => setShowUpload(true))
      .finally(() => setInitLoading(false));
  }, []);

  // 최신 데이터 재조회 — calc(계산용) + list(표시용) 동시 갱신
  const refreshData = () => {
    const token   = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    return Promise.all([
      fetch(`${API_BASE}/api/purchases/calc`, { headers }).then(r => r.ok ? r.json() : Promise.reject(new Error(`calc ${r.status}`))),
      fetch(`${API_BASE}/api/purchases/list`, { headers }).then(r => r.ok ? r.json() : Promise.reject(new Error(`list ${r.status}`))),
    ]).then(([calcData, listData]) => {
      const calcRows = calcData.rows ?? [];
      const listRows = listData.rows ?? [];
      setRows(listRows);
      try { setResult(calcRows.length ? calcEngine(calcRows, OVERRIDES) : null); }
      catch (e) { console.error('calcEngine 오류:', e); setResult(null); }
    });
  };

  // 업로드 완료 → Excel 원본 대신 API 재조회 (삭제된 행 자동 제외)
  const handleDataLoad = (_newRows, meta) => {
    setUploadedAt(meta?.uploadedAt ?? new Date().toISOString());
    setShowUpload(false);
    refreshData().catch(e => {
      console.error('데이터 조회 실패:', e);
      setShowUpload(true);
    });
  };

  // DetailsPage에서 행 추가/삭제 시 calcEngine 재계산

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
      {/* 예산현황 */}
      <Route path="/budget/allocation" element={<ComingSoon title="예산 배정액" />} />
      <Route path="/budget/execution"  element={<ComingSoon title="예산 집행액" />} />

      {/* 공공구매 관리 */}
      <Route path="/procurement/indicators" element={
        result
          ? <IndicatorStatusPage stats={result.stats} finalScore={result.finalScore} results={result.results} />
          : <ComingSoon title="지표 현황" />
      } />
      <Route path="/procurement/details"    element={<IndicatorDetailPage rows={rows} results={result?.results ?? []} />} />
      <Route path="/procurement/register"   element={<DetailsPage rows={rows} onRefresh={refreshData} />} />

      {/* 시뮬레이션 */}
      <Route path="/simulation/current"  element={<ComingSoon title="현재 달성률" />} />
      <Route path="/simulation/trend"    element={<ComingSoon title="추이 분석" />} />
      <Route path="/simulation/simulate" element={<ComingSoon title="실적 시뮬레이션" />} />

      {/* AI분석/지원 */}
      <Route path="/ai/guide"       element={<ComingSoon title="AI 집행가이드" />} />
      <Route path="/ai/regulations" element={<ComingSoon title="규정/가이드" />} />

      {/* 데이터 관리 */}
      <Route path="/data/uploads"   element={<ComingSoon title="업로드 기록" />} />
      <Route path="/data/vendors"   element={<VendorList />} />
      <Route path="/data/recommend" element={<VendorRecommend results={result?.results ?? []} />} />

      {/* 구버전 경로 리다이렉트 */}
      <Route path="/details"     element={<Navigate to="/procurement/register" replace />} />
      <Route path="/vendors"     element={<Navigate to="/data/recommend" replace />} />
      <Route path="/vendor-list" element={<Navigate to="/data/vendors" replace />} />
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
  root:       { display: 'flex', minHeight: '100vh', fontFamily: "-apple-system, 'Pretendard', 'Apple SD Gothic Neo', sans-serif" },
  main:       { flex: 1, display: 'flex', flexDirection: 'column', background: '#F9FAFB', minWidth: 0 },
  header:     { background: '#FFFFFF', borderBottom: '1px solid #F2F4F6', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  uploadedAt: { fontSize: 13, color: '#8B95A1' },
  updateBtn:  { padding: '6px 16px', background: '#3182F6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  headerRight:{ display: 'flex', alignItems: 'center', gap: 14 },
  headerUser: { fontSize: 14, color: '#8B95A1', fontWeight: 500 },
  logoutBtn:  { padding: '6px 16px', background: 'transparent', border: '1px solid #F2F4F6', borderRadius: 8, fontSize: 13, color: '#8B95A1', cursor: 'pointer' },
  content:    { flex: 1, padding: '24px 28px', overflowY: 'auto' },
  loading:    { textAlign: 'center', padding: '80px 0', fontSize: 15, color: '#8B95A1' },
};
