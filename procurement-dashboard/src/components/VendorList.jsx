import { useState, useMemo } from 'react';

const CERT_FILTERS = [
  { value: '',                  label: '전체'     },
  { value: 'sme',               label: '중소기업'  },
  { value: 'women',             label: '여성기업'  },
  { value: 'startup',           label: '창업기업'  },
  { value: 'disabled',          label: '장애인기업' },
  { value: 'severe_disabled',   label: '중증장애인' },
  { value: 'standard_workshop', label: '표준사업장' },
  { value: 'social',            label: '사회적기업' },
  { value: 'cooperative',       label: '협동조합'  },
  { value: 'green',             label: '녹색제품'  },
  { value: 'jawal',             label: '자활용사촌' },
  { value: 'pilot',             label: '시범구매'  },
  { value: 'tech',              label: '기술개발'  },
  { value: 'nep',               label: 'NEP'       },
  { value: 'innovative_product',label: '혁신제품'  },
];

const CERT_COLOR = {
  '중소기업':  { bg: '#e6f4ff', text: '#0958d9', border: '#91caff' },
  '여성기업':  { bg: '#fff0f6', text: '#c41d7f', border: '#ffadd2' },
  '창업기업':  { bg: '#f9f0ff', text: '#531dab', border: '#d3adf7' },
  '장애인기업':{ bg: '#fff7e6', text: '#d46b08', border: '#ffd591' },
  '중증장애인':{ bg: '#fff2e8', text: '#ad2102', border: '#ffbb96' },
  '표준사업장':{ bg: '#e6fffb', text: '#006d75', border: '#87e8de' },
  '사회적기업':{ bg: '#f6ffed', text: '#389e0d', border: '#b7eb8f' },
  '협동조합':  { bg: '#e6fff8', text: '#08979c', border: '#87e8cb' },
  '녹색제품':  { bg: '#fcffe6', text: '#5b8c00', border: '#eaff8f' },
  '자활용사촌':{ bg: '#fff1b8', text: '#874d00', border: '#ffd666' },
  '시범구매':  { bg: '#f0f5ff', text: '#1d39c4', border: '#adc6ff' },
  '기술개발':  { bg: '#e8f4f8', text: '#0050b3', border: '#69c0ff' },
  'NEP':       { bg: '#fff1f0', text: '#a8071a', border: '#ffa39e' },
  '혁신제품':  { bg: '#fde8ff', text: '#780650', border: '#e8b4f8' },
};

function CertBadge({ label }) {
  const c = CERT_COLOR[label] ?? { bg: '#f5f5f5', text: '#595959', border: '#d9d9d9' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 99,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      {label}
    </span>
  );
}

// ── 상세 모달 ────────────────────────────────────────────────────────────────
function DetailModal({ vendor, onClose }) {
  const ALL_CERTS = [
    '중소기업','여성기업','창업기업','장애인기업','중증장애인',
    '표준사업장','사회적기업','협동조합','녹색제품','자활용사촌',
    '시범구매','기술개발','NEP','혁신제품',
  ];

  return (
    <div style={M.overlay} onClick={onClose}>
      <div style={M.panel} onClick={e => e.stopPropagation()}>
        <div style={M.header}>
          <div>
            <div style={M.name}>{vendor.업체명}</div>
            <div style={M.biz}>{vendor.사업자번호}
              {vendor.취급품목 && <span style={M.item}> · {vendor.취급품목}</span>}
            </div>
          </div>
          <button style={M.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={M.body}>
          <div style={M.sectionTitle}>인증 보유 현황</div>
          <div style={M.certGrid}>
            {ALL_CERTS.map(label => {
              const has = vendor.인증상세?.[label] ?? false;
              const c   = CERT_COLOR[label] ?? { bg: '#f5f5f5', text: '#595959', border: '#d9d9d9' };
              return (
                <div key={label} style={{
                  ...M.certItem,
                  background: has ? c.bg : '#fafafa',
                  border: `1px solid ${has ? c.border : '#e8e8e8'}`,
                  opacity: has ? 1 : 0.5,
                }}>
                  <span style={{ fontSize: 16 }}>{has ? '✓' : '✗'}</span>
                  <span style={{ fontSize: 13, fontWeight: has ? 600 : 400, color: has ? c.text : '#bfbfbf' }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={M.footer}>
            인증 {vendor.인증수}개 보유
            {vendor.데이터기준일 && ` · 기준일 ${vendor.데이터기준일}`}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function VendorList({ vendors = [] }) {
  const [search, setSearch]         = useState('');
  const [certFilter, setCertFilter] = useState('');
  const [page, setPage]             = useState(1);
  const [selected, setSelected]     = useState(null);

  const LIMIT = 20;

  const filtered = useMemo(() => {
    const q         = search.trim().toLowerCase();
    const certLabel = CERT_FILTERS.find(f => f.value === certFilter)?.label ?? '';
    return vendors.filter(v => {
      const matchSearch = !q ||
        v.업체명.toLowerCase().includes(q) ||
        v.사업자번호.includes(q);
      const matchCert = !certFilter ||
        v.보유인증.includes(certLabel);
      return matchSearch && matchCert;
    });
  }, [vendors, search, certFilter]);

  const totalPages  = Math.ceil(filtered.length / LIMIT);
  const paginated   = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  const handleFilter = (val) => { setCertFilter(val); setPage(1); };
  const handleSearch = (e)  => { e.preventDefault(); setPage(1); };

  return (
    <div>
      {selected && <DetailModal vendor={selected} onClose={() => setSelected(null)} />}

      {/* 검색 + 필터 */}
      <div style={S.card}>
        <form onSubmit={handleSearch} style={S.searchRow}>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="업체명 또는 사업자번호 검색"
            style={S.searchInput}
          />
          <button type="submit" style={S.searchBtn}>검색</button>
        </form>

        <div style={S.filterRow}>
          {CERT_FILTERS.map(f => (
            <button
              key={f.value}
              style={{ ...S.filterBtn, ...(certFilter === f.value ? S.filterBtnActive : {}) }}
              onClick={() => handleFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 테이블 */}
      <div style={S.card}>
        <div style={S.tableHeader}>
          <span style={S.tableTitle}>
            업체 목록
            <span style={S.totalBadge}>{filtered.length.toLocaleString()}개</span>
          </span>
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
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                    {vendors.length === 0
                      ? '업체 데이터가 없습니다. 추천 업체 페이지에서 엑셀을 업로드해주세요.'
                      : '검색 결과가 없습니다.'}
                  </td>
                </tr>
              )}
              {paginated.map((v, i) => (
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
                  <td style={{ ...S.td, maxWidth: 280 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {v.보유인증.map(label => <CertBadge key={label} label={label} />)}
                    </div>
                  </td>
                  <td style={{ ...S.td, textAlign: 'center', fontWeight: 700, color: '#1677ff' }}>{v.인증수}</td>
                  <td style={{ ...S.td, color: '#94a3b8', fontSize: 12 }}>{v.데이터기준일 || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div style={S.pagination}>
            <button
              style={{ ...S.pageBtn, ...(page === 1 ? S.pageBtnDisabled : {}) }}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ‹ 이전
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = page <= 4 ? i + 1
                      : page >= totalPages - 3 ? totalPages - 6 + i
                      : page - 3 + i;
              if (p < 1 || p > totalPages) return null;
              return (
                <button
                  key={p}
                  style={{ ...S.pageBtn, ...(p === page ? S.pageBtnActive : {}) }}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              );
            })}
            <button
              style={{ ...S.pageBtn, ...(page === totalPages ? S.pageBtnDisabled : {}) }}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              다음 ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 스타일 ───────────────────────────────────────────────────────────────────
const S = {
  card:           { background: '#FFFFFF', borderRadius: 16, padding: '18px 22px', border: '1px solid #F2F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 14 },
  searchRow:      { display: 'flex', gap: 10, marginBottom: 14 },
  searchInput:    { flex: 1, padding: '10px 16px', border: '1px solid #F2F4F6', borderRadius: 10, fontSize: 14, outline: 'none', background: '#F9FAFB', color: '#191F28' },
  searchBtn:      { padding: '10px 22px', background: '#3182F6', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  filterRow:      { display: 'flex', flexWrap: 'wrap', gap: 6 },
  filterBtn:      { padding: '5px 14px', border: '1px solid #F2F4F6', borderRadius: 99, fontSize: 13, background: '#FFFFFF', color: '#8B95A1', cursor: 'pointer' },
  filterBtnActive:{ background: '#3182F6', color: '#fff', borderColor: '#3182F6', fontWeight: 600 },
  tableHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  tableTitle:     { fontSize: 15, fontWeight: 700, color: '#191F28', display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.2px' },
  totalBadge:     { fontSize: 13, fontWeight: 500, color: '#8B95A1', background: '#F2F4F6', padding: '2px 10px', borderRadius: 99 },
  table:          { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:             { padding: '10px 14px', fontWeight: 600, color: '#8B95A1', borderBottom: '1px solid #F2F4F6', textAlign: 'left', whiteSpace: 'nowrap', background: '#F9FAFB', fontSize: 12 },
  td:             { padding: '11px 14px', borderBottom: '1px solid #F2F4F6', color: '#191F28', whiteSpace: 'nowrap' },
  pagination:     { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 18 },
  pageBtn:        { padding: '6px 14px', border: '1px solid #F2F4F6', borderRadius: 8, fontSize: 13, background: '#FFFFFF', cursor: 'pointer', color: '#191F28' },
  pageBtnActive:  { background: '#3182F6', color: '#fff', borderColor: '#3182F6', fontWeight: 700 },
  pageBtnDisabled:{ color: '#D1D6DB', cursor: 'not-allowed' },
};

const M = {
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(25,31,40,0.48)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  panel:       { background: '#FFFFFF', borderRadius: 20, width: 560, maxWidth: '92vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.14)' },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '22px 24px 18px', borderBottom: '1px solid #F2F4F6' },
  name:        { fontSize: 18, fontWeight: 800, color: '#191F28', letterSpacing: '-0.4px' },
  biz:         { fontSize: 13, color: '#8B95A1', marginTop: 4 },
  item:        { color: '#8B95A1' },
  closeBtn:    { background: 'none', border: 'none', fontSize: 18, color: '#8B95A1', cursor: 'pointer', padding: '2px 6px', borderRadius: 8 },
  body:        { padding: '20px 24px', overflowY: 'auto' },
  sectionTitle:{ fontSize: 14, fontWeight: 600, color: '#8B95A1', marginBottom: 14 },
  certGrid:    { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 },
  certItem:    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 8px', borderRadius: 12, textAlign: 'center' },
  footer:      { fontSize: 13, color: '#8B95A1', textAlign: 'right' },
};
