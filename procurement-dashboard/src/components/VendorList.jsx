import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = process.env.REACT_APP_API_URL ?? '';
const LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

const CERT_FILTERS = [
  { value: '',                  label: '전체' },
  { value: 'women',             label: '여성기업' },
  { value: 'startup',           label: '창업기업' },
  { value: 'disabled',          label: '장애인기업' },
  { value: 'severe_disabled',   label: '중증장애인' },
  { value: 'standard_workshop', label: '장애인표준사업장' },
  { value: 'social',            label: '사회적기업' },
  { value: 'cooperative',       label: '사회적협동조합' },
  { value: 'green',             label: '녹색제품' },
  { value: 'jawal',             label: '자활용사촌' },
  { value: 'pilot',             label: '시범구매' },
  { value: 'tech',              label: '기술개발' },
  { value: 'nep',               label: 'NEP' },
  { value: 'innovative_product',label: '혁신제품' },
];

const STATUS_FILTERS = [
  { value: '',         label: '전체 상태' },
  { value: '유효',     label: '유효' },
  { value: '확인필요', label: '확인필요' },
  { value: '취소',     label: '취소' },
];

const STATUS_STYLE = {
  '유효':     { bg: '#f6ffed', text: '#389e0d', border: '#b7eb8f' },
  '확인필요': { bg: '#fff7e6', text: '#d46b08', border: '#ffd591' },
  '취소':     { bg: '#f5f5f5', text: '#595959', border: '#d9d9d9' },
};

function StatusBadge({ status }) {
  const c = STATUS_STYLE[status] ?? STATUS_STYLE['확인필요'];
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 99,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>{status}</span>
  );
}

function CertTag({ cert }) {
  const c = STATUS_STYLE[cert.상태] ?? STATUS_STYLE['확인필요'];
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 99,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>{cert.인증종류}</span>
  );
}

function DetailModal({ vendor, onClose }) {
  return (
    <div style={M.overlay} onClick={onClose}>
      <div style={M.panel} onClick={e => e.stopPropagation()}>
        <div style={M.header}>
          <div>
            <div style={M.name}>{vendor.업체명}</div>
            <div style={M.biz}>
              {vendor.사업자번호}
              {vendor.취급품목 && <span style={{ color: '#8B95A1' }}> · {vendor.취급품목}</span>}
            </div>
          </div>
          <button style={M.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={M.body}>
          <div style={M.sectionTitle}>인증 보유 현황 ({vendor.인증목록.length}개)</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={M.th}>인증종류</th>
                <th style={M.th}>상태</th>
                <th style={M.th}>만료일자</th>
              </tr>
            </thead>
            <tbody>
              {vendor.인증목록.map((cert, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={M.td}>{cert.인증종류}</td>
                  <td style={M.td}><StatusBadge status={cert.상태} /></td>
                  <td style={{ ...M.td, color: '#94a3b8' }}>{cert.만료일자 || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {vendor.데이터기준일 && (
            <div style={M.footer}>기준일 {vendor.데이터기준일}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VendorList() {
  const [search, setSearch]             = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [certFilters, setCertFilters]   = useState([]); // 다중 선택 (AND 조건)
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]                 = useState(1);
  const [data, setData]                 = useState({ vendors: [], total: 0 });
  const [loading, setLoading]           = useState(false);
  const [selected, setSelected]         = useState(null);
  const requestIdRef = useRef(0);

  // 입력할 때마다 즉시 요청을 보내면 이전 검색어의 응답이 늦게 도착해서
  // 최신 검색어의 결과를 덮어쓰는 경쟁 상태(race condition)가 생긴다 —
  // 디바운스로 요청 횟수를 줄이고, requestIdRef로 응답 순서를 보정한다.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const flushSearch = useCallback(() => {
    setPage(1);
    setDebouncedSearch(search);
  }, [search]);

  const fetchVendors = useCallback(async (s, certs, status, pg) => {
    const myId = ++requestIdRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: LIMIT });
      if (s)             params.set('search', s);
      if (certs.length)  params.set('certTypes', certs.join(','));
      if (status)        params.set('status', status);
      const res  = await fetch(`${API_BASE}/api/vendors/list?${params}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const json = await res.json();
      if (myId !== requestIdRef.current) return; // 더 최신 요청이 이미 진행 중 — 이 응답은 버림
      setData({ vendors: json.vendors ?? [], total: json.total ?? 0 });
    } catch (e) {
      console.error('업체 목록 조회 실패:', e);
    } finally {
      if (myId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors(debouncedSearch, certFilters, statusFilter, page);
  }, [debouncedSearch, certFilters, statusFilter, page, fetchVendors]);

  // "전체"는 선택 초기화, 그 외 지표는 이미 선택돼 있으면 해제, 없으면 추가
  const toggleCertFilter = (value) => {
    setPage(1);
    if (value === '') { setCertFilters([]); return; }
    setCertFilters(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const totalPages = Math.ceil(data.total / LIMIT);

  return (
    <div>
      <style>{`
        .certStatusFilterBtn {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
        }
        .certStatusFilterBtn,
        .certStatusFilterBtn:focus,
        .certStatusFilterBtn:focus-visible,
        .certStatusFilterBtn:active,
        .certStatusFilterBtn:hover {
          outline: none !important;
          box-shadow: none !important;
        }
        .certStatusFilterBtn::-moz-focus-inner {
          border: 0 !important;
        }
        .certStatusFilterBtn:not(.active):focus,
        .certStatusFilterBtn:not(.active):focus-visible,
        .certStatusFilterBtn:not(.active):active {
          border-color: #F2F4F6 !important;
        }
      `}</style>

      {selected && <DetailModal vendor={selected} onClose={() => setSelected(null)} />}

      <div style={S.card}>
        <form onSubmit={e => { e.preventDefault(); flushSearch(); }} style={S.searchRow}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="업체명 또는 사업자번호 검색"
            style={S.searchInput}
          />
          <button type="submit" style={S.searchBtn}>검색</button>
        </form>

        <div style={{ marginTop: 12 }}>
          <div style={S.filterGroupLabel}>인증 지표</div>
          <div style={S.filterRow}>
            {CERT_FILTERS.map(f => {
              const isActive = f.value === '' ? certFilters.length === 0 : certFilters.includes(f.value);
              return (
                <button
                  key={f.value}
                  className={`certStatusFilterBtn${isActive ? ' active' : ''}`}
                  style={{ ...S.filterBtn, ...(isActive ? S.filterBtnActive : {}) }}
                  onClick={e => { toggleCertFilter(f.value); e.currentTarget.blur(); }}
                >{f.label}</button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={S.filterGroupLabel}>인증 상태</div>
          <div style={S.filterRow}>
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                className={`certStatusFilterBtn${statusFilter === f.value ? ' active' : ''}`}
                style={{ ...S.filterBtn, ...(statusFilter === f.value ? S.filterBtnActive : {}) }}
                onClick={e => { setStatusFilter(f.value); setPage(1); e.currentTarget.blur(); }}
              >{f.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.tableHeader}>
          <span style={S.tableTitle}>
            업체 목록
            <span style={S.totalBadge}>{data.total.toLocaleString()}개</span>
            <span style={S.statusLegend}>
              <span><span style={{ ...S.legendDot, background: STATUS_STYLE['유효'].text }} />유효</span>
              <span><span style={{ ...S.legendDot, background: STATUS_STYLE['확인필요'].text }} />확인필요(만료/재확인 필요)</span>
              <span><span style={{ ...S.legendDot, background: STATUS_STYLE['취소'].text }} />취소</span>
            </span>
          </span>
          {loading && <span style={{ fontSize: 13, color: '#94a3b8' }}>조회 중…</span>}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={S.th}>업체명</th>
                <th style={S.th}>사업자번호</th>
                <th style={S.th}>취급품목</th>
                <th style={S.th}>보유 인증</th>
                <th style={{ ...S.th, textAlign: 'center' }}>인증수</th>
                <th style={S.th}>데이터기준일</th>
              </tr>
            </thead>
            <tbody>
              {data.vendors.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                    {data.total === 0 && !search && certFilters.length === 0 && !statusFilter
                      ? '업체 데이터가 없습니다.'
                      : '검색 결과가 없습니다.'}
                  </td>
                </tr>
              )}
              {data.vendors.map((v, i) => (
                <tr
                  key={v.사업자번호 ?? i}
                  style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}
                  onClick={() => setSelected(v)}
                  onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'}
                >
                  <td style={{ ...S.td, fontWeight: 600 }}>{v.업체명}</td>
                  <td style={{ ...S.td, color: '#64748b', fontSize: 13 }}>{v.사업자번호}</td>
                  <td style={{ ...S.td, color: '#64748b', fontSize: 13, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {v.취급품목 || '-'}
                  </td>
                  <td style={{ ...S.td, maxWidth: 300 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {v.인증목록.map((cert, ci) => <CertTag key={ci} cert={cert} />)}
                    </div>
                  </td>
                  <td style={{ ...S.td, textAlign: 'center', fontWeight: 700, color: '#1677ff' }}>{v.인증수}</td>
                  <td style={{ ...S.td, color: '#94a3b8', fontSize: 12 }}>{v.데이터기준일 || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={S.pagination}>
            <button
              style={{ ...S.pageBtn, ...(page === 1 ? S.pageBtnDisabled : {}) }}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >‹ 이전</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = page <= 4 ? i + 1
                      : page >= totalPages - 3 ? totalPages - 6 + i
                      : page - 3 + i;
              if (p < 1 || p > totalPages) return null;
              return (
                <button key={p}
                  style={{ ...S.pageBtn, ...(p === page ? S.pageBtnActive : {}) }}
                  onClick={() => setPage(p)}
                >{p}</button>
              );
            })}
            <button
              style={{ ...S.pageBtn, ...(page === totalPages ? S.pageBtnDisabled : {}) }}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >다음 ›</button>
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  card:            { background: '#FFFFFF', borderRadius: 16, padding: '18px 22px', border: '1px solid #F2F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 14 },
  searchRow:       { display: 'flex', gap: 10, marginBottom: 14 },
  searchInput:     { flex: 1, padding: '10px 16px', border: '1px solid #F2F4F6', borderRadius: 10, fontSize: 14, outline: 'none', background: '#F9FAFB', color: '#191F28' },
  searchBtn:       { padding: '10px 22px', background: '#3182F6', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  filterGroupLabel:{ fontSize: 12, color: '#8B95A1', fontWeight: 600, marginBottom: 5 },
  filterRow:       { display: 'flex', flexWrap: 'wrap', gap: 6 },
  filterBtn:       { padding: '5px 14px', border: '1px solid #F2F4F6', borderRadius: 99, fontSize: 13, background: '#FFFFFF', color: '#8B95A1', cursor: 'pointer' },
  filterBtnActive: { background: '#3182F6', color: '#fff', borderColor: '#3182F6', fontWeight: 600 },
  tableHeader:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  tableTitle:      { fontSize: 15, fontWeight: 700, color: '#191F28', display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.2px' },
  totalBadge:      { fontSize: 13, fontWeight: 500, color: '#8B95A1', background: '#F2F4F6', padding: '2px 10px', borderRadius: 99 },
  statusLegend:    { display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 400, color: '#8B95A1', flexWrap: 'wrap' },
  legendDot:       { display: 'inline-block', width: 6, height: 6, borderRadius: '50%', marginRight: 4 },
  table:           { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:              { padding: '10px 14px', fontWeight: 600, color: '#8B95A1', borderBottom: '1px solid #F2F4F6', textAlign: 'left', whiteSpace: 'nowrap', background: '#F9FAFB', fontSize: 12 },
  td:              { padding: '11px 14px', borderBottom: '1px solid #F2F4F6', color: '#191F28', whiteSpace: 'nowrap' },
  pagination:      { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 18 },
  pageBtn:         { padding: '6px 14px', border: '1px solid #F2F4F6', borderRadius: 8, fontSize: 13, background: '#FFFFFF', cursor: 'pointer', color: '#191F28' },
  pageBtnActive:   { background: '#3182F6', color: '#fff', borderColor: '#3182F6', fontWeight: 700 },
  pageBtnDisabled: { color: '#D1D6DB', cursor: 'not-allowed' },
};

const M = {
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(25,31,40,0.48)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  panel:        { background: '#FFFFFF', borderRadius: 16, width: 520, maxWidth: '92vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.14)' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '22px 24px 18px', borderBottom: '1px solid #F2F4F6' },
  name:         { fontSize: 18, fontWeight: 800, color: '#191F28', letterSpacing: '-0.4px' },
  biz:          { fontSize: 13, color: '#8B95A1', marginTop: 4 },
  closeBtn:     { background: 'none', border: 'none', fontSize: 18, color: '#8B95A1', cursor: 'pointer', padding: '2px 6px', borderRadius: 8 },
  body:         { padding: '20px 24px', overflowY: 'auto' },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: '#8B95A1', marginBottom: 14 },
  th:           { padding: '8px 12px', fontWeight: 600, color: '#8B95A1', borderBottom: '1px solid #F2F4F6', textAlign: 'left', fontSize: 12 },
  td:           { padding: '10px 12px', color: '#191F28' },
  footer:       { fontSize: 13, color: '#8B95A1', textAlign: 'right', marginTop: 16 },
};
