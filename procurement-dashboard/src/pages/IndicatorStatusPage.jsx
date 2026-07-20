import { useState } from 'react';
import { DetailModal, TargetModal } from '../components/Dashboard';

const KRW = (n) => n == null ? '-' : Math.round(n).toLocaleString('ko-KR') + '원';
const PCT = (r) => r == null ? '-' : (r * 100).toFixed(1) + '%';

const GROUPS = [
  {
    label: '중소기업\n관련',
    color: '#3182F6',
    bg:    '#EBF3FE',
    keys:  ['sme', 'startup'],
  },
  {
    label: '여성기업',
    color: '#E91E8C',
    bg:    '#FDE8F4',
    keys:  ['women_goods', 'women_service', 'women_construction'],
  },
  {
    label: '장애인\n관련',
    color: '#7C3AED',
    bg:    '#EDE8FB',
    keys:  ['disabled_enterprise', 'standard_workshop', 'severe_disabled'],
  },
  {
    label: '사회적\n가치',
    color: '#00B493',
    bg:    '#E6F7F4',
    keys:  ['social_enterprise', 'cooperative'],
  },
  {
    label: '기술개발\n관련',
    color: '#FF6B00',
    bg:    '#FFF0E6',
    keys:  ['tech_development', 'pilot_purchase', 'nep'],
  },
  {
    label: '기타',
    color: '#8B95A1',
    bg:    '#F2F4F6',
    keys:  ['green_product', 'jawal_veteran', 'onnuri_voucher', 'innovative_product'],
  },
];

// ── KPI 카드 ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, title, value, unit, sub, valueColor, onClick }) {
  return (
    <div
      style={{ ...S.kpiCard, ...(onClick ? S.kpiCardClickable : {}) }}
      onClick={onClick}
    >
      <div style={S.kpiIcon}>{icon}</div>
      <div style={S.kpiTitle}>
        {title}
        {onClick && <span style={S.kpiHint}>상세 보기 →</span>}
      </div>
      <div style={S.kpiValueRow}>
        <span style={{ ...S.kpiValue, color: valueColor ?? '#191F28' }}>{value}</span>
        {unit && <span style={S.kpiUnit}>{unit}</span>}
      </div>
      {sub && <div style={S.kpiSub}>{sub}</div>}
    </div>
  );
}

// ── 지표 카드 ─────────────────────────────────────────────────────────────────
function IndicatorCard({ r }) {
  const isAutoFull = r.denominator === 0 && r.achieved === true;
  const dispRate   = isAutoFull ? 1 : (r.achievementRate ?? 0);
  const barWidth   = Math.min(dispRate * 100, 100);
  const rateColor  = r.achieved ? '#00B493' : '#F04452';
  const noTarget   = r.targetAmount === 0 && !isAutoFull;

  return (
    <div style={S.indCard}>
      <div style={S.indHeader}>
        <span style={S.indLabel}>{r.label}</span>
        {isAutoFull ? (
          <span style={S.badge.auto}>자동만점</span>
        ) : r.achieved ? (
          <span style={S.badge.ok}>✓ 달성</span>
        ) : (
          <span style={S.badge.no}>✗ 미달성</span>
        )}
      </div>

      <div style={S.indRow}>
        <span style={S.indLbl}>목표액</span>
        <span style={S.indVal}>{noTarget ? '-' : KRW(r.targetAmount)}</span>
      </div>
      <div style={S.indRow}>
        <span style={S.indLbl}>지출액</span>
        <span style={S.indVal}>{KRW(r.actual)}</span>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: '#8B95A1' }}>달성률</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: noTarget ? '#8B95A1' : rateColor }}>
            {noTarget ? '-' : PCT(dispRate)}
          </span>
        </div>
        <div style={S.barTrack}>
          <div style={{ ...S.barFill, width: `${noTarget ? 0 : barWidth}%`, background: rateColor }} />
        </div>
      </div>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function IndicatorStatusPage({ stats, finalScore, results, rows = [], isYeonsoo = false }) {
  const [showDetail,      setShowDetail]      = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);

  const list      = results ?? [];
  const resultMap = Object.fromEntries(list.map(r => [r.key, r]));
  const achieved  = list.filter(r => r.achieved);
  const total     = list.length;

  const scoreColor = (finalScore ?? 0) >= 3 ? '#00B493'
                   : (finalScore ?? 0) >= 2 ? '#FF6B00'
                   : '#F04452';

  return (
    <div style={S.page}>

      {showDetail      && <DetailModal  rows={rows}     onClose={() => setShowDetail(false)} />}
      {showTargetModal && <TargetModal  results={list}  onClose={() => setShowTargetModal(false)} />}

      {/* KPI 카드 5개 */}
      <div style={S.kpiRow}>
        <KpiCard
          icon="🛒" title="총 구매액"
          value={KRW(stats?.totalPurchaseAll)}
          sub={`전체 ${stats?.rowCount?.toLocaleString('ko-KR') ?? 0}건`}
          onClick={() => setShowDetail(true)}
        />
        <KpiCard
          icon="🎯" title="공공구매 목표액"
          value={KRW(stats?.totalTargetSum)}
          sub="목표 합산"
          onClick={() => setShowTargetModal(true)}
        />
        <KpiCard
          icon="📦" title="공공구매 지출액"
          value={KRW(stats?.totalPurchase)}
          sub="물품·용역·공사"
        />
        <KpiCard
          icon="✅" title="지표달성률(전체)"
          value={`${achieved.length} / ${total}개`}
          sub={`(${total ? ((achieved.length / total) * 100).toFixed(1) : '0.0'}%)`}
          valueColor={achieved.length >= total * 0.7 ? '#00B493' : '#F04452'}
        />
        <KpiCard
          icon="⭐" title="공공구매 점수"
          value={finalScore?.toFixed(2) ?? '-'}
          unit="/ 4.00점"
          valueColor={scoreColor}
        />
      </div>

      {/* 그룹별 지표 카드 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {GROUPS.map(group => {
          const groupResults = group.keys.map(k => resultMap[k]).filter(Boolean);

          return (
            <div key={group.label} style={S.groupRow}>
              <div style={{ ...S.groupLabel, background: group.bg, borderLeft: `4px solid ${group.color}` }}>
                <span style={{ color: group.color, fontSize: 12, fontWeight: 700, whiteSpace: 'pre-line', lineHeight: 1.5, textAlign: 'center' }}>
                  {group.label}
                </span>
              </div>

              <div style={S.groupCards}>
                {groupResults.map(r => <IndicatorCard key={r.key} r={r} />)}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

// ── 스타일 ───────────────────────────────────────────────────────────────────
const S = {
  page: { fontFamily: "-apple-system, 'Pretendard', 'Apple SD Gothic Neo', sans-serif" },

  kpiRow:          { display: 'flex', gap: 14, marginBottom: 18 },
  kpiCard:         { flex: 1, background: '#FFFFFF', borderRadius: 16, padding: '18px 18px 14px', border: '1px solid #F2F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minWidth: 0 },
  kpiCardClickable: { cursor: 'pointer', transition: 'border-color 0.15s' },
  kpiIcon:         { fontSize: 20, marginBottom: 8 },
  kpiTitle:        { fontSize: 12, color: '#8B95A1', marginBottom: 6, fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  kpiHint:         { fontSize: 11, color: '#3182F6', fontWeight: 500 },
  kpiValueRow:     { display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' },
  kpiValue:        { fontSize: 20, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.5px' },
  kpiUnit:         { fontSize: 12, color: '#8B95A1' },
  kpiSub:          { fontSize: 12, color: '#8B95A1', marginTop: 5 },

  groupRow:   { display: 'flex', background: '#FFFFFF', borderRadius: 14, border: '1px solid #F2F4F6', overflow: 'hidden' },
  groupLabel: { width: 80, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 8px' },
  groupCards: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '12px' },

  indCard:    { flex: 1, background: '#FFFFFF', borderRadius: 12, padding: '13px 13px', border: '1px solid #F2F4F6', minWidth: 0 },
  indHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 9, gap: 4 },
  indLabel:   { fontSize: 13, fontWeight: 700, color: '#191F28', lineHeight: 1.3 },
  indRow:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  indLbl:     { fontSize: 11, color: '#8B95A1' },
  indVal:     { fontSize: 12, color: '#191F28', fontWeight: 500 },

  barTrack: { height: 5, background: '#F2F4F6', borderRadius: 99, overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 99, transition: 'width 0.3s ease' },

  badge: {
    ok:   { fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#E6F7F4', color: '#00B493', whiteSpace: 'nowrap', flexShrink: 0 },
    no:   { fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#FFF0F1', color: '#F04452', whiteSpace: 'nowrap', flexShrink: 0 },
    auto: { fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#EBF3FE', color: '#3182F6', whiteSpace: 'nowrap', flexShrink: 0 },
  },
};
