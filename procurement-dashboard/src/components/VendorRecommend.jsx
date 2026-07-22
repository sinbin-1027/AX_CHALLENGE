import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_URL ?? '';
const LIMIT = 20;

const KEY_TO_LABEL = {
  sme:                '중소기업',
  women_goods:        '여성기업',
  women_service:      '여성기업',
  women_construction: '여성기업',
  startup:            '창업기업',
  disabled_enterprise:'장애인기업',
  severe_disabled:    '중증장애인',
  standard_workshop:  '장애인표준사업장',
  social_enterprise:  '사회적기업',
  cooperative:        '사회적협동조합',
  green_product:      '녹색제품',
  jawal_veteran:      '자활용사촌',
  pilot_purchase:     '시범구매',
  tech_development:   '기술개발',
  nep:                'NEP',
  innovative_product: '혁신제품',
};

const STATUS_STYLE = {
  '유효':     { bg: '#f6ffed', text: '#389e0d', border: '#b7eb8f' },
  '확인필요': { bg: '#fff7e6', text: '#d46b08', border: '#ffd591' },
  '취소':     { bg: '#f5f5f5', text: '#595959', border: '#d9d9d9' },
};

function CertBadge({ cert }) {
  const c = STATUS_STYLE[cert.상태] ?? STATUS_STYLE['확인필요'];
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 99,
      fontSize: 12, fontWeight: 600,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>{cert.인증종류}</span>
  );
}

export default function VendorRecommend({ insufficientKeys = [] }) {
  const [search, setSearch]     = useState('');
  const [onlyValid, setOnlyValid] = useState(false);
  const [page, setPage]         = useState(1);
  const [data, setData]         = useState({ vendors: [], total: 0 });
  const [loading, setLoading]   = useState(false);

  const fetchVendors = useCallback(async (keys, s, pg) => {
    if (keys.length === 0 && !s) {
      setData({ vendors: [], total: 0 });
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: LIMIT });
      if (keys.length > 0) params.set('insufficientKeys', keys.join(','));
      if (s) params.set('search', s);
      const res  = await fetch(`${API_BASE}/api/vendors/search?${params}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const json = await res.json();
      setData({ vendors: json.vendors ?? [], total: json.total ?? 0 });
    } catch (e) {
      console.error('추천 업체 조회 실패:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors(insufficientKeys, search, page);
  }, [insufficientKeys, search, page, fetchVendors]);

  const insufficientLabels = [...new Set(insufficientKeys.map(k => KEY_TO_LABEL[k]).filter(Boolean))];

  const displayedVendors = onlyValid
    ? data.vendors.filter(v => v.인증목록.some(c => c.상태 === '유효'))
    : data.vendors;

  const totalPages = Math.ceil(data.total / LIMIT);

  return (
    <div>
      {/* 검색 컨트롤 */}
      <div style={S.card}>
        <div style={S.cardTitle}>추천 업체 검색</div>

        <div style={S.insufficientWrap}>
          <span style={S.insufficientLabel}>현재 미달성 지표</span>
          {insufficientLabels.length === 0 ? (
            <span style={{ fontSize: 13, color: '#52c41a' }}>🎉 모든 지표 달성!</span>
          ) : (
            <div style={S.badgeRow}>
              {insufficientLabels.map(label => (
                <span key={label} style={S.insufficientBadge}>{label}</span>
              ))}
            </div>
          )}
        </div>

        <div style={S.searchRow}>
          <form onSubmit={e => { e.preventDefault(); setPage(1); }} style={{ display: 'flex', flex: 1, gap: 10 }}>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="업체명 또는 사업자번호 검색"
              style={S.searchInput}
            />
            <button type="submit" style={S.searchBtn}>검색</button>
          </form>
          <button
            style={{ ...S.toggleBtn, ...(onlyValid ? S.toggleBtnActive : {}) }}
            onClick={() => setOnlyValid(v => !v)}
          >
            {onlyValid ? '✓ 유효 인증만 보기' : '유효 인증만 보기'}
          </button>
        </div>
      </div>

      {/* 결과 카드 */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>
            추천 결과
            <span style={S.totalBadge}>{data.total.toLocaleString()}개</span>
          </span>
          {loading && <span style={{ fontSize: 13, color: '#94a3b8' }}>조회 중…</span>}
        </div>

        {displayedVendors.length === 0 && !loading && (
          <div style={S.empty}>
            {insufficientKeys.length === 0 && !search
              ? '대시보드에서 부서와 데이터를 먼저 선택해주세요.'
              : '조건에 맞는 추천 업체가 없습니다.'}
          </div>
        )}

        <div style={S.vendorGrid}>
          {displayedVendors.map((v, i) => (
            <div key={v.사업자번호 ?? i} style={S.vendorCard}>
              <div style={S.vendorHeader}>
                <div>
                  <div style={S.vendorName}>{v.업체명}</div>
                  <div style={S.vendorBiz}>{v.사업자번호}</div>
                </div>
                {v.match_score > 0 && (
                  <div style={S.resolveChip}>{v.match_score}개 지표 해결 가능</div>
                )}
              </div>

              {v.취급품목 && <div style={S.vendorItem}>취급품목: {v.취급품목}</div>}

              <div style={S.badgeRow}>
                {v.인증목록.map((cert, ci) => <CertBadge key={ci} cert={cert} />)}
              </div>

              <div style={S.vendorFooter}>
                인증 {v.인증목록.length}개 보유
                {v.데이터기준일 && <span style={{ color: '#D1D6DB' }}> · 기준일 {v.데이터기준일}</span>}
              </div>
            </div>
          ))}
        </div>

        {!onlyValid && totalPages > 1 && (
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
  card:             { background: '#FFFFFF', borderRadius: 16, padding: '20px 24px', border: '1px solid #F2F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 14 },
  cardTitle:        { fontSize: 15, fontWeight: 700, color: '#191F28', letterSpacing: '-0.2px', display: 'flex', alignItems: 'center', gap: 8 },
  cardHeader:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  totalBadge:       { fontSize: 13, fontWeight: 500, color: '#8B95A1', background: '#F2F4F6', padding: '2px 10px', borderRadius: 99 },
  insufficientWrap: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  insufficientLabel:{ fontSize: 13, fontWeight: 600, color: '#8B95A1', whiteSpace: 'nowrap', paddingTop: 3 },
  badgeRow:         { display: 'flex', flexWrap: 'wrap', gap: 6 },
  insufficientBadge:{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: '#FFF7EC', color: '#FF6B00', border: '1px solid #FFD4A8', fontWeight: 600 },
  searchRow:        { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  searchInput:      { flex: 1, minWidth: 200, padding: '10px 16px', border: '1px solid #F2F4F6', borderRadius: 10, fontSize: 14, outline: 'none', background: '#F9FAFB', color: '#191F28' },
  searchBtn:        { padding: '10px 22px', background: '#3182F6', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  toggleBtn:        { padding: '9px 16px', border: '1px solid #E5E8EB', borderRadius: 10, fontSize: 13, background: '#FFFFFF', color: '#8B95A1', cursor: 'pointer', whiteSpace: 'nowrap' },
  toggleBtnActive:  { background: '#EBF3FE', color: '#3182F6', borderColor: '#3182F6', fontWeight: 600 },
  empty:            { textAlign: 'center', padding: '40px 0', color: '#8B95A1', fontSize: 14 },
  vendorGrid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 },
  vendorCard:       { border: '1px solid #F2F4F6', borderRadius: 14, padding: '18px 20px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 10 },
  vendorHeader:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  vendorName:       { fontSize: 15, fontWeight: 700, color: '#191F28', letterSpacing: '-0.2px' },
  vendorBiz:        { fontSize: 12, color: '#8B95A1', marginTop: 2 },
  resolveChip:      { fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: '#EBF3FE', color: '#3182F6', whiteSpace: 'nowrap' },
  vendorItem:       { fontSize: 13, color: '#8B95A1' },
  vendorFooter:     { fontSize: 12, color: '#8B95A1', marginTop: 2 },
  pagination:       { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 18 },
  pageBtn:          { padding: '6px 14px', border: '1px solid #F2F4F6', borderRadius: 8, fontSize: 13, background: '#FFFFFF', cursor: 'pointer', color: '#191F28' },
  pageBtnActive:    { background: '#3182F6', color: '#fff', borderColor: '#3182F6', fontWeight: 700 },
  pageBtnDisabled:  { color: '#D1D6DB', cursor: 'not-allowed' },
};
