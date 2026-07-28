import { useState } from 'react';
import { DetailModal, TargetModal } from '../components/Dashboard';
import AmountText, { scaleForValue } from '../components/AmountText';

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
function KpiCard({ title, value, unit, sub, valueColor, onClick, variant }) {
  if (variant === 'score') {
    return (
      <div style={{ ...S.kpiCard, ...S.kpiCardScore }}>
        <div style={{ ...S.kpiTitle, justifyContent: 'center' }}>{title}</div>
        <div style={{ ...S.kpiValue, ...S.kpiValueScore, color: valueColor ?? '#191F28' }}>{value}</div>
        {sub && <div style={S.kpiSub}>{sub}</div>}
      </div>
    );
  }

  return (
    <div
      style={{ ...S.kpiCard, ...(onClick ? S.kpiCardClickable : {}) }}
      onClick={onClick}
    >
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
  const dispRate   = isAutoFull ? 1 : Math.min(r.achievementRate ?? 0, 1);
  const barWidth   = dispRate * 100;
  const rateColor  = r.achieved ? '#00B493' : '#F04452';
  const noTarget   = r.targetAmount === 0 && !isAutoFull;
  const shortfall  = !noTarget && !isAutoFull ? Math.max(0, r.targetAmount - r.actual) : 0;

  return (
    <div style={S.indCard}>
      <div style={S.indHeader}>
        <span style={S.indLabel}>{r.label}</span>
        {isAutoFull ? (
          <span style={S.badge.auto}>자동만점</span>
        ) : r.achieved ? (
          <span style={S.badge.ok}>달성</span>
        ) : (
          <span style={S.badge.no}>미달성</span>
        )}
      </div>

      <div style={S.statRow}>
        <span style={S.statLbl}>목표액</span>
        <span style={S.statVal}>{noTarget ? '-' : <AmountText value={r.targetAmount} scale={1} />}</span>
      </div>
      <div style={S.statRow}>
        <span style={S.statLbl}>지출액</span>
        <span style={S.statVal}><AmountText value={r.actual} scale={1} /></span>
      </div>
      <div style={S.statRow}>
        <span style={S.statLbl}>부족액</span>
        <span style={{ ...S.statVal, color: shortfall > 0 ? '#F04452' : '#8B95A1', fontWeight: shortfall > 0 ? 700 : 500 }}>
          {noTarget ? '-' : shortfall > 0 ? <AmountText value={shortfall} scale={1} /> : '달성'}
        </span>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 12, color: '#8B95A1' }}>달성률</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: noTarget ? '#8B95A1' : rateColor }}>
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
export default function IndicatorStatusPage({ stats, finalScore, maxScore, results, rows = [], isYeonsoo = false }) {
  const [showDetail,      setShowDetail]      = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);

  const list      = results ?? [];
  const resultMap = Object.fromEntries(list.map(r => [r.key, r]));

  const scoreColor = (finalScore ?? 0) >= 3 ? '#00B493'
                   : (finalScore ?? 0) >= 2 ? '#FF6B00'
                   : '#F04452';

  const allocatedBudgetKnown = stats?.allocatedBudget != null;
  const remainingBudgetKnown = stats?.remainingBudget != null;

  // 공공구매부족액: 목표액이 있는 지표들의 (목표액-실적) 합산 (초과분은 0 처리)
  const totalShortfall = list
    .filter(r => r.targetAmount > 0)
    .reduce((s, r) => s + Math.max(0, r.targetAmount - r.actual), 0);

  // 공공구매실적 상세보기: 모수 제외분 + 구매유형 미지정('없음'/공백) 제외
  // (공공구매실적 KPI가 실제로 집계하는 대상과 동일한 물품·용역·공사 확정 건만 표시)
  const purchaseDetailRows = rows.filter(r =>
    r['제외여부'] !== 1 && ['물품', '용역', '공사'].includes(r['구매구분']),
  );

  // KPI 카드 5개(배정액/잔액/목표액/실적/부족액)의 금액 글자 크기를 가장 작은 값 기준으로 통일
  const amountScale = Math.min(
    ...[stats?.allocatedBudget, stats?.remainingBudget, stats?.totalTargetSum, stats?.totalPurchase, totalShortfall]
      .filter(v => v != null)
      .map(scaleForValue),
  );

  return (
    <div style={S.page}>

      {showDetail      && <DetailModal  rows={purchaseDetailRows} onClose={() => setShowDetail(false)} />}
      {showTargetModal && <TargetModal  results={list}  onClose={() => setShowTargetModal(false)} />}

      {/* KPI 카드 6개 */}
      <div style={S.kpiRow}>
        <KpiCard
          title="예산 배정액"
          value={allocatedBudgetKnown ? <AmountText value={stats.allocatedBudget} scale={amountScale} /> : '-'}
          sub="수용비·용역·연구·공사 항목 기준"
        />
        <KpiCard
          title="집행 가능 예산"
          value={remainingBudgetKnown ? <AmountText value={stats.remainingBudget} scale={amountScale} /> : '-'}
          sub="배정액 - 집행액"
          valueColor={remainingBudgetKnown && stats.remainingBudget < 0 ? '#F04452' : '#3182F6'}
        />
        <KpiCard
          title="공공구매 목표액"
          value={<AmountText value={stats?.totalTargetSum} scale={amountScale} />}
          sub="목표 합산"
          onClick={() => setShowTargetModal(true)}
        />
        <KpiCard
          title="공공구매 실적"
          value={<AmountText value={stats?.totalPurchase} scale={amountScale} />}
          sub="물품·용역·공사"
          onClick={() => setShowDetail(true)}
        />
        <KpiCard
          title="공공구매 부족액"
          value={<AmountText value={totalShortfall} scale={amountScale} />}
          sub="지표별 부족액 합산"
          valueColor={totalShortfall > 0 ? '#F04452' : '#00B493'}
        />
        <KpiCard
          title="공공구매 점수"
          value={finalScore?.toFixed(2) ?? '-'}
          sub={`${(maxScore ?? 4).toFixed(0)}점 만점`}
          valueColor={scoreColor}
          variant="score"
        />
      </div>

      {/* 그룹별 지표 카드 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {GROUPS.map(group => {
          const groupResults = group.keys.map(k => resultMap[k]).filter(Boolean);
          if (groupResults.length === 0) return null;

          return (
            <div key={group.label} style={S.groupRow}>
              <div style={{ ...S.groupLabel, background: group.bg, borderLeft: `4px solid ${group.color}` }}>
                <span style={{ color: group.color, fontSize: 13, fontWeight: 700, whiteSpace: 'pre-line', lineHeight: 1.5, textAlign: 'center' }}>
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

  kpiRow: {
    display: 'flex',
    gap: 14,
    marginBottom: 12,
    flex: '2 1 0',
    minHeight: 130,
  },
  kpiCard: {
    flex: 1,
    background: '#FFFFFF',
    borderRadius: 16,
    padding: '10px 14px 8px',
    border: '1px solid #F2F4F6',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  kpiCardClickable: { cursor: 'pointer', transition: 'border-color 0.15s' },
  kpiCardScore: { textAlign: 'center', background: '#F0F6FF', border: '1px solid #BFDBFE' },
  kpiTitle:    { fontSize: 16, color: '#191F28', marginBottom: 12, fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center', letterSpacing: '0.1px' },
  kpiHint:     { fontSize: 11, color: '#3182F6', fontWeight: 500 },
  kpiValueRow: { display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' },
  kpiValue:    { fontSize: 36, fontWeight: 800, lineHeight: 1, color: '#191F28', letterSpacing: '-0.5px' },
  kpiValueScore: { marginTop: 4 },
  kpiUnit:     { fontSize: 13, color: '#8B95A1' },
  kpiSub:      { fontSize: 13, color: '#8B95A1', marginTop: 12 },

  groupRow:   { display: 'flex', background: '#FFFFFF', borderRadius: 14, border: '1px solid #F2F4F6', overflow: 'hidden' },
  groupLabel: { width: 80, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 8px' },
  groupCards: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '12px' },

  indCard:    { flex: 1, background: '#FFFFFF', borderRadius: 12, padding: '13px 13px', border: '1px solid #F2F4F6', minWidth: 0 },
  indHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 9, gap: 4 },
  indLabel:   { fontSize: 14, fontWeight: 700, color: '#191F28', lineHeight: 1.3 },
  statRow:    { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 },
  statLbl:    { fontSize: 12, color: '#8B95A1', flexShrink: 0 },
  statVal:    { fontSize: 15, color: '#191F28', fontWeight: 700, textAlign: 'right' },

  barTrack: { height: 5, background: '#F2F4F6', borderRadius: 99, overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 99, transition: 'width 0.3s ease' },

  badge: {
    ok:   { fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#E6F7F4', color: '#00B493', whiteSpace: 'nowrap', flexShrink: 0 },
    no:   { fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#FFF0F1', color: '#F04452', whiteSpace: 'nowrap', flexShrink: 0 },
    auto: { fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#EBF3FE', color: '#3182F6', whiteSpace: 'nowrap', flexShrink: 0 },
  },
};
