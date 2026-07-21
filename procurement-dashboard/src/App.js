import { useState, useMemo, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import DetailsPage from './pages/DetailsPage';
import LoginPage from './pages/LoginPage';
import VendorRecommend from './components/VendorRecommend';
import VendorList from './components/VendorList';
import ComingSoon from './pages/ComingSoon';
import SimulationPage from './pages/SimulationPage';
import IndicatorStatusPage from './pages/IndicatorStatusPage';
import IndicatorDetailPage from './pages/IndicatorDetailPage';
import { calcEngine } from './utils/calcEngine';

const API_BASE   = process.env.REACT_APP_API_URL ?? '';
const FETCH_OPTS = { credentials: 'include', headers: { 'Content-Type': 'application/json' } };

// ── 직군별 지표 제외 목록 ─────────────────────────────────────────────────────

function buildExcludeTargets(groupName) {
  if (groupName === '연수') return [];
  if (groupName === '특화기능') {
    return [
      'sme', 'women_goods', 'women_service', 'women_construction',
      'disabled_enterprise', 'standard_workshop', 'severe_disabled',
      'cooperative', 'tech_development', 'pilot_purchase', 'nep',
      'green_product', 'jawal_veteran', 'innovative_product',
    ];
  }
  return ['innovative_product'];
}

// ── 메인 레이아웃 ─────────────────────────────────────────────────────────────
function AppLayout({ onLogout }) {
  const [departments, setDepartments]         = useState([]);
  const [loadingDepts, setLoadingDepts]       = useState(true);
  const [deptId, setDeptId]                   = useState(null);
  const [apiRowsMap, setApiRowsMap]           = useState({});
  const [loadingRows, setLoadingRows]         = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // ── API 조회 헬퍼 ───────────────────────────────────────────────────────────

  const fetchRows = useCallback((id) => {
    if (!id) return;
    setLoadingRows(true);
    fetch(`${API_BASE}/api/purchases/list?deptId=${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setApiRowsMap(prev => ({ ...prev, [id]: data.rows ?? [] })))
      .catch(e => console.error('지출내역 조회 실패:', e))
      .finally(() => setLoadingRows(false));
  }, []);

  // ── 초기화: 부서 목록 ────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`${API_BASE}/api/departments`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setDepartments(data);
        if (data.length > 0) setDeptId(data[0].id);
      })
      .catch(e => console.error('부서 목록 조회 실패:', e))
      .finally(() => setLoadingDepts(false));
  }, []);

  // ── 부서 변경 시 지출내역 조회 ───────────────────────────────────────────────

  useEffect(() => {
    fetchRows(deptId);
  }, [deptId, fetchRows]);

  // ── 이벤트 핸들러 ───────────────────────────────────────────────────────────

  const handleDeptChange = (e) => setDeptId(Number(e.target.value));

  const handleDataLoad = () => {
    fetchRows(deptId);
    setShowUploadModal(false);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { ...FETCH_OPTS, method: 'POST' });
    } catch { /* ignore */ }
    onLogout();
  };

  // ── rows + calcEngine ────────────────────────────────────────────────────────

  const { activeRows, result, excludedSetFromApi } = useMemo(() => {
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return { activeRows: [], result: null, excludedSetFromApi: new Set() };

    const activeRows = apiRowsMap[deptId] ?? [];

    const excludedSetFromApi = new Set(
      activeRows
        .filter(r => r.__source === 'raw' && r['제외여부'] === 1)
        .map(r => r.__결의번호)
        .filter(Boolean),
    );

    if (!activeRows.length) return { activeRows, result: null, excludedSetFromApi };

    const calcRows = activeRows.filter(r => r.__source !== 'raw' || r['제외여부'] !== 1);

    const isTokwha = dept.group_name === '특화기능';
    const overrides = {
      headcount:    dept.headcount,
      fixedTargets: {
        green_product: dept.green_product_target,
        jawal_veteran: dept.jawal_veteran_target,
      },
      scoreWeight:     isTokwha ? 3  : dept.score_weight,
      totalPoints:     isTokwha ? 10 : Number(dept.total_points),
      targetOverrides: isTokwha ? {
        startup:           { points: 1.0 },
        social_enterprise: { points: 1.0 },
        onnuri_voucher:    { points: 8.0 },
      } : {},
      excludeTargets: buildExcludeTargets(dept.group_name),
    };

    let result = null;
    try { result = calcEngine(calcRows, overrides); }
    catch (e) { console.error('calcEngine 오류:', e); }

    return { activeRows, result, excludedSetFromApi };
  }, [departments, apiRowsMap, deptId]);

  const selectedDept = departments.find(d => d.id === deptId);
  const isYeonsoo    = selectedDept?.group_name === '연수';
  const rowCount     = (apiRowsMap[deptId] ?? []).length;

  return (
    <div style={S.root}>
      <Sidebar />

      <div style={S.main}>
        {/* 상단 헤더 */}
        <div style={S.header}>
          <div style={S.headerLeft}>
            {loadingDepts ? (
              <span style={S.loadingText}>⏳ 부서 목록 불러오는 중…</span>
            ) : (
              <select value={deptId ?? ''} onChange={handleDeptChange} style={S.deptSelect}>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
            {selectedDept && (
              <span style={S.groupBadge}>{selectedDept.group_name}</span>
            )}
            <span style={{ ...S.sourceBadge, ...(loadingRows ? S.sourceBadgeLoading : S.sourceBadgeApi) }}>
              {loadingRows ? '불러오는 중…' : `📂 API 데이터 (${rowCount}건)`}
            </span>
          </div>
          <div style={S.headerRight}>
            <button onClick={() => setShowUploadModal(true)} style={S.updateBtn}>
              데이터 업데이트
            </button>
            <button onClick={handleLogout} style={S.logoutBtn}>
              로그아웃
            </button>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div style={S.content}>
          <Routes>
            <Route path="/" element={
              result ? (
                <Dashboard
                  results={result.results}
                  totalScore={result.totalScore}
                  finalScore={result.finalScore}
                  stats={result.stats}
                  rows={activeRows}
                  maxScore={selectedDept?.score_weight}
                  isYeonsoo={isYeonsoo}
                />
              ) : <ComingSoon title="데이터 없음" />
            } />

            <Route path="/budget/allocation" element={<ComingSoon title="예산 배정액" />} />
            <Route path="/budget/execution"  element={<ComingSoon title="예산 집행액" />} />

            <Route path="/procurement/indicators" element={
              result
                ? <IndicatorStatusPage stats={result.stats} finalScore={result.finalScore} results={result.results} rows={activeRows} isYeonsoo={isYeonsoo} />
                : <ComingSoon title="지표 현황" />
            } />
            <Route path="/procurement/details"  element={<IndicatorDetailPage rows={activeRows} results={result?.results ?? []} isYeonsoo={isYeonsoo} />} />
            <Route path="/procurement/register" element={
              <DetailsPage
                rows={activeRows}
                excludedSet={excludedSetFromApi}
                deptId={deptId}
                onRefresh={() => fetchRows(deptId)}
              />
            } />

            <Route path="/simulation/current"  element={<ComingSoon title="현재 달성률" />} />
            <Route path="/simulation/trend"    element={<ComingSoon title="추이 분석" />} />
            <Route path="/simulation/simulate" element={
              <SimulationPage
                rows={activeRows}
                results={result?.results ?? []}
                finalScore={result?.finalScore ?? 0}
                maxScore={selectedDept?.score_weight}
              />
            } />

            <Route path="/ai/guide"       element={<ComingSoon title="AI 집행가이드" />} />
            <Route path="/ai/regulations" element={<ComingSoon title="규정/가이드" />} />

            <Route path="/data/uploads"   element={<ComingSoon title="업로드 기록" />} />
            <Route path="/data/vendors"   element={<VendorList />} />
            <Route path="/data/recommend" element={<VendorRecommend insufficientKeys={(result?.results ?? []).filter(r => !r.achieved).map(r => r.key)} />} />

            <Route path="/details"     element={<Navigate to="/procurement/register" replace />} />
            <Route path="/vendors"     element={<Navigate to="/data/recommend" replace />} />
            <Route path="/vendor-list" element={<Navigate to="/data/vendors" replace />} />
          </Routes>
        </div>
      </div>

      {showUploadModal && (
        <div style={S.modalOverlay} onClick={() => setShowUploadModal(false)}>
          <div style={S.modalCard} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>엑셀 데이터 업로드</span>
              <button onClick={() => setShowUploadModal(false)} style={S.modalClose}>✕</button>
            </div>
            <div style={S.modalBody}>
              <FileUpload deptId={deptId} onDataLoad={handleDataLoad} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(null); // null=확인 중

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/check`, { credentials: 'include' })
      .then(r => setIsLoggedIn(r.ok))
      .catch(() => setIsLoggedIn(false));
  }, []);

  if (isLoggedIn === null) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: "sans-serif", color: '#8B95A1', fontSize: 15 }}>
        로딩 중…
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<AppLayout onLogout={() => setIsLoggedIn(false)} />} />
      </Routes>
    </BrowserRouter>
  );
}

const S = {
  root:       { display: 'flex', minHeight: '100vh', fontFamily: "-apple-system, 'Pretendard', 'Apple SD Gothic Neo', sans-serif" },
  main:       { flex: 1, display: 'flex', flexDirection: 'column', background: '#F9FAFB', minWidth: 0 },
  header:     { background: '#FFFFFF', borderBottom: '1px solid #F2F4F6', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  deptSelect: { padding: '6px 12px', border: '1px solid #E5E8EB', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#191F28', cursor: 'pointer', background: '#fff', outline: 'none' },
  groupBadge: { fontSize: 12, color: '#6B7684', background: '#F2F4F6', padding: '3px 10px', borderRadius: 12, fontWeight: 500 },
  loadingText:        { fontSize: 13, color: '#8B95A1', fontStyle: 'italic' },
  sourceBadge:        { fontSize: 12, padding: '3px 10px', borderRadius: 12, fontWeight: 500 },
  sourceBadgeApi:     { color: '#16a34a', background: '#dcfce7' },
  sourceBadgeLoading: { color: '#6B7684', background: '#F2F4F6' },
  headerRight:{ display: 'flex', alignItems: 'center', gap: 10 },
  updateBtn:  { padding: '6px 16px', background: '#3182F6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  logoutBtn:  { padding: '6px 14px', background: '#fff', color: '#8B95A1', border: '1px solid #E5E8EB', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  content:    { flex: 1, padding: '24px 28px', overflowY: 'auto' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalCard:    { background: '#fff', borderRadius: 16, width: 560, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden' },
  modalHeader:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #F2F4F6' },
  modalTitle:   { fontSize: 16, fontWeight: 700, color: '#191F28' },
  modalClose:   { background: 'none', border: 'none', fontSize: 18, color: '#8B95A1', cursor: 'pointer', lineHeight: 1, padding: '2px 6px' },
  modalBody:    { padding: '24px' },
};
