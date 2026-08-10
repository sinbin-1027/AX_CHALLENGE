import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Cell, ResponsiveContainer,
  PieChart, Pie,
} from 'recharts';
import AmountText, { scaleForValue } from './AmountText';

// ── 포맷 ─────────────────────────────────────────────────────────────────────
const PCT = (r) => r == null ? '-' : (r * 100).toFixed(1) + '%';

const COLOR = {
  success: '#00B493',
  danger:  '#F04452',
  warning: '#FF6B00',
  gray:    '#D1D6DB',
  primary: '#3182F6',
  text:    '#191F28',
  subtext: '#8B95A1',
  border:  '#F2F4F6',
  bg:      '#F9FAFB',
  card:    '#FFFFFF',
};

// ── KPI 카드 ─────────────────────────────────────────────────────────────────
function KpiCard({ title, value, unit, sub, valueColor, onClick, variant }) {
  if (variant === 'score') {
    return (
      <div style={{ ...S.kpiCard, ...S.kpiCardScore }}>
        <div style={{ ...S.kpiTitle, justifyContent: 'center' }}>{title}</div>
        <div style={{ ...S.kpiValue, ...S.kpiValueScore, color: valueColor ?? COLOR.text }}>{value}</div>
        {sub && <div style={S.kpiSub}>{sub}</div>}
      </div>
    );
  }

  return (
    <div
      style={{ ...S.kpiCard, ...(onClick ? S.kpiCardClickable : {}) }}
      onClick={onClick}
    >
      <div style={S.kpiTitle}>{title}{onClick && <span style={S.kpiHint}>상세 보기 →</span>}</div>
      <div style={S.kpiValueRow}>
        <span style={{ ...S.kpiValue, color: valueColor ?? COLOR.text }}>{value}</span>
        {unit && <span style={S.kpiUnit}>{unit}</span>}
      </div>
      {sub && <div style={S.kpiSub}>{sub}</div>}
    </div>
  );
}

// ── 지표별 목표액 모달 ────────────────────────────────────────────────────────
const BASIS_TEXT = {
  sme:                '총구매액(물품+용역+공사) × 80%',
  startup:            '총구매액(물품+용역+공사) × 15%',
  women_goods:        '물품 구매액 × 5%',
  women_service:      '용역 구매액 × 5%',
  women_construction: '공사 구매액 × 3%',
  social_enterprise:  '(물품+용역) × 5%',
  cooperative:        '(물품+용역) × 0.1%',
  disabled_enterprise:'총구매액(물품+용역+공사) × 1%',
  standard_workshop:  '(물품+용역) × 0.8%',
  severe_disabled:    '(물품+용역) × 1.1%',
  tech_development:   '중소기업 물품 구매액 × 20%',
  pilot_purchase:     '중소기업 물품 구매액 × 1.5%',
  nep:                'NEP 대상품목 구매액 × 20%',
  green_product:      '고정 목표액',
  jawal_veteran:      '고정 목표액',
  innovative_product: '(물품+용역) × 3%',
  onnuri_voucher:     '부서인원(11월말) × 250,000원',
};

export function TargetModal({ results, onClose }) {
  const total      = results.reduce((s, r) => s + r.targetAmount, 0);
  const totalPoints = results.reduce((s, r) => s + (r.points ?? 0), 0);
  return (
    <div style={TM.overlay} onClick={onClose}>
      <div style={TM.panel} onClick={e => e.stopPropagation()}>
        <div style={TM.header}>
          <div style={TM.title}>지표별 목표액 현황</div>
          <button style={TM.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={TM.body}>
          <table style={TM.table}>
            <thead>
              <tr>
                <th style={TM.th}>지표명</th>
                <th style={TM.th}>목표액 산출기준</th>
                <th style={{ ...TM.th, textAlign: 'center', padding: '10px 8px' }}>배점</th>
                <th style={{ ...TM.th, textAlign: 'right', paddingLeft: 8 }}>목표액</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.key} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ ...TM.td, fontWeight: 600 }}>{r.label}</td>
                  <td style={{ ...TM.td, color: COLOR.subtext, fontSize: 12 }}>
                    {BASIS_TEXT[r.key] ?? '-'}
                  </td>
                  <td style={{ ...TM.td, textAlign: 'center', fontWeight: 700, color: '#3182F6', padding: '11px 8px' }}>
                    {r.points != null ? `${r.points}점` : '-'}
                  </td>
                  <td style={{ ...TM.td, textAlign: 'right', fontWeight: 700, fontSize: 15, paddingLeft: 8 }}>
                    {r.targetAmount > 0 ? fmtKRW(r.targetAmount) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f0f4f8', fontWeight: 700 }}>
                <td style={TM.td} colSpan={2}>합계</td>
                <td style={{ ...TM.td, textAlign: 'center', fontWeight: 700, color: '#3182F6', padding: '11px 8px' }}>
                  총 {totalPoints.toFixed(1)}점
                </td>
                <td style={{ ...TM.td, textAlign: 'right', color: COLOR.primary, fontSize: 15, paddingLeft: 8 }}>{fmtKRW(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

const TM = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  panel:   { background: '#FFFFFF', borderRadius: 16, width: 600, maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.14)' },
  header:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #F2F4F6', flexShrink: 0 },
  title:   { fontSize: 16, fontWeight: 700, color: COLOR.text, letterSpacing: '-0.3px' },
  closeBtn:{ background: 'none', border: 'none', fontSize: 18, color: COLOR.subtext, cursor: 'pointer', padding: '2px 6px', borderRadius: 8 },
  body:    { overflowY: 'auto', flex: 1 },
  table:   { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:      { padding: '10px 16px', fontWeight: 600, color: COLOR.subtext, borderBottom: '1px solid #F2F4F6', textAlign: 'left', position: 'sticky', top: 0, background: '#F9FAFB', fontSize: 12 },
  td:      { padding: '11px 16px', borderBottom: '1px solid #F2F4F6', color: COLOR.text, whiteSpace: 'nowrap' },
};

// ── 지출 상세 모달 ────────────────────────────────────────────────────────────
const DETAIL_COLS = [
  { key: '결의번호',        label: '결의번호',    align: 'left'  },
  { key: '구매구분',        label: '구매유형',    align: 'left'  },
  { key: '수령인사업자명',  label: '구매처',      align: 'left'  },
  { key: '적요',            label: '적요',        align: 'left'  },
  { key: '예산명',          label: '예산명',      align: 'left'  },
  { key: '물품금액',        label: '금액',        align: 'right' },
];

export function DetailModal({ rows, onClose }) {
  const total = rows.reduce((s, r) => s + (Number(r['물품금액']) || 0), 0);

  // 표의 다른 텍스트 컬럼(예산명 등)과 동일한 글자 크기로 고정 (길이에 따른 자동 축소 미적용)
  const amountScale = 1;

  return (
    <div style={M.overlay} onClick={onClose}>
      <div style={M.panel} onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div style={M.header}>
          <div>
            <div style={M.headerTitle}>지출 상세 내역</div>
            <div style={M.headerSub}>총 {rows.length.toLocaleString('ko-KR')}건 · <AmountText value={total} scale={amountScale} /></div>
          </div>
          <button style={M.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* 테이블 */}
        <div style={M.tableWrap}>
          <table style={M.table}>
            <thead>
              <tr>
                <th style={{ ...M.th, textAlign: 'center', width: 40 }}>순번</th>
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
                        ? <AmountText value={Number(row[c.key]) || 0} scale={amountScale} />
                        : (row[c.key] || '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f5f5f5', fontWeight: 700 }}>
                <td style={{ ...M.td, textAlign: 'center' }} colSpan={DETAIL_COLS.length}>합계</td>
                <td style={{ ...M.td, textAlign: 'right', color: COLOR.primary }}><AmountText value={total} scale={amountScale} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── 달성 지표 모달 ────────────────────────────────────────────────────────────

function AchievedModal({ achieved, onClose }) {
  return (
    <div style={AM.overlay} onClick={onClose}>
      <div style={AM.panel} onClick={e => e.stopPropagation()}>
        <div style={AM.header}>
          <div style={AM.title}>달성 지표 전체 목록 ({achieved.length}개)</div>
          <button style={AM.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={AM.body}>
          <table style={AM.table}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={AM.th}>지표명</th>
                <th style={{ ...AM.th, textAlign: 'right' }}>달성률</th>
                <th style={{ ...AM.th, textAlign: 'right' }}>획득점수</th>
              </tr>
            </thead>
            <tbody>
              {achieved.map((r, i) => (
                <tr key={r.key} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={AM.td}>{r.label}</td>
                  <td style={{ ...AM.td, textAlign: 'right', fontWeight: 600, color: COLOR.success }}>{PCT(r.achievementRate)}</td>
                  <td style={{ ...AM.td, textAlign: 'right', color: COLOR.primary }}>{r.score.toFixed(1)}점</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const AM = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  panel:   { background: '#FFFFFF', borderRadius: 16, width: 480, maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.14)' },
  header:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #F2F4F6', flexShrink: 0 },
  title:   { fontSize: 16, fontWeight: 700, color: COLOR.text, letterSpacing: '-0.3px' },
  closeBtn:{ background: 'none', border: 'none', fontSize: 18, color: COLOR.subtext, cursor: 'pointer', padding: '2px 6px', borderRadius: 8 },
  body:    { overflowY: 'auto', flex: 1 },
  table:   { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:      { padding: '10px 16px', fontWeight: 600, color: COLOR.subtext, borderBottom: '1px solid #F2F4F6', textAlign: 'left', position: 'sticky', top: 0, background: '#F9FAFB', fontSize: 12 },
  td:      { padding: '11px 16px', borderBottom: '1px solid #F2F4F6', color: COLOR.text },
};

// ── 미달성 지표 모달 ──────────────────────────────────────────────────────────

function NotAchievedModal({ notAchieved, onClose }) {
  return (
    <div style={AM.overlay} onClick={onClose}>
      <div style={AM.panel} onClick={e => e.stopPropagation()}>
        <div style={AM.header}>
          <div style={{ ...AM.title, color: COLOR.danger }}>✗ 미달성 지표 전체 목록 ({notAchieved.length}개)</div>
          <button style={AM.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={AM.body}>
          <table style={AM.table}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={AM.th}>지표명</th>
                <th style={{ ...AM.th, textAlign: 'right' }}>현재 달성률</th>
                <th style={{ ...AM.th, textAlign: 'right' }}>부족금액</th>
              </tr>
            </thead>
            <tbody>
              {notAchieved.map((r, i) => (
                <tr key={r.key} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={AM.td}>{r.label}</td>
                  <td style={{ ...AM.td, textAlign: 'right', fontWeight: 600, color: COLOR.danger }}>
                    {PCT(r.achievementRate)}
                  </td>
                  <td style={{ ...AM.td, textAlign: 'right', color: COLOR.danger }}>
                    <AmountText value={Math.max(0, r.targetAmount - r.actual)} />
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

// ── 달성/미달성 지표 현황 ──────────────────────────────────────────────────────

function AchievementStatus({ results }) {
  const [showAchievedModal,    setShowAchievedModal]    = useState(false);
  const [showNotAchievedModal, setShowNotAchievedModal] = useState(false);

  const achieved    = [...results].filter(r => r.achieved).sort((a, b) => b.achievementRate - a.achievementRate);
  const notAchieved = [...results]
    .filter(r => !r.achieved && r.targetAmount > 0)
    .sort((a, b) => (b.targetAmount - b.actual) - (a.targetAmount - a.actual));

  const top3achieved    = achieved.slice(0, 3);
  const top3notAchieved = notAchieved.slice(0, 3);

  return (
    <div style={{ ...AS.card, display: 'flex', flexDirection: 'column', gap: 0 }}>
      {showAchievedModal && (
        <AchievedModal achieved={achieved} onClose={() => setShowAchievedModal(false)} />
      )}
      {showNotAchievedModal && (
        <NotAchievedModal notAchieved={notAchieved} onClose={() => setShowNotAchievedModal(false)} />
      )}

      {/* 달성 지표 */}
      <div style={AS.section}>
        <div style={AS.sectionHeader}>
          <span style={{ ...AS.sectionTitle, color: COLOR.success }}>달성 지표 ({achieved.length}개)</span>
          {achieved.length > 3 && (
            <button style={AS.moreBtn} onClick={() => setShowAchievedModal(true)}>더보기</button>
          )}
        </div>
        {achieved.length === 0 && <div style={AS.empty}>아직 달성한 지표가 없습니다.</div>}
        {top3achieved.map(r => (
          <div key={r.key} style={AS.item}>
            <span style={{ ...AS.badge, background: '#f6ffed', color: COLOR.success, border: '1px solid #b7eb8f' }}>✓</span>
            <span style={AS.itemLabel}>{r.label}</span>
            <span style={{ ...AS.itemRate, color: COLOR.success }}>{PCT(r.achievementRate)}</span>
          </div>
        ))}
      </div>

      <div style={AS.divider} />

      {/* 미달성 지표 */}
      <div style={{ ...AS.section, flex: 1 }}>
        <div style={AS.sectionHeader}>
          <span style={{ ...AS.sectionTitle, color: COLOR.danger }}>✗ 미달성 지표 ({notAchieved.length}개)</span>
          {notAchieved.length > 3 && (
            <button style={AS.moreBtn} onClick={() => setShowNotAchievedModal(true)}>더보기</button>
          )}
        </div>
        {notAchieved.length === 0 && (
          <div style={{ ...AS.empty, color: COLOR.success }}>모든 지표를 달성했습니다!</div>
        )}
        {top3notAchieved.map(r => (
          <div key={r.key} style={AS.item}>
            <span style={{ ...AS.badge, background: '#fff1f0', color: COLOR.danger, border: '1px solid #ffa39e' }}>✗</span>
            <span style={AS.itemLabel}>{r.label}</span>
            <span style={{ ...AS.itemRate, color: COLOR.danger }}>{PCT(r.achievementRate)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const AS = {
  card:          { background: '#FFFFFF', borderRadius: 16, border: '1px solid #F2F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' },
  section:       { padding: '16px 20px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle:  { fontSize: 13, fontWeight: 700, letterSpacing: '-0.1px' },
  moreBtn:       { fontSize: 12, color: COLOR.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 },
  item:          { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${COLOR.border}` },
  badge:         { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99, flexShrink: 0 },
  itemLabel:     { fontSize: 13, color: COLOR.text, flex: 1 },
  itemRate:      { fontSize: 13, fontWeight: 600, flexShrink: 0 },
  divider:       { height: 1, background: COLOR.border, margin: '0 20px' },
  empty:         { fontSize: 13, color: COLOR.subtext, padding: '14px 0' },
  rankItem:      { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: `1px solid ${COLOR.border}` },
  rankShortfall: { fontSize: 12, color: COLOR.danger, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, width: 118, textAlign: 'right', display: 'inline-block' },
  rankBadge:     { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0, background: 'linear-gradient(135deg, #60A5FA, #2563EB)' },
  rankLabel:     { fontSize: 13, color: COLOR.text, width: 84, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  rankBarTrack:  { flex: '1 1 40px', minWidth: 0, height: 6, background: COLOR.border, borderRadius: 99, overflow: 'hidden' },
  rankBarFill:   { height: '100%', background: COLOR.danger, borderRadius: 99, transition: 'width 0.4s ease' },
  rankPct:       { fontSize: 12, fontWeight: 700, color: COLOR.text, width: 44, textAlign: 'right', flexShrink: 0 },
};

// ── 우측 상단 패널: 도넛차트 + 달성/미달성 현황 ──────────────────────────────

// 도넛차트 4개 카테고리 색상 (물품/용역/공사/온누리상품권)
const DONUT_COLORS = [COLOR.primary, COLOR.success, COLOR.warning, '#faad14'];

function RightTopPanel({ results, rows, stats }) {
  // 부족금액이 큰 것부터 내림차순 정렬 (전부 표시)
  const notAchieved = [...results]
    .filter(r => !r.achieved && r.targetAmount > 0)
    .sort((a, b) => (b.targetAmount - b.actual) - (a.targetAmount - a.actual));

  // raw 지출내역(제외여부/키워드 필터링 없이)을 구매구분만으로 그룹핑한 합계
  const sumByType = (type) => rows
    .filter(r => r.__source === 'raw' && r['구매구분'] === type)
    .reduce((s, r) => s + (Number(r['물품금액']) || 0), 0);

  // 온누리상품권은 raw 재계산이 아니라 calcEngine 결과(results)를 그대로 재사용
  const onnuriActual = results.find(r => r.key === 'onnuri_voucher')?.actual ?? 0;

  const donutRaw = [
    { name: '물품',         value: sumByType('물품') },
    { name: '용역',         value: sumByType('용역') },
    { name: '공사',         value: sumByType('공사') },
    { name: '온누리상품권', value: onnuriActual },
  ];
  const donutTotal = donutRaw.reduce((s, d) => s + d.value, 0);
  const donutData  = donutTotal > 0 ? donutRaw : donutRaw.map(d => ({ ...d, value: 0.001 }));

  return (
    <div style={{ ...S.card, display: 'flex', flexDirection: 'column', height: '100%', padding: 0, overflow: 'hidden' }}>

      {/* 도넛차트 */}
      <div style={{ padding: '22px 22px 18px', borderBottom: `1px solid ${COLOR.border}`, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <div style={{ position: 'relative', width: 168, height: 168, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                innerRadius={56}
                outerRadius={82}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                stroke="#fff"
                strokeWidth={2}
              >
                {donutData.map((d, i) => <Cell key={d.name} fill={DONUT_COLORS[i]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none',
          }}>
            <div style={{ fontSize: 11, color: COLOR.subtext }}>공공구매 실적</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: COLOR.text, lineHeight: 1.3, marginTop: 2 }}><AmountText value={stats?.totalPurchase} /></div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: COLOR.subtext, flex: 1, minWidth: 0 }}>
          {donutRaw.map((d, i) => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                <span style={{ ...S.dot, background: DONUT_COLORS[i] }} />
                {d.name}
              </span>
              <span style={{ fontWeight: 700, color: COLOR.text, whiteSpace: 'nowrap' }}>
                {(donutTotal > 0 ? (d.value / donutTotal) * 100 : 0).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 미달성 지표 (전체) */}
      <div style={{ ...AS.section, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ ...AS.sectionHeader, flexShrink: 0 }}>
          <span style={{ ...AS.sectionTitle, color: COLOR.text }}>미달성 지표 ({notAchieved.length}개)</span>
        </div>
        {notAchieved.length === 0 && (
          <div style={{ ...AS.empty, color: COLOR.success }}>모든 지표를 달성했습니다!</div>
        )}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {notAchieved.map((r, i) => (
            <div key={r.key} style={AS.rankItem}>
              <span style={AS.rankBadge}>
                {i + 1}
              </span>
              <span style={AS.rankLabel}>{r.label}</span>
              <div style={AS.rankBarTrack}>
                <div style={{ ...AS.rankBarFill, width: `${Math.min(Math.max(r.achievementRate * 100, 0), 100)}%` }} />
              </div>
              <span style={AS.rankPct}>{PCT(r.achievementRate)}</span>
              <span style={AS.rankShortfall}>
                <AmountText value={Math.max(0, r.targetAmount - r.actual)} scale={1} /> 부족
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 목표대비 상세현황 테이블 ─────────────────────────────────────────────────

function rateColor(rate) {
  if (rate === null) return COLOR.subtext;
  if (rate >= 1)     return COLOR.success;
  if (rate >= 0.7)   return '#faad14';
  return COLOR.danger;
}

// 막대그래프 3단계 색상 (rate: 0~100 스케일, 100%에서 캡된 값)
function barRateColor(rate) {
  if (rate >= 100) return '#3182F6';
  if (rate >= 70)  return '#F5A623';
  return '#F04452';
}

// 띄어쓰기 기준으로 줄바꿈하는 게 자연스러운 지표명은 직접 지정
const AXIS_LABEL_BREAKS = {
  '사회적협동조합':   ['사회적', '협동조합'],
  '장애인표준사업장': ['장애인', '표준사업장'],
  '기술개발제품':     ['기술개발', '제품'],
};

// 지표명이 길면 괄호 앞(또는 중간)에서 끊어 2줄로 표시
function wrapAxisLabel(label) {
  if (AXIS_LABEL_BREAKS[label]) return AXIS_LABEL_BREAKS[label];
  const parenIdx = label.indexOf('(');
  if (parenIdx > 0) return [label.slice(0, parenIdx), label.slice(parenIdx)];
  if (label.length <= 5) return [label];
  const mid = Math.ceil(label.length / 2);
  return [label.slice(0, mid), label.slice(mid)];
}

// 막대그래프 X축 커스텀 틱: 회전 없이 가로 2줄로 표시
function BarXAxisTick({ x, y, payload }) {
  const lines = wrapAxisLabel(payload.value);
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, i) => (
        <text key={i} x={0} y={0} dy={14 + i * 13} textAnchor="middle" fontSize={11} fill={COLOR.text}>
          {line}
        </text>
      ))}
    </g>
  );
}

// 이 테이블은 컬럼 폭이 고정돼 있어 AmountText의 길이별 자동 축소가 필요 없고,
// 오히려 자릿수에 따라 크기가 달라 보이는 원인이 되므로 고정 크기 텍스트로 표시
const fmtKRW = (n) => n == null ? '-' : Math.round(Number(n)).toLocaleString('ko-KR') + '원';

function DetailTableBody({ rows, totals }) {
  return (
    <table style={DT.table}>
      <thead>
        <tr>
          <th style={{ ...DT.th, textAlign: 'center', width: 110 }}>지표명</th>
          <th style={{ ...DT.th, textAlign: 'right', width: 130 }}>목표액</th>
          <th style={{ ...DT.th, textAlign: 'right', width: 130 }}>실적</th>
          <th style={{ ...DT.th, textAlign: 'right', width: 80 }}>달성률</th>
          <th style={{ ...DT.th, textAlign: 'right', width: 130 }}>부족액</th>
          <th style={{ ...DT.th, textAlign: 'right', width: 64 }}>배점</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const color = rateColor(r.rate);
          return (
            <tr key={r.label} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              <td style={{ ...DT.td, fontWeight: 500, textAlign: 'center', width: 110 }}>{r.label}</td>
              <td style={{ ...DT.td, textAlign: 'right', color: COLOR.text, fontSize: 16 }}>
                {r.noTarget ? '-' : fmtKRW(r.targetAmount)}
              </td>
              <td style={{ ...DT.td, textAlign: 'right', color: COLOR.text, fontSize: 16 }}>{fmtKRW(r.actual)}</td>
              <td style={{ ...DT.td, textAlign: 'right', fontWeight: 700, color, fontSize: 15 }}>
                {r.noTarget ? '-' : PCT(r.rate)}
              </td>
              <td style={{ ...DT.td, textAlign: 'right', color: r.shortfall > 0 ? COLOR.danger : COLOR.subtext, fontSize: 16 }}>
                {r.noTarget || r.shortfall === 0 ? '-' : fmtKRW(r.shortfall)}
              </td>
              <td style={{ ...DT.td, textAlign: 'right', color: COLOR.primary, fontWeight: 700 }}>
                {r.points.toFixed(1)}점
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr style={{ background: '#f0f4f8', fontWeight: 700 }}>
          <td style={{ ...DT.td, fontWeight: 700 }}>합계</td>
          <td style={{ ...DT.td, textAlign: 'right', fontSize: 16 }}>{fmtKRW(totals.target)}</td>
          <td style={{ ...DT.td, textAlign: 'right', fontSize: 16 }}>{fmtKRW(totals.actual)}</td>
          <td style={{ ...DT.td, textAlign: 'right' }}>-</td>
          <td style={{ ...DT.td, textAlign: 'right', color: totals.shortfall > 0 ? COLOR.danger : COLOR.subtext, fontSize: 16 }}>
            {totals.shortfall > 0 ? fmtKRW(totals.shortfall) : '-'}
          </td>
          <td style={{ ...DT.td, textAlign: 'right', color: COLOR.primary }}>-</td>
        </tr>
      </tfoot>
    </table>
  );
}

function toDetailRow(label, r) {
  const targetAmount = r?.targetAmount ?? 0;
  const actual       = r?.actual       ?? 0;
  const noTarget     = targetAmount === 0;
  const rate         = noTarget ? null : actual / targetAmount;
  const shortfall    = !noTarget && actual < targetAmount ? targetAmount - actual : 0;
  const points       = r?.points ?? 0;
  return { label, targetAmount, actual, rate, shortfall, noTarget, points };
}

function DetailTable({ results }) {
  const [showModal, setShowModal] = useState(false);

  const top5 = results
    .filter(r => r.targetAmount > 0)
    .map(r => toDetailRow(r.label, r))
    .sort((a, b) => b.shortfall - a.shortfall)
    .slice(0, 5);

  // 직군에 실제 적용되는 지표(results)만 대상으로 함 — 목표액 자체가 없는(noTarget) 항목은
  // 맨 아래로, 나머지는 부족액 큰 순으로 정렬
  const modalRows = results
    .map(r => toDetailRow(r.label, r))
    .sort((a, b) => {
      if (a.noTarget !== b.noTarget) return a.noTarget ? 1 : -1;
      return b.shortfall - a.shortfall;
    });

  const validAll = results.filter(r => r.targetAmount > 0);
  const totals = {
    target:   validAll.reduce((s, r) => s + r.targetAmount, 0),
    actual:   validAll.reduce((s, r) => s + r.actual, 0),
    shortfall:validAll.reduce((s, r) => s + Math.max(0, r.targetAmount - r.actual), 0),
    get rate() { return this.target > 0 ? this.actual / this.target : 0; },
  };

  return (
    <div style={{ ...S.card, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {showModal && (
        <div style={DT.overlay} onClick={() => setShowModal(false)}>
          <div style={DT.modal} onClick={e => e.stopPropagation()}>
            <div style={DT.modalHeader}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>목표대비 상세현황</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 12, color: COLOR.subtext }}>(단위: 원, %)</span>
                <button style={DT.closeBtn} onClick={() => setShowModal(false)}>✕</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <DetailTableBody rows={modalRows} totals={totals} />
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={S.cardTitle}>목표대비 상세현황</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: COLOR.subtext }}>(단위: 원, %)</span>
          <button style={DT.moreBtn} onClick={() => setShowModal(true)}>전체 보기</button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <DetailTableBody rows={top5} totals={totals} />
      </div>
    </div>
  );
}

const DT = {
  table:       { width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 },
  th:          { padding: '6px 14px', fontWeight: 600, color: COLOR.subtext, borderBottom: '1px solid #C4CDD5', textAlign: 'left', background: '#F9FAFB', whiteSpace: 'nowrap', position: 'sticky', top: 0, fontSize: 12 },
  td:          { padding: '8px 14px', borderBottom: '1px solid #C4CDD5', color: COLOR.text, whiteSpace: 'nowrap' },
  moreBtn:     { fontSize: 13, fontWeight: 600, color: COLOR.primary, background: '#EBF3FE', border: 'none', borderRadius: 8, padding: '6px 16px', cursor: 'pointer' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  modal:       { background: '#FFFFFF', borderRadius: 16, width: 860, maxWidth: '94vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.14)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 22px', borderBottom: `1px solid ${COLOR.border}`, flexShrink: 0 },
  closeBtn:    { background: 'none', border: 'none', fontSize: 18, color: COLOR.subtext, cursor: 'pointer', padding: '2px 6px', borderRadius: 8 },
};

// ── 지표별 부족금액 Top 5 ─────────────────────────────────────────────────────

// ── 바 차트 커스텀 툴팁 ──────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: '10px 14px', fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: COLOR.text }}>{label}</div>
      <div style={{ color: COLOR.subtext }}>달성률: <b style={{ color: barRateColor(d.rate) }}>{d.rateLabel}</b></div>
      <div style={{ color: COLOR.subtext }}>목표액: <AmountText value={d.targetAmount} scale={1} /></div>
      <div style={{ color: COLOR.subtext }}>실적액: <AmountText value={d.actual} scale={1} /></div>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
export default function Dashboard({ results, totalScore, finalScore, stats, rows = [], maxScore, isYeonsoo = false }) {
  const [showDetail, setShowDetail]         = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const achieved    = results.filter(r => r.achieved);
  const notAchieved = results.filter(r => !r.achieved);

  const scoreColor = finalScore >= 3 ? COLOR.success : finalScore >= 2 ? '#faad14' : COLOR.danger;

  const allocatedBudgetKnown = stats?.allocatedBudget != null;
  const remainingBudgetKnown = stats?.remainingBudget != null;

  // 공공구매부족액: 목표액이 있는 지표들의 (목표액-실적) 합산 (초과분은 0 처리)
  const totalShortfall = results
    .filter(r => r.targetAmount > 0)
    .reduce((s, r) => s + Math.max(0, r.targetAmount - r.actual), 0);

  // KPI 카드 5개(배정액/잔액/목표액/실적/부족액)의 금액 글자 크기를 가장 작은 값 기준으로 통일
  const amountScale = Math.min(
    ...[stats?.allocatedBudget, stats?.remainingBudget, stats?.totalTargetSum, stats?.totalPurchase, totalShortfall]
      .filter(v => v != null)
      .map(scaleForValue),
  );

  // 공공구매실적 상세보기: 모수 제외분 + 구매유형 미지정('없음'/공백) + 온누리상품권 제외
  // (공공구매실적 KPI가 실제로 집계하는 대상과 동일한 물품·용역·공사 확정 건만 표시)
  const purchaseDetailRows = rows.filter(r =>
    r['제외여부'] !== 1 && ['물품', '용역', '공사'].includes(r['구매구분']),
  );

  // 바 차트 데이터 (막대는 120%에서 캡, 툴팁에는 실제 달성률 그대로 표시)
  const chartData = results.map(r => ({
    label:        r.label,
    rate:         Math.min(+(r.achievementRate * 100).toFixed(1), 120),
    rateLabel:    PCT(r.achievementRate),
    achieved:     r.achieved,
    targetAmount: r.targetAmount,
    actual:       r.actual,
    key:          r.key,
  }));


  return (
    <div style={{ fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif", height: '100%', display: 'flex', flexDirection: 'column' }}>

      {showDetail      && <DetailModal  rows={purchaseDetailRows} onClose={() => setShowDetail(false)} />}
      {showTargetModal && <TargetModal  results={results} onClose={() => setShowTargetModal(false)} />}

      {/* ── KPI 카드 6개: 점수 / 목표액 / 실적 / 부족액 / 배정액 / 잔액 ── */}
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
          valueColor={remainingBudgetKnown && stats.remainingBudget < 0 ? COLOR.danger : '#3182F6'}
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
          valueColor={totalShortfall > 0 ? COLOR.danger : COLOR.success}
        />
        <KpiCard
          title="공공구매 점수"
          value={finalScore.toFixed(2)}
          sub={`${(maxScore ?? 4).toFixed(0)}점 만점`}
          valueColor={scoreColor}
          variant="score"
        />
      </div>

      {/* ── 좌 70% / 우 30% 그리드: 좌측은 바차트+상세현황 세로 적재, 우측은 그 합친 높이만큼 도넛/미달성지표 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 3fr', gap: 20, flex: '8 1 0', minHeight: 0 }}>

        {/* 좌측 컬럼: 바 차트 (위) + 목표대비 상세현황 (아래) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: 0 }}>

          {/* 유형별 목표 대비 달성률 */}
          <div style={{ ...S.card, paddingTop: 12, paddingBottom: 6, flex: '4 1 0', minHeight: 230, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexShrink: 0 }}>
              <div style={{ ...S.cardTitle, marginBottom: 0 }}>유형별 목표 대비 달성률</div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: COLOR.subtext }}>
                <span><span style={{ ...S.dot, background: '#3182F6' }} />100% 이상</span>
                <span><span style={{ ...S.dot, background: '#F5A623' }} />70~100%</span>
                <span><span style={{ ...S.dot, background: COLOR.danger }} />70% 미만</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <svg width="18" height="2" style={{ verticalAlign: 'middle' }}>
                    <line x1="0" y1="1" x2="18" y2="1" stroke={COLOR.subtext} strokeWidth="1.5" strokeDasharray="4 2" />
                  </svg>
                  100% 목표선
                </span>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: 4, right: 8, top: 16, bottom: 8 }} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F4F6" />
                  <XAxis
                    type="category"
                    dataKey="label"
                    tick={<BarXAxisTick />}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    height={40}
                  />
                  <YAxis
                    type="number"
                    domain={[0, 120]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fontSize: 11, fill: COLOR.subtext }}
                    tickCount={7}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F9FAFB' }} />
                  <ReferenceLine y={100} stroke={COLOR.subtext} strokeDasharray="5 3" strokeWidth={1.5} />
                  <Bar dataKey="rate" radius={[3, 3, 0, 0]} barSize={22} maxBarSize={22}>
                    {chartData.map(d => (
                      <Cell key={d.key} fill={barRateColor(d.rate)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 목표대비 상세현황 */}
          <div style={{ flex: '6 1 0', minHeight: 240, display: 'flex' }}>
            <DetailTable results={results} />
          </div>

        </div>

        {/* 우측 컬럼: 도넛차트 + 미달성 지표 (좌측 두 카드를 합친 높이만큼 늘어남) */}
        <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <RightTopPanel results={results} rows={rows} stats={stats} />
        </div>

      </div>

    </div>
  );
}

// ── 스타일 ───────────────────────────────────────────────────────────────────
const S = {
  card: {
    background: '#FFFFFF',
    borderRadius: 16,
    padding: '16px 20px',
    border: '1px solid #F2F4F6',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: COLOR.text,
    marginBottom: 12,
    letterSpacing: '-0.2px',
  },
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
  kpiTitle:    { fontSize: 16, color: COLOR.text, marginBottom: 12, fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center', letterSpacing: '0.1px' },
  kpiHint:     { fontSize: 11, color: COLOR.primary, fontWeight: 500 },
  kpiValueRow: { display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' },
  kpiValue:    { fontSize: 36, fontWeight: 800, lineHeight: 1, color: COLOR.text, letterSpacing: '-0.5px' },
  kpiValueScore: { marginTop: 4 },
  kpiUnit:     { fontSize: 13, color: COLOR.subtext },
  kpiSub:      { fontSize: 13, color: COLOR.subtext, marginTop: 12 },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    padding: '10px 14px',
    fontWeight: 600,
    color: COLOR.subtext,
    borderBottom: `1px solid ${COLOR.border}`,
    textAlign: 'left',
    whiteSpace: 'nowrap',
    background: '#F9FAFB',
    position: 'sticky',
    top: 0,
    fontSize: 12,
  },
  td: {
    padding: '10px 14px',
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
};

// ── 모달 스타일 ───────────────────────────────────────────────────────────────
const M = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px',
  },
  panel: {
    background: '#fff',
    borderRadius: 16,
    width: '90vw',
    maxWidth: 1100,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
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
