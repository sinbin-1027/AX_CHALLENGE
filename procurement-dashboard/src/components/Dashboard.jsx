import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Cell, ResponsiveContainer,
} from 'recharts';

// ── 포맷 ─────────────────────────────────────────────────────────────────────
const KRW = (n) => n == null ? '-' : Math.round(n).toLocaleString('ko-KR') + '원';
const PCT = (r) => r == null ? '-' : (r * 100).toFixed(1) + '%';

const COLOR = {
  success: '#52c41a',
  danger:  '#ff4d4f',
  gray:    '#bfbfbf',
  primary: '#1677ff',
  text:    '#1e293b',
  subtext: '#8c8c8c',
  border:  '#f0f0f0',
};

// ── KPI 카드 ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, title, value, unit, sub, valueColor, onClick }) {
  return (
    <div
      style={{ ...S.kpiCard, ...(onClick ? S.kpiCardClickable : {}) }}
      onClick={onClick}
    >
      <div style={S.kpiIcon}>{icon}</div>
      <div style={S.kpiTitle}>{title}{onClick && <span style={S.kpiHint}>상세 보기 →</span>}</div>
      <div style={S.kpiValueRow}>
        <span style={{ ...S.kpiValue, color: valueColor ?? COLOR.text }}>{value}</span>
        {unit && <span style={S.kpiUnit}>{unit}</span>}
      </div>
      {sub && <div style={S.kpiSub}>{sub}</div>}
    </div>
  );
}

// ── 지출 상세 모달 ────────────────────────────────────────────────────────────
const DETAIL_COLS = [
  { key: '발의일자',        label: '발의일자',    align: 'left'  },
  { key: '구매구분',        label: '구매구분',    align: 'left'  },
  { key: '부서명',          label: '부서명',      align: 'left'  },
  { key: '적요',            label: '적요',        align: 'left'  },
  { key: '수령인사업자명',  label: '거래처',      align: 'left'  },
  { key: '발주품목명',      label: '품목명',      align: 'left'  },
  { key: '예산명',          label: '예산명',      align: 'left'  },
  { key: '물품금액',        label: '금액',        align: 'right' },
];

function DetailModal({ rows, onClose }) {
  const total = rows.reduce((s, r) => s + (Number(r['물품금액']) || 0), 0);

  return (
    <div style={M.overlay} onClick={onClose}>
      <div style={M.panel} onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div style={M.header}>
          <div>
            <div style={M.headerTitle}>지출 상세 내역</div>
            <div style={M.headerSub}>총 {rows.length.toLocaleString('ko-KR')}건 · {KRW(total)}</div>
          </div>
          <button style={M.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* 테이블 */}
        <div style={M.tableWrap}>
          <table style={M.table}>
            <thead>
              <tr>
                <th style={{ ...M.th, textAlign: 'center', width: 40 }}>No.</th>
                {DETAIL_COLS.map(c => (
                  <th key={c.key} style={{ ...M.th, textAlign: c.align }}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ ...M.td, textAlign: 'center', color: COLOR.subtext }}>{i + 1}</td>
                  {DETAIL_COLS.map(c => (
                    <td
                      key={c.key}
                      style={{
                        ...M.td,
                        textAlign: c.align,
                        fontWeight: c.key === '물품금액' ? 600 : 400,
                        color: c.key === '물품금액' ? COLOR.text : undefined,
                        maxWidth: c.key === '적요' || c.key === '발주품목명' ? 200 : undefined,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {c.key === '물품금액'
                        ? KRW(Number(row[c.key]) || 0)
                        : (row[c.key] || '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f5f5f5', fontWeight: 700 }}>
                <td style={{ ...M.td, textAlign: 'center' }} colSpan={DETAIL_COLS.length}>합계</td>
                <td style={{ ...M.td, textAlign: 'right', color: COLOR.primary }}>{KRW(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── 바 차트 커스텀 툴팁 ──────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: '10px 14px', fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: COLOR.text }}>{label}</div>
      <div style={{ color: COLOR.subtext }}>달성률: <b style={{ color: d.achieved ? COLOR.success : COLOR.gray }}>{d.rateLabel}</b></div>
      <div style={{ color: COLOR.subtext }}>목표액: {KRW(d.targetAmount)}</div>
      <div style={{ color: COLOR.subtext }}>실적액: {KRW(d.actual)}</div>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
export default function Dashboard({ results, totalScore, finalScore, stats, rows = [] }) {
  const [showDetail, setShowDetail] = useState(false);
  const achieved    = results.filter(r => r.achieved);
  const notAchieved = results.filter(r => !r.achieved);

  const scoreColor = finalScore >= 3 ? COLOR.success : finalScore >= 2 ? '#faad14' : COLOR.danger;

  // 바 차트 데이터
  const chartData = results.map(r => ({
    label:        r.label,
    rate:         Math.min(+(r.achievementRate * 100).toFixed(1), 200),
    rateLabel:    PCT(r.achievementRate),
    achieved:     r.achieved,
    targetAmount: r.targetAmount,
    actual:       r.actual,
    key:          r.key,
  }));

  // 상위/하위 TOP3
  const top3    = [...results].sort((a, b) => b.achievementRate - a.achievementRate).slice(0, 3);
  const bottom3 = notAchieved.sort((a, b) => a.achievementRate - b.achievementRate).slice(0, 3);

  return (
    <div style={{ fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>

      {showDetail && <DetailModal rows={rows} onClose={() => setShowDetail(false)} />}

      {/* ── KPI 카드 5개 ── */}
      <div style={S.kpiRow}>
        <KpiCard
          icon="🛒"
          title="총 구매액"
          value={KRW(stats?.totalPurchaseAll)}
          sub={`전체 ${stats?.rowCount?.toLocaleString('ko-KR')}건`}
          onClick={() => setShowDetail(true)}
        />
        <KpiCard
          icon="📦"
          title="공공구매 실적액"
          value={KRW(stats?.totalPurchase)}
          sub="물품·용역·공사"
        />
        <KpiCard
          icon="🎯"
          title="공공구매 목표액"
          value={KRW(stats?.totalTargetSum)}
          sub={`달성률 ${stats?.totalTargetSum ? ((stats.totalActualSum / stats.totalTargetSum) * 100).toFixed(1) + '%' : '-'}`}
        />
        <KpiCard
          icon="⭐"
          title="공공구매 점수"
          value={finalScore.toFixed(2)}
          unit="/ 4.00점"
          sub={finalScore >= 3 ? '우수' : finalScore >= 2 ? '보통' : '미흡'}
          valueColor={scoreColor}
        />
        <KpiCard
          icon="✅"
          title="달성 지표 수"
          value={achieved.length}
          unit={`/ ${results.length}개`}
          sub={`배점 ${totalScore.toFixed(2)} / 9.5`}
          valueColor={achieved.length >= results.length * 0.7 ? COLOR.success : COLOR.danger}
        />
      </div>

      {/* ── 중간: 차트 + 테이블 ── */}
      <div style={S.midRow}>

        {/* 바 차트 */}
        <div style={{ ...S.card, flex: '0 0 60%' }}>
          <div style={S.cardTitle}>유형별 목표 대비 달성률</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: COLOR.subtext, marginBottom: 12 }}>
            <span><span style={{ ...S.dot, background: COLOR.success }} />달성</span>
            <span><span style={{ ...S.dot, background: COLOR.gray }} />미달성</span>
            <span style={{ color: COLOR.danger }}>— 100% 목표선</span>
          </div>
          <ResponsiveContainer width="100%" height={460}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 40, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f5f5f5" />
              <XAxis
                type="number"
                domain={[0, 150]}
                tickFormatter={v => `${v}%`}
                tick={{ fontSize: 11, fill: COLOR.subtext }}
                tickCount={7}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={88}
                tick={{ fontSize: 12, fill: COLOR.text }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#fafafa' }} />
              <ReferenceLine x={100} stroke={COLOR.danger} strokeDasharray="5 3" strokeWidth={1.5} />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={16}>
                {chartData.map(d => (
                  <Cell key={d.key} fill={d.achieved ? COLOR.success : COLOR.gray} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 상세 테이블 */}
        <div style={{ ...S.card, flex: '0 0 calc(40% - 16px)', overflow: 'hidden' }}>
          <div style={S.cardTitle}>상세 현황</div>
          <div style={{ overflowY: 'auto', maxHeight: 508 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>지표명</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>목표액</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>실적액</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>달성률</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>달성</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={r.key} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={S.td}>{r.label}</td>
                    <td style={{ ...S.td, textAlign: 'right', color: COLOR.subtext, fontSize: 12 }}>{KRW(r.targetAmount)}</td>
                    <td style={{ ...S.td, textAlign: 'right', fontSize: 12 }}>{KRW(r.actual)}</td>
                    <td style={{ ...S.td, textAlign: 'right', fontWeight: 600, color: r.achieved ? COLOR.success : COLOR.text }}>
                      {PCT(r.achievementRate)}
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: r.achieved ? COLOR.success : COLOR.danger, fontSize: 15 }}>
                        {r.achieved ? '✓' : '✗'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── 하단: TOP3 ── */}
      <div style={S.bottomRow}>

        {/* 우수 지표 TOP3 */}
        <div style={{ ...S.card, flex: 1 }}>
          <div style={{ ...S.cardTitle, color: COLOR.success }}>🏆 우수 지표 TOP 3</div>
          {top3.map((r, i) => (
            <div key={r.key} style={S.rankRow}>
              <span style={{ ...S.rankNum, background: i === 0 ? '#faad14' : i === 1 ? '#bfbfbf' : '#d48806' }}>
                {i + 1}
              </span>
              <span style={S.rankLabel}>{r.label}</span>
              <div style={{ flex: 1, margin: '0 12px' }}>
                <div style={S.rankBar}>
                  <div style={{ ...S.rankBarFill, width: `${Math.min(r.achievementRate * 100, 100)}%`, background: r.achieved ? COLOR.success : COLOR.gray }} />
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: r.achieved ? COLOR.success : COLOR.subtext, width: 52, textAlign: 'right' }}>
                {PCT(r.achievementRate)}
              </span>
            </div>
          ))}
        </div>

        {/* 개선 필요 TOP3 */}
        <div style={{ ...S.card, flex: 1 }}>
          <div style={{ ...S.cardTitle, color: COLOR.danger }}>⚠️ 개선 필요 TOP 3</div>
          {bottom3.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: COLOR.subtext, fontSize: 14 }}>
              모든 지표를 달성했습니다! 🎉
            </div>
          )}
          {bottom3.map((r, i) => (
            <div key={r.key} style={S.rankRow}>
              <span style={{ ...S.rankNum, background: COLOR.danger }}>{i + 1}</span>
              <span style={S.rankLabel}>{r.label}</span>
              <div style={{ flex: 1, margin: '0 12px' }}>
                <div style={S.rankBar}>
                  <div style={{ ...S.rankBarFill, width: `${Math.min(r.achievementRate * 100, 100)}%`, background: '#ff7875' }} />
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: COLOR.danger, width: 52, textAlign: 'right' }}>
                {PCT(r.achievementRate)}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── 스타일 ───────────────────────────────────────────────────────────────────
const S = {
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '20px 24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: COLOR.text,
    marginBottom: 16,
  },
  kpiRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    background: '#fff',
    borderRadius: 12,
    padding: '20px 20px 16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    minWidth: 0,
  },
  kpiCardClickable: { cursor: 'pointer', transition: 'box-shadow 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  kpiIcon:     { fontSize: 22, marginBottom: 8 },
  kpiTitle:    { fontSize: 12, color: COLOR.subtext, marginBottom: 6, fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  kpiHint:     { fontSize: 11, color: COLOR.primary, fontWeight: 400 },
  kpiValueRow: { display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' },
  kpiValue:    { fontSize: 22, fontWeight: 800, lineHeight: 1, color: COLOR.text },
  kpiUnit:     { fontSize: 13, color: COLOR.subtext },
  kpiSub:      { fontSize: 12, color: COLOR.subtext, marginTop: 6 },
  midRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  bottomRow: {
    display: 'flex',
    gap: 16,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    padding: '10px 12px',
    fontWeight: 600,
    color: COLOR.subtext,
    borderBottom: `2px solid ${COLOR.border}`,
    textAlign: 'left',
    whiteSpace: 'nowrap',
    background: '#fff',
    position: 'sticky',
    top: 0,
  },
  td: {
    padding: '9px 12px',
    borderBottom: `1px solid ${COLOR.border}`,
    whiteSpace: 'nowrap',
    color: COLOR.text,
  },
  dot: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    marginRight: 4,
  },
  rankRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: `1px solid ${COLOR.border}`,
    gap: 8,
  },
  rankNum: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  rankLabel: {
    fontSize: 13,
    color: COLOR.text,
    width: 88,
    flexShrink: 0,
  },
  rankBar: {
    height: 6,
    background: '#f0f0f0',
    borderRadius: 99,
    overflow: 'hidden',
  },
  rankBarFill: {
    height: '100%',
    borderRadius: 99,
    transition: 'width 0.4s ease',
  },
};

// ── 모달 스타일 ───────────────────────────────────────────────────────────────
const M = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  panel: {
    background: '#fff',
    borderRadius: 16,
    width: '90vw',
    maxWidth: 1100,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '20px 24px 16px',
    borderBottom: '1px solid #f0f0f0',
    flexShrink: 0,
  },
  headerTitle: { fontSize: 17, fontWeight: 700, color: COLOR.text },
  headerSub:   { fontSize: 13, color: COLOR.subtext, marginTop: 4 },
  closeBtn: {
    background: 'none', border: 'none', fontSize: 18,
    color: COLOR.subtext, cursor: 'pointer', padding: '2px 6px',
  },
  tableWrap: { overflowY: 'auto', flex: 1 },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: '10px 12px', fontWeight: 600, color: COLOR.subtext,
    borderBottom: '2px solid #f0f0f0', whiteSpace: 'nowrap',
    background: '#fff', position: 'sticky', top: 0,
  },
  td: {
    padding: '9px 12px',
    borderBottom: '1px solid #f5f5f5',
    whiteSpace: 'nowrap',
    color: COLOR.text,
  },
};
