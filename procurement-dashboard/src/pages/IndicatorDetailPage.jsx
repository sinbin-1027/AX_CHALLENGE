import { useState, useMemo, useEffect } from 'react';

const KRW = (n) => n == null ? '-' : Math.round(n).toLocaleString('ko-KR') + '원';
const PCT = (r) => r == null ? '-' : (r * 100).toFixed(1) + '%';

// ── 지표 목록 ─────────────────────────────────────────────────────────────────

const INDICATORS = [
  { key: 'sme',                 label: '중소기업'       },
  { key: 'startup',             label: '창업기업'       },
  { key: 'women_goods',         label: '여성기업(물품)' },
  { key: 'women_service',       label: '여성기업(용역)' },
  { key: 'women_construction',  label: '여성기업(공사)' },
  { key: 'disabled_enterprise', label: '장애인기업'     },
  { key: 'standard_workshop',   label: '장애인표준사업장' },
  { key: 'severe_disabled',     label: '중증장애인'     },
  { key: 'social_enterprise',   label: '사회적기업'     },
  { key: 'cooperative',         label: '사회적협동조합' },
  { key: 'tech_development',    label: '기술개발제품'   },
  { key: 'pilot_purchase',      label: '시범구매'       },
  { key: 'nep',                 label: 'NEP'            },
  { key: 'green_product',        label: '녹색제품'       },
  { key: 'jawal_veteran',        label: '자활용사촌'     },
  { key: 'onnuri_voucher',       label: '온누리상품권'   },
  { key: 'innovative_product',   label: '혁신제품'       },
];

// ── 인증 뱃지 매핑 ────────────────────────────────────────────────────────────

const CERT_DEFS = [
  { key: '중소기업제품(연동)',       label: '중소기업',   color: '#3182F6', bg: '#EBF3FE', checkY: true  },
  { key: '여성기업제품(연동)',       label: '여성기업',   color: '#E91E8C', bg: '#FDE8F4', checkY: true  },
  { key: '창업기업제품',             label: '창업기업',   color: '#7C3AED', bg: '#EDE8FB', checkY: true  },
  { key: '장애인구매(연동)',         label: '장애인기업', color: '#FF6B00', bg: '#FFF0E6', checkY: true  },
  { key: '장애인표준사업장여부',     label: '장애인표준사업장', color: '#0891B2', bg: '#E0F2FE', checkY: true  },
  { key: '중증장애인제품',           label: '중증장애인', color: '#DC2626', bg: '#FEE2E2', checkY: true  },
  { key: '사회적기업',               label: '사회적기업', color: '#00B493', bg: '#E6F7F4', checkY: true  },
  { key: '사회적협동조합제품여부',   label: '사회적협동조합', color: '#059669', bg: '#ECFDF5', checkY: true  },
  { key: '친환경제품',               label: '녹색제품',   color: '#65A30D', bg: '#F0FDF4', checkY: true  },
  { key: '자활용사촌제품',           label: '자활용사촌', color: '#92400E', bg: '#FEF3C7', checkY: true  },
  { key: '시범구매여부',             label: '시범구매',   color: '#1D4ED8', bg: '#DBEAFE', checkY: true  },
  { key: '기술개발제품대상품목조회', label: '기술개발',   color: '#7C3AED', bg: '#EDE8FB', checkY: false }, // isNotNA
  { key: '신제품인증(NEP)여부',      label: 'NEP',        color: '#F04452', bg: '#FFF0F1', checkY: true  },
  { key: '혁신제품여부',             label: '혁신제품',   color: '#B45309', bg: '#FEF3C7', checkY: true  },
];

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

const isY    = v => v === 'Y';
const isNotNA = v => v != null && v !== '' && v !== '해당없음' && v !== '해당사항없음';

function filterRows(rows, key) {
  const goods = r => r['구매구분'] === '물품';
  const svc   = r => r['구매구분'] === '용역';
  const cons  = r => r['구매구분'] === '공사';
  const nonOn = r => r['구매구분'] !== '온누리상품권';
  const gOrS  = r => goods(r) || svc(r);
  const smeG  = r => goods(r) && isY(r['중소기업제품(연동)']);

  switch (key) {
    case 'sme':                 return rows.filter(r => nonOn(r) && isY(r['중소기업제품(연동)']));
    case 'startup':             return rows.filter(r => nonOn(r) && isY(r['창업기업제품']));
    case 'women_goods':         return rows.filter(r => goods(r) && isY(r['여성기업제품(연동)']));
    case 'women_service':       return rows.filter(r => svc(r)   && isY(r['여성기업제품(연동)']));
    case 'women_construction':  return rows.filter(r => cons(r)  && isY(r['여성기업제품(연동)']));
    case 'disabled_enterprise': return rows.filter(r => nonOn(r) && isY(r['장애인구매(연동)']));
    case 'standard_workshop':   return rows.filter(r => gOrS(r)  && isY(r['장애인표준사업장여부']));
    case 'severe_disabled':     return rows.filter(r => gOrS(r)  && isY(r['중증장애인제품']));
    case 'social_enterprise':   return rows.filter(r => gOrS(r)  && isY(r['사회적기업']));
    case 'cooperative':         return rows.filter(r => gOrS(r)  && isY(r['사회적협동조합제품여부']));
    case 'tech_development':    return rows.filter(r => smeG(r)  && isNotNA(r['기술개발제품대상품목조회']));
    case 'pilot_purchase':      return rows.filter(r => smeG(r)  && isY(r['시범구매여부']));
    case 'nep':                 return rows.filter(r => isY(r['신제품인증(NEP)여부']));
    case 'green_product':       return rows.filter(r => isY(r['친환경제품']));
    case 'jawal_veteran':       return rows.filter(r => isY(r['자활용사촌제품']));
    case 'onnuri_voucher':      return rows.filter(r => r['구매구분'] === '온누리상품권');
    case 'innovative_product':  return rows.filter(r => gOrS(r)  && isY(r['혁신제품여부']));
    default: return [];
  }
}

function getRowBadges(row) {
  return CERT_DEFS.filter(({ key, checkY }) =>
    checkY ? isY(row[key]) : isNotNA(row[key])
  );
}

// ── 인증 뱃지 컴포넌트 ────────────────────────────────────────────────────────

function CertBadge({ label, color, bg }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 99, background: bg, color, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function IndicatorDetailPage({ rows = [], results = [], isYeonsoo = false }) {
  const [selectedKey, setSelectedKey] = useState('sme');

  useEffect(() => {
    if (!isYeonsoo && selectedKey === 'innovative_product') {
      setSelectedKey('sme');
    }
  }, [isYeonsoo, selectedKey]);

  const visibleIndicators = isYeonsoo
    ? INDICATORS
    : INDICATORS.filter(i => i.key !== 'innovative_product');

  const result   = results.find(r => r.key === selectedKey);
  const indLabel = INDICATORS.find(i => i.key === selectedKey)?.label ?? '';

  const filteredRows = useMemo(() => filterRows(rows, selectedKey), [rows, selectedKey]);
  const execRows     = useMemo(() => filteredRows.filter(r => (r['제외여부'] ?? 0) === 0), [filteredRows]);

  const targetAmount = result?.targetAmount ?? 0;
  const actual       = result?.actual       ?? 0;
  const rate         = result?.achievementRate ?? 0;
  const isAutoFull   = result?.denominator === 0 && result?.achieved === true;
  const noTarget     = targetAmount === 0 && !isAutoFull;
  const shortfall    = !noTarget ? Math.max(0, targetAmount - actual) : 0;
  const excludedCnt  = filteredRows.length - execRows.length;

  return (
    <div style={S.page}>

      {/* 지표 선택 드롭다운 */}
      <div style={S.selectBar}>
        <span style={S.selectLabel}>지표 선택</span>
        <select value={selectedKey} onChange={e => setSelectedKey(e.target.value)} style={S.select}>
          {visibleIndicators.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
        </select>
        <span style={S.selectHint}>{indLabel} 조건에 해당하는 행 {filteredRows.length}건</span>
      </div>

      {/* 요약 KPI 카드 5개 */}
      <div style={S.kpiRow}>
        <div style={S.kpiCard}>
          <div style={S.kpiTitle}>목표액</div>
          <div style={S.kpiValue}>{noTarget ? '-' : KRW(targetAmount)}</div>
          {isAutoFull && <div style={{ ...S.kpiSub, color: '#3182F6' }}>자동만점</div>}
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiTitle}>지출액(실적액)</div>
          <div style={S.kpiValue}>{KRW(actual)}</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiTitle}>달성률</div>
          <div style={{ ...S.kpiValue, color: result?.achieved ? '#00B493' : '#F04452' }}>
            {noTarget ? '-' : isAutoFull ? '100.0%' : PCT(rate)}
          </div>
          <div style={{ fontSize: 11, marginTop: 5, fontWeight: 700, color: result?.achieved ? '#00B493' : '#F04452' }}>
            {result?.achieved ? '✓ 달성' : '✗ 미달성'}
          </div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiTitle}>부족액</div>
          <div style={{ ...S.kpiValue, color: shortfall > 0 ? '#F04452' : '#8B95A1' }}>
            {noTarget ? '-' : shortfall > 0 ? KRW(shortfall) : '-'}
          </div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiTitle}>집행 건수</div>
          <div style={S.kpiValue}>{execRows.length.toLocaleString('ko-KR')}건</div>
          {excludedCnt > 0 && (
            <div style={S.kpiSub}>제외 {excludedCnt}건 포함 시 {filteredRows.length}건</div>
          )}
        </div>
      </div>

      {/* 실적 내역 테이블 */}
      <div style={S.tableCard}>
        <div style={S.tableHeader}>
          <span style={S.tableTitle}>{indLabel} 실적 내역</span>
          <span style={S.tableCnt}>총 {filteredRows.length.toLocaleString('ko-KR')}건</span>
        </div>

        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 520 }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: 44, textAlign: 'center' }}>순번</th>
                <th style={S.th}>결의번호</th>
                <th style={S.th}>구매유형</th>
                <th style={{ ...S.th, maxWidth: 160 }}>구매처</th>
                <th style={{ ...S.th, maxWidth: 220 }}>적요</th>
                <th style={{ ...S.th, maxWidth: 180 }}>예산명</th>
                <th style={{ ...S.th, textAlign: 'right' }}>금액</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...S.td, textAlign: 'center', color: '#8B95A1', padding: '48px 0' }}>
                    해당 지표에 해당하는 데이터가 없습니다.
                  </td>
                </tr>
              )}
              {filteredRows.map((row, i) => (
                <tr
                  key={row.__결의번호 ?? `r-${i}`}
                  style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB' }}
                >
                  <td style={{ ...S.td, textAlign: 'center', color: '#8B95A1' }}>{i + 1}</td>
                  <td style={{ ...S.td, fontVariantNumeric: 'tabular-nums' }}>
                    {row.__결의번호 || row['결의번호'] || '-'}
                  </td>
                  <td style={S.td}>{row['구매구분'] || '-'}</td>
                  <td style={{ ...S.td, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}
                    title={row['수령인사업자명']}>
                    {row['수령인사업자명'] || '-'}
                  </td>
                  <td style={{ ...S.td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}
                    title={row['적요']}>
                    {row['적요'] || '-'}
                  </td>
                  <td style={{ ...S.td, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}
                    title={row['예산명']}>
                    {row['예산명'] || '-'}
                  </td>
                  <td style={{ ...S.td, textAlign: 'right', fontWeight: 600 }}>
                    {KRW(row['물품금액'])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

// ── 스타일 ───────────────────────────────────────────────────────────────────

const S = {
  page:        { fontFamily: "-apple-system, 'Pretendard', 'Apple SD Gothic Neo', sans-serif" },
  selectBar:   { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, background: '#FFFFFF', borderRadius: 14, padding: '14px 20px', border: '1px solid #F2F4F6' },
  selectLabel: { fontSize: 13, fontWeight: 700, color: '#191F28', whiteSpace: 'nowrap' },
  select:      { padding: '9px 14px', border: '1px solid #F2F4F6', borderRadius: 10, fontSize: 14, outline: 'none', background: '#F9FAFB', color: '#191F28', fontWeight: 600, cursor: 'pointer', minWidth: 200 },
  selectHint:  { fontSize: 13, color: '#8B95A1' },

  kpiRow:  { display: 'flex', gap: 14, marginBottom: 18 },
  kpiCard: { flex: 1, background: '#FFFFFF', borderRadius: 14, padding: '16px 18px', border: '1px solid #F2F4F6', minWidth: 0 },
  kpiTitle:{ fontSize: 12, color: '#8B95A1', marginBottom: 8, fontWeight: 500 },
  kpiValue:{ fontSize: 20, fontWeight: 800, color: '#191F28', letterSpacing: '-0.5px', lineHeight: 1 },
  kpiSub:  { fontSize: 11, color: '#8B95A1', marginTop: 5 },

  tableCard:   { background: '#FFFFFF', borderRadius: 14, border: '1px solid #F2F4F6', overflow: 'hidden' },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', borderBottom: '1px solid #F2F4F6' },
  tableTitle:  { fontSize: 15, fontWeight: 700, color: '#191F28', letterSpacing: '-0.2px' },
  tableCnt:    { fontSize: 13, color: '#8B95A1', background: '#F2F4F6', padding: '3px 10px', borderRadius: 99 },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:          { padding: '10px 14px', fontWeight: 600, color: '#8B95A1', borderBottom: '1px solid #F2F4F6', textAlign: 'left', background: '#F9FAFB', whiteSpace: 'nowrap', fontSize: 12, position: 'sticky', top: 0, zIndex: 1 },
  td:          { padding: '10px 14px', borderBottom: '1px solid #F2F4F6', whiteSpace: 'nowrap' },
};
