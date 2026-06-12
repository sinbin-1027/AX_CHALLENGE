import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

const API_BASE = 'http://localhost:4001';

// ── 상수 ─────────────────────────────────────────────────────────────────────

const CERT_OPTIONS = [
  { value: 'sme',                label: '중소기업'   },
  { value: 'women',              label: '여성기업'   },
  { value: 'startup',            label: '창업기업'   },
  { value: 'disabled',           label: '장애인기업' },
  { value: 'severe_disabled',    label: '중증장애인' },
  { value: 'standard_workshop',  label: '표준사업장' },
  { value: 'social',             label: '사회적기업' },
  { value: 'cooperative',        label: '협동조합'   },
  { value: 'green',              label: '녹색제품'   },
  { value: 'jawal',              label: '자활용사촌' },
  { value: 'pilot',              label: '시범구매'   },
  { value: 'tech',               label: '기술개발'   },
  { value: 'nep',                label: 'NEP'        },
  { value: 'innovative_product', label: '혁신제품'   },
];

// insufficientKey → 인증 레이블 (여러 키가 같은 인증에 매핑될 수 있음)
const KEY_TO_LABEL = {
  sme:                '중소기업',
  women_goods:        '여성기업',
  women_service:      '여성기업',
  women_construction: '여성기업',
  startup:            '창업기업',
  disabled_enterprise:'장애인기업',
  severe_disabled:    '중증장애인',
  standard_workshop:  '표준사업장',
  social_enterprise:  '사회적기업',
  cooperative:        '협동조합',
  green_product:      '녹색제품',
  jawal_veteran:      '자활용사촌',
  pilot_purchase:     '시범구매',
  tech_development:   '기술개발',
  nep:                'NEP',
  innovative_product: '혁신제품',
};

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
      display: 'inline-block', padding: '2px 10px', borderRadius: 99,
      fontSize: 12, fontWeight: 600,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      {label}
    </span>
  );
}

// ── 업로드 섹션 ───────────────────────────────────────────────────────────────
function UploadSection() {
  const [certType, setCertType]     = useState('women');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState('');
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const buf  = await file.arrayBuffer();
      const wb   = XLSX.read(buf, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/vendors/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ certType, rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const certLabel = CERT_OPTIONS.find(o => o.value === certType)?.label ?? '';

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>📂 업체 인증 리스트 업로드</div>
      <div style={S.uploadHint}>
        엑셀 컬럼: <b>사업자번호</b> / <b>업체명</b> / <b>취급품목</b> (선택)
      </div>

      <div style={S.uploadRow}>
        <div style={S.field}>
          <label style={S.label}>인증 종류</label>
          <select value={certType} onChange={e => setCertType(e.target.value)} style={S.select}>
            {CERT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div style={S.field}>
          <label style={S.label}>엑셀 파일</label>
          <button
            style={{ ...S.uploadBtn, opacity: loading ? 0.6 : 1 }}
            onClick={() => fileRef.current?.click()}
            disabled={loading}
          >
            {loading ? '업로드 중...' : '파일 선택'}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={handleFile} />
        </div>

        {result && (
          <div style={S.uploadSuccess}>
            ✓ <b>{certLabel}</b> 인증 업체 {result.total}개 등록 완료
            <span style={S.uploadSub}>(신규 {result.inserted} · 업데이트 {result.updated})</span>
          </div>
        )}
      </div>

      {error && <div style={S.error}>{error}</div>}
    </div>
  );
}

// ── 추천 섹션 ─────────────────────────────────────────────────────────────────
function RecommendSection({ results }) {
  const [vendors, setVendors]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [searched, setSearched]   = useState(false);

  const insufficientItems = results ? results.filter(r => !r.achieved) : [];
  const insufficientKeys  = insufficientItems.map(r => r.key);

  const handleRecommend = async () => {
    setLoading(true);
    setError('');
    try {
      const token  = localStorage.getItem('token');
      const params = insufficientKeys.join(',');
      const res = await fetch(
        `${API_BASE}/api/vendors/recommend?insufficientKeys=${encodeURIComponent(params)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setVendors(data);
      setSearched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 업체별 해결 가능 지표 수 계산
  const resolveCount = (vendor) =>
    insufficientKeys.filter(key => {
      const label = KEY_TO_LABEL[key];
      return label && vendor.보유인증.includes(label);
    }).length;

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>🏢 추천 업체 조회</div>

      {/* 부족한 지표 표시 */}
      <div style={S.insufficientWrap}>
        <span style={S.insufficientLabel}>현재 미달성 지표</span>
        {insufficientItems.length === 0 ? (
          <span style={{ fontSize: 13, color: '#52c41a' }}>🎉 모든 지표 달성!</span>
        ) : (
          <div style={S.badgeRow}>
            {insufficientItems.map(r => (
              <span key={r.key} style={S.insufficientBadge}>{r.label}</span>
            ))}
          </div>
        )}
      </div>

      <button
        style={{ ...S.recommendBtn, opacity: loading ? 0.6 : 1 }}
        onClick={handleRecommend}
        disabled={loading || insufficientItems.length === 0}
      >
        {loading ? '조회 중...' : '추천 업체 조회'}
      </button>

      {error && <div style={S.error}>{error}</div>}

      {/* 결과 카드 */}
      {searched && vendors.length === 0 && (
        <div style={S.empty}>등록된 업체 데이터가 없습니다. 먼저 업체 리스트를 업로드해주세요.</div>
      )}

      <div style={S.vendorGrid}>
        {vendors.map((v, i) => {
          const cnt = resolveCount(v);
          return (
            <div key={v.id ?? i} style={S.vendorCard}>
              <div style={S.vendorHeader}>
                <div>
                  <div style={S.vendorName}>{v.업체명}</div>
                  <div style={S.vendorBiz}>{v.사업자번호}</div>
                </div>
                {cnt > 0 && (
                  <div style={S.resolveChip}>
                    {cnt}개 지표 해결 가능
                  </div>
                )}
              </div>

              {v.취급품목 && (
                <div style={S.vendorItem}>취급품목: {v.취급품목}</div>
              )}

              <div style={S.badgeRow}>
                {v.보유인증.map(label => <CertBadge key={label} label={label} />)}
              </div>

              <div style={S.vendorFooter}>
                인증 {v.인증수}개 보유
                {v.데이터기준일 && <span style={S.vendorDate}> · 기준일 {v.데이터기준일}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
export default function VendorRecommend({ results }) {
  return (
    <div>
      <UploadSection />
      <div style={{ marginTop: 16 }}>
        <RecommendSection results={results} />
      </div>
    </div>
  );
}

// ── 스타일 ───────────────────────────────────────────────────────────────────
const S = {
  card:             { background: '#FFFFFF', borderRadius: 16, padding: '20px 24px', border: '1px solid #F2F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 4 },
  cardTitle:        { fontSize: 15, fontWeight: 700, color: '#191F28', marginBottom: 14, letterSpacing: '-0.2px' },
  uploadHint:       { fontSize: 13, color: '#8B95A1', marginBottom: 14, background: '#F9FAFB', padding: '10px 14px', borderRadius: 10 },
  uploadRow:        { display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' },
  field:            { display: 'flex', flexDirection: 'column', gap: 4 },
  label:            { fontSize: 12, fontWeight: 600, color: '#8B95A1' },
  select:           { padding: '9px 12px', border: '1px solid #F2F4F6', borderRadius: 10, fontSize: 14, outline: 'none', background: '#F9FAFB', minWidth: 140, color: '#191F28' },
  uploadBtn:        { padding: '9px 20px', background: '#3182F6', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  uploadSuccess:    { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#00B493', fontWeight: 500, padding: '10px 14px', background: '#F0FAF8', border: '1px solid #B3E8DF', borderRadius: 10 },
  uploadSub:        { fontSize: 12, color: '#8B95A1', fontWeight: 400 },
  error:            { marginTop: 10, padding: '10px 14px', background: '#FFF0F1', color: '#F04452', borderRadius: 10, fontSize: 13 },
  insufficientWrap: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  insufficientLabel:{ fontSize: 13, fontWeight: 600, color: '#8B95A1', whiteSpace: 'nowrap', paddingTop: 3 },
  badgeRow:         { display: 'flex', flexWrap: 'wrap', gap: 6 },
  insufficientBadge:{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: '#FFF7EC', color: '#FF6B00', border: '1px solid #FFD4A8', fontWeight: 600 },
  recommendBtn:     { padding: '11px 28px', background: '#3182F6', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 20 },
  empty:            { textAlign: 'center', padding: '32px 0', color: '#8B95A1', fontSize: 14 },
  vendorGrid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 },
  vendorCard:       { border: '1px solid #F2F4F6', borderRadius: 14, padding: '18px 20px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 10 },
  vendorHeader:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  vendorName:       { fontSize: 15, fontWeight: 700, color: '#191F28', letterSpacing: '-0.2px' },
  vendorBiz:        { fontSize: 12, color: '#8B95A1', marginTop: 2 },
  resolveChip:      { fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: '#EBF3FE', color: '#3182F6', whiteSpace: 'nowrap' },
  vendorItem:       { fontSize: 13, color: '#8B95A1' },
  vendorFooter:     { fontSize: 12, color: '#8B95A1', marginTop: 2 },
  vendorDate:       { color: '#D1D6DB' },
};
