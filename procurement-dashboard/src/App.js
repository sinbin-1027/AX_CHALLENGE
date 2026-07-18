import { useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import DetailsPage from './pages/DetailsPage';
import VendorRecommend from './components/VendorRecommend';
import VendorList from './components/VendorList';
import ComingSoon from './pages/ComingSoon';
import IndicatorStatusPage from './pages/IndicatorStatusPage';
import IndicatorDetailPage from './pages/IndicatorDetailPage';
import { calcEngine } from './utils/calcEngine';
import { DEPARTMENTS, DEPT_GROUP_CONFIGS } from './data/departments';
import demoData from './data/demoData';

// ── 메인 레이아웃 ─────────────────────────────────────────────────────────────
function AppLayout() {
  const [deptId, setDeptId]                   = useState('dept_01');
  const [uploadedRows, setUploadedRows]       = useState(null);   // null = 데모 데이터 사용
  const [showUploadModal, setShowUploadModal] = useState(false);

  // 부서 변경 → 업로드 데이터 초기화
  const handleDeptChange = (e) => {
    setDeptId(e.target.value);
    setUploadedRows(null);
  };

  // FileUpload 완료 콜백
  const handleDataLoad = (rows) => {
    setUploadedRows(rows);
    setShowUploadModal(false);
  };

  // 업로드 우선, 없으면 demoData — calcEngine까지 한 번에 처리
  const { activeRows, result } = useMemo(() => {
    const rows = uploadedRows ?? demoData[deptId] ?? [];
    const dept = DEPARTMENTS.find(d => d.id === deptId);
    if (!dept || !rows.length) return { activeRows: rows, result: null };

    const groupConfig = DEPT_GROUP_CONFIGS[dept.group];
    const overrides = {
      headcount:    dept.headcount,
      fixedTargets: dept.targets,
      scoreWeight:  groupConfig.scoreWeight,
      totalPoints:  groupConfig.totalPoints,
    };

    let result = null;
    try { result = calcEngine(rows, overrides); }
    catch (e) { console.error('calcEngine 오류:', e); }

    return { activeRows: rows, result };
  }, [uploadedRows, deptId]);

  const selectedDept = DEPARTMENTS.find(d => d.id === deptId);
  const isUploaded   = uploadedRows !== null;

  return (
    <div style={S.root}>
      <Sidebar />

      <div style={S.main}>
        {/* 상단 헤더 */}
        <div style={S.header}>
          <div style={S.headerLeft}>
            <select value={deptId} onChange={handleDeptChange} style={S.deptSelect}>
              {DEPARTMENTS.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <span style={S.groupBadge}>{selectedDept?.group}</span>
            <span style={{ ...S.sourceBadge, ...(isUploaded ? S.sourceBadgeUploaded : S.sourceBadgeDemo) }}>
              {isUploaded ? '📂 업로드 데이터' : '🎯 데모 데이터'}
            </span>
          </div>
          <div style={S.headerRight}>
            <button onClick={() => setShowUploadModal(true)} style={S.updateBtn}>
              데이터 업데이트
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
                />
              ) : <ComingSoon title="데이터 없음" />
            } />

            {/* 예산현황 */}
            <Route path="/budget/allocation" element={<ComingSoon title="예산 배정액" />} />
            <Route path="/budget/execution"  element={<ComingSoon title="예산 집행액" />} />

            {/* 공공구매 관리 */}
            <Route path="/procurement/indicators" element={
              result
                ? <IndicatorStatusPage stats={result.stats} finalScore={result.finalScore} results={result.results} />
                : <ComingSoon title="지표 현황" />
            } />
            <Route path="/procurement/details"  element={<IndicatorDetailPage rows={activeRows} results={result?.results ?? []} />} />
            <Route path="/procurement/register" element={<DetailsPage rows={activeRows} onRefresh={() => {}} />} />

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
        </div>
      </div>

      {/* 업로드 모달 */}
      {showUploadModal && (
        <div style={S.modalOverlay} onClick={() => setShowUploadModal(false)}>
          <div style={S.modalCard} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>엑셀 데이터 업로드</span>
              <button onClick={() => setShowUploadModal(false)} style={S.modalClose}>✕</button>
            </div>
            <div style={S.modalBody}>
              <FileUpload onDataLoad={handleDataLoad} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<AppLayout />} />
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
  sourceBadge:         { fontSize: 12, padding: '3px 10px', borderRadius: 12, fontWeight: 500 },
  sourceBadgeUploaded: { color: '#16a34a', background: '#dcfce7' },
  sourceBadgeDemo:     { color: '#6B7684', background: '#F2F4F6' },
  headerRight:{ display: 'flex', alignItems: 'center', gap: 14 },
  updateBtn:  { padding: '6px 16px', background: '#3182F6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  content:    { flex: 1, padding: '24px 28px', overflowY: 'auto' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalCard:    { background: '#fff', borderRadius: 16, width: 560, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden' },
  modalHeader:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #F2F4F6' },
  modalTitle:   { fontSize: 16, fontWeight: 700, color: '#191F28' },
  modalClose:   { background: 'none', border: 'none', fontSize: 18, color: '#8B95A1', cursor: 'pointer', lineHeight: 1, padding: '2px 6px' },
  modalBody:    { padding: '24px' },
};
