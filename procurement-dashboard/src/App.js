import { useState, useMemo, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DetailsPage from './pages/DetailsPage';
import LoginPage from './pages/LoginPage';
import VendorRecommend from './components/VendorRecommend';
import VendorList from './components/VendorList';
import ComingSoon from './pages/ComingSoon';
import SimulationPage from './pages/SimulationPage';
import IndicatorStatusPage from './pages/IndicatorStatusPage';
import IndicatorDetailPage from './pages/IndicatorDetailPage';
import BudgetAllocationPage from './pages/BudgetAllocationPage';
import BudgetExecutionTrendPage from './pages/BudgetExecutionTrendPage';
import UploadHistoryPage from './pages/UploadHistoryPage';
import GuideListPage from './pages/GuideListPage';
import GuideDetailPage from './pages/GuideDetailPage';
import { calcEngine } from './utils/calcEngine';
import { buildCalcOptions } from './utils/buildCalcOptions';

const API_BASE = process.env.REACT_APP_API_URL || '';

const token      = localStorage.getItem('token');
const FETCH_OPTS = {
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
};

// ── 메인 레이아웃 ─────────────────────────────────────────────────────────────
function AppLayout({ onLogout }) {
  const [departments, setDepartments]         = useState([]);
  const [loadingDepts, setLoadingDepts]       = useState(true);
  const [deptId, setDeptId]                   = useState(null);
  const [years, setYears]                     = useState([]);
  const [selectedYear, setSelectedYear]       = useState(null);
  const [apiRowsMap, setApiRowsMap]           = useState({});
  const [loadingRows, setLoadingRows]         = useState(false);
  const [budgetSummary, setBudgetSummary]     = useState({ allocatedBudget: null, remainingBudget: null });

  // ── API 조회 헬퍼 ───────────────────────────────────────────────────────────

  const fetchRows = useCallback((id, year) => {
    if (!id || !year) return;
    setLoadingRows(true);
    fetch(`${API_BASE}/api/purchases/list?deptId=${id}&year=${year}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(data => setApiRowsMap(prev => ({ ...prev, [id]: data.rows ?? [] })))
      .catch(e => console.error('지출내역 조회 실패:', e))
      .finally(() => setLoadingRows(false));
  }, []);

  // ── 초기화: 부서 목록 ────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`${API_BASE}/api/departments`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(data => {
        setDepartments(data);
        if (data.length > 0) setDeptId(data[0].id);
      })
      .catch(e => console.error('부서 목록 조회 실패:', e))
      .finally(() => setLoadingDepts(false));
  }, []);

  // ── 초기화: 회계연도 목록 ────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`${API_BASE}/api/years`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(data => {
        setYears(data);
        if (data.length > 0) setSelectedYear(data[0]);
      })
      .catch(e => console.error('회계연도 목록 조회 실패:', e));
  }, []);

  // ── 부서/회계연도 변경 시 지출내역 조회 ─────────────────────────────────────

  useEffect(() => {
    fetchRows(deptId, selectedYear);
  }, [deptId, selectedYear, fetchRows]);

  // ── 부서/회계연도 변경 시 잔여예산 조회 ──────────────────────────────────────

  useEffect(() => {
    if (!deptId || !selectedYear) return;
    fetch(`${API_BASE}/api/budget/remaining?deptId=${deptId}&year=${selectedYear}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(data => setBudgetSummary({ allocatedBudget: data.allocatedBudget, remainingBudget: data.remainingBudget }))
      .catch(e => console.error('잔여예산 조회 실패:', e));
  }, [deptId, selectedYear]);

  // ── 이벤트 핸들러 ───────────────────────────────────────────────────────────

  const handleDeptChange = (e) => setDeptId(Number(e.target.value));
  const handleYearChange = (e) => setSelectedYear(Number(e.target.value));

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { ...FETCH_OPTS, method: 'POST' });
    } catch { /* ignore */ }
    localStorage.removeItem('token');
    onLogout();
  };

  // ── rows + calcEngine ────────────────────────────────────────────────────────

  const { activeRows, result, excludedSetFromApi, calcOptions } = useMemo(() => {
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return { activeRows: [], result: null, excludedSetFromApi: new Set(), calcOptions: null };

    const activeRows = apiRowsMap[deptId] ?? [];

    const excludedSetFromApi = new Set(
      activeRows
        .filter(r => r.__source === 'raw' && r['제외여부'] === 1)
        .map(r => r.__결의번호)
        .filter(Boolean),
    );

    const calcOptions = buildCalcOptions(dept);

    if (!activeRows.length) return { activeRows, result: null, excludedSetFromApi, calcOptions };

    const calcRows = activeRows.filter(r => r.__source !== 'raw' || r['제외여부'] !== 1);

    let result = null;
    try { result = calcEngine(calcRows, calcOptions); }
    catch (e) { console.error('calcEngine 오류:', e); }

    return { activeRows, result, excludedSetFromApi, calcOptions };
  }, [departments, apiRowsMap, deptId]);

  const selectedDept = departments.find(d => d.id === deptId);
  const isYeonsoo    = selectedDept?.group_name === '연수';

  return (
    <div style={S.root}>
      <Sidebar />

      <div style={S.main}>
        {/* 상단 헤더 */}
        <div style={S.header}>
          <div style={S.headerLeft}>
            {loadingDepts ? (
              <span style={S.loadingText}>부서 목록 불러오는 중…</span>
            ) : (
              <select value={deptId ?? ''} onChange={handleDeptChange} style={S.deptSelect}>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
            {years.length > 0 && (
              <select value={selectedYear ?? ''} onChange={handleYearChange} style={S.deptSelect}>
                {years.map(y => (
                  <option key={y} value={y}>{y}년</option>
                ))}
              </select>
            )}
            {selectedDept && (
              <span style={S.groupBadge}>{selectedDept.group_name}직군</span>
            )}
          </div>
          <div style={S.headerRight}>
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
                  stats={{ ...result.stats, ...budgetSummary }}
                  rows={activeRows}
                  maxScore={selectedDept?.score_weight}
                  isYeonsoo={isYeonsoo}
                />
              ) : <ComingSoon title="데이터 없음" />
            } />

            <Route path="/budget/allocation" element={<BudgetAllocationPage deptId={deptId} year={selectedYear} />} />

            <Route path="/procurement/indicators" element={
              result
                ? <IndicatorStatusPage stats={{ ...result.stats, ...budgetSummary }} finalScore={result.finalScore} maxScore={selectedDept?.score_weight} results={result.results} rows={activeRows} isYeonsoo={isYeonsoo} />
                : <ComingSoon title="지표 현황" />
            } />
            <Route path="/procurement/details"  element={<IndicatorDetailPage rows={activeRows} results={result?.results ?? []} groupName={selectedDept?.group_name} />} />
            <Route path="/procurement/register" element={
              <DetailsPage
                rows={activeRows}
                excludedSet={excludedSetFromApi}
                deptId={deptId}
                onRefresh={() => fetchRows(deptId, selectedYear)}
              />
            } />

            <Route path="/procurement/simulation" element={
              <SimulationPage
                rows={activeRows}
                results={result?.results ?? []}
                finalScore={result?.finalScore ?? 0}
                maxScore={calcOptions?.scoreWeight ?? selectedDept?.score_weight}
                remainingBudget={budgetSummary.remainingBudget}
                calcOptions={calcOptions}
              />
            } />
            <Route path="/procurement/vendors" element={<VendorRecommend insufficientKeys={(result?.results ?? []).filter(r => !r.achieved).map(r => r.key)} />} />

            <Route path="/regulations"     element={<GuideListPage />} />
            <Route path="/regulations/:id" element={<GuideDetailPage />} />

            <Route path="/budget/trend" element={<BudgetExecutionTrendPage deptId={deptId} year={selectedYear} />} />

            <Route path="/data/uploads"  element={<UploadHistoryPage deptId={deptId} />} />
            <Route path="/data/vendors"  element={<VendorList />} />

            {/* 구 경로 리다이렉트 */}
            <Route path="/simulation/simulate" element={<Navigate to="/procurement/simulation" replace />} />
            <Route path="/simulation/current"  element={<Navigate to="/procurement/simulation" replace />} />
            <Route path="/simulation/trend"    element={<Navigate to="/budget/trend" replace />} />
            <Route path="/data/recommend"      element={<Navigate to="/procurement/vendors" replace />} />
            <Route path="/ai/regulations"      element={<Navigate to="/regulations" replace />} />
            <Route path="/ai/guide"            element={<Navigate to="/regulations" replace />} />
            <Route path="/details"             element={<Navigate to="/procurement/register" replace />} />
            <Route path="/vendors"             element={<Navigate to="/procurement/vendors" replace />} />
            <Route path="/vendor-list"         element={<Navigate to="/data/vendors" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(null); // null=확인 중

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/check`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
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
  root:       { display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "-apple-system, 'Pretendard', 'Apple SD Gothic Neo', sans-serif" },
  main:       { flex: 1, display: 'flex', flexDirection: 'column', background: '#F9FAFB', minWidth: 0, minHeight: 0 },
  header:     { background: '#FFFFFF', borderBottom: '1px solid #F2F4F6', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  deptSelect: { padding: '6px 12px', border: '1px solid #E5E8EB', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#191F28', cursor: 'pointer', background: '#fff', outline: 'none' },
  groupBadge: { fontSize: 14, color: '#6B7684', background: '#F2F4F6', padding: '3px 10px', borderRadius: 12, fontWeight: 600 },
  loadingText:{ fontSize: 13, color: '#8B95A1', fontStyle: 'italic' },
  headerRight:{ display: 'flex', alignItems: 'center', gap: 10 },
  logoutBtn:  { padding: '6px 14px', background: '#fff', color: '#8B95A1', border: '1px solid #E5E8EB', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  content:    { flex: 1, minHeight: 0, padding: '24px 28px', overflowY: 'auto' },
};
