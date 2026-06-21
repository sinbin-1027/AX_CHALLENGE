import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Cell, ResponsiveContainer,
} from 'recharts';
import { calcEngine } from '../utils/calcEngine';

// 시뮬레이션용 기본 OVERRIDES (App.js와 동기화)
const SIM_OVERRIDES = {
  headcount: 14,
  fixedTargets: { green_product: 2247000, jawal_veteran: 1420000 },
};

// ── 포맷 ─────────────────────────────────────────────────────────────────────
const KRW = (n) => n == null ? '-' : Math.round(n).toLocaleString('ko-KR') + '원';
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

// ── 달성 지표 모달 ────────────────────────────────────────────────────────────

function AchievedModal({ achieved, onClose }) {
  return (
    <div style={AM.overlay} onClick={onClose}>
      <div style={AM.panel} onClick={e => e.stopPropagation()}>
        <div style={AM.header}>
          <div style={AM.title}>✅ 달성 지표 전체 목록 ({achieved.length}개)</div>
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
  overlay: { position: 'fixed', inset: 0, background: 'rgba(25,31,40,0.48)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  panel:   { background: '#FFFFFF', borderRadius: 20, width: 480, maxWidth: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.14)' },
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
                    {KRW(Math.max(0, r.targetAmount - r.actual))}
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
          <span style={{ ...AS.sectionTitle, color: COLOR.success }}>✅ 달성 지표 ({achieved.length}개)</span>
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
          <div style={{ ...AS.empty, color: COLOR.success }}>🎉 모든 지표를 달성했습니다!</div>
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
  section:       { padding: '18px 20px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { fontSize: 13, fontWeight: 700, letterSpacing: '-0.1px' },
  moreBtn:       { fontSize: 12, color: COLOR.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 },
  item:          { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${COLOR.border}` },
  badge:         { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99, flexShrink: 0 },
  itemLabel:     { fontSize: 13, color: COLOR.text, flex: 1 },
  itemRate:      { fontSize: 13, fontWeight: 600, flexShrink: 0 },
  divider:       { height: 1, background: COLOR.border, margin: '0 20px' },
  empty:         { fontSize: 13, color: COLOR.subtext, padding: '14px 0' },
};

// ── 목표대비 상세현황 테이블 ─────────────────────────────────────────────────

// 모달 전체 지표 (세부 분리)
const MODAL_GROUPS = [
  { label: '중소기업',       key: 'sme' },
  { label: '창업기업',       key: 'startup' },
  { label: '여성기업(물품)', key: 'women_goods' },
  { label: '여성기업(용역)', key: 'women_service' },
  { label: '여성기업(공사)', key: 'women_construction' },
  { label: '사회적기업',     key: 'social_enterprise' },
  { label: '협동조합',       key: 'cooperative' },
  { label: '장애인기업',     key: 'disabled_enterprise' },
  { label: '표준사업장',     key: 'standard_workshop' },
  { label: '중증장애인',     key: 'severe_disabled' },
  { label: '기술개발제품',   key: 'tech_development' },
  { label: '시범구매',       key: 'pilot_purchase' },
  { label: 'NEP',            key: 'nep' },
  { label: '녹색제품',       key: 'green_product' },
  { label: '자활용사촌',     key: 'jawal_veteran' },
  { label: '온누리상품권',   key: 'onnuri_voucher' },
];

function rateColor(rate) {
  if (rate === null) return COLOR.subtext;
  if (rate >= 1)     return COLOR.success;
  if (rate >= 0.7)   return '#faad14';
  return COLOR.danger;
}

// 테이블 바디 + 합계행 공용 렌더러
function DetailTableBody({ rows, totals }) {
  return (
    <table style={DT.table}>
      <thead>
        <tr>
          <th style={DT.th}>유형</th>
          <th style={{ ...DT.th, textAlign: 'right' }}>목표액</th>
          <th style={{ ...DT.th, textAlign: 'right' }}>지출액</th>
          <th style={{ ...DT.th, textAlign: 'right' }}>달성률</th>
          <th style={{ ...DT.th, textAlign: 'right' }}>부족액</th>
          <th style={{ ...DT.th, width: 180 }}>목표대비</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const color    = rateColor(r.rate);
          const barWidth = r.rate !== null ? Math.min(r.rate * 100, 100) : 0;
          return (
            <tr key={r.label} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              <td style={{ ...DT.td, fontWeight: 500 }}>{r.label}</td>
              <td style={{ ...DT.td, textAlign: 'right', color: COLOR.subtext }}>
                {r.noTarget ? '-' : KRW(r.targetAmount)}
              </td>
              <td style={{ ...DT.td, textAlign: 'right' }}>{KRW(r.actual)}</td>
              <td style={{ ...DT.td, textAlign: 'right', fontWeight: 700, color }}>
                {r.noTarget ? '-' : PCT(r.rate)}
              </td>
              <td style={{ ...DT.td, textAlign: 'right', color: r.shortfall > 0 ? COLOR.danger : COLOR.subtext }}>
                {r.noTarget || r.shortfall === 0 ? '-' : KRW(r.shortfall)}
              </td>
              <td style={DT.td}>
                {r.noTarget ? (
                  <span style={{ color: COLOR.subtext, fontSize: 12 }}>-</span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1, height: 7, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${barWidth}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.4s' }} />
                    </div>
                    {r.rate > 1 && (
                      <span style={{ fontSize: 10, color: COLOR.success, fontWeight: 700, flexShrink: 0 }}>초과</span>
                    )}
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr style={{ background: '#f0f4f8', fontWeight: 700 }}>
          <td style={{ ...DT.td, fontWeight: 700 }}>합계</td>
          <td style={{ ...DT.td, textAlign: 'right' }}>{KRW(totals.target)}</td>
          <td style={{ ...DT.td, textAlign: 'right' }}>{KRW(totals.actual)}</td>
          <td style={{ ...DT.td, textAlign: 'right', color: rateColor(totals.rate) }}>{PCT(totals.rate)}</td>
          <td style={{ ...DT.td, textAlign: 'right', color: totals.shortfall > 0 ? COLOR.danger : COLOR.subtext }}>
            {totals.shortfall > 0 ? KRW(totals.shortfall) : '-'}
          </td>
          <td style={DT.td} />
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
  return { label, targetAmount, actual, rate, shortfall, noTarget };
}

function DetailTable({ results }) {
  const [showModal, setShowModal] = useState(false);

  const resultMap = Object.fromEntries(results.map(r => [r.key, r]));

  // 기본화면 Top5: results 배열에서 targetAmount>0인 것만 부족액 순 정렬
  const top5 = results
    .filter(r => r.targetAmount > 0)
    .map(r => toDetailRow(r.label, r))
    .sort((a, b) => b.shortfall - a.shortfall)
    .slice(0, 5);

  // 모달 전체: MODAL_GROUPS 순서대로
  const modalRows = MODAL_GROUPS.map(({ label, key }) =>
    toDetailRow(label, resultMap[key])
  );

  // 합계: targetAmount>0 전체 기준
  const validAll = results.filter(r => r.targetAmount > 0);
  const totals = {
    target:   validAll.reduce((s, r) => s + r.targetAmount, 0),
    actual:   validAll.reduce((s, r) => s + r.actual, 0),
    shortfall:validAll.reduce((s, r) => s + Math.max(0, r.targetAmount - r.actual), 0),
    get rate() { return this.target > 0 ? this.actual / this.target : 0; },
  };

  return (
    <div style={{ ...S.card, marginTop: 16 }}>
      {/* 모달 */}
      {showModal && (
        <div style={DT.overlay} onClick={() => setShowModal(false)}>
          <div style={DT.modal} onClick={e => e.stopPropagation()}>
            <div style={DT.modalHeader}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>목표대비 상세현황 — 전체</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 12, color: COLOR.subtext }}>(단위: 원, %)</span>
                <button style={DT.closeBtn} onClick={() => setShowModal(false)}>✕</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <DetailTableBody rows={modalRows} totals={totals} />
            </div>
            <div style={{ padding: '10px 16px', fontSize: 12, color: COLOR.subtext, borderTop: '1px solid #f0f0f0' }}>
              ※ 유 데이터는 실시간 집계 현황에 따라 변동될 수 있습니다.
            </div>
          </div>
        </div>
      )}

      {/* 카드 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={S.cardTitle}>목표대비 상세현황</div>
          <span style={{ fontSize: 12, color: COLOR.subtext }}>부족액 Top 5</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: COLOR.subtext }}>(단위: 원, %)</span>
          <button style={DT.moreBtn} onClick={() => setShowModal(true)}>전체 보기</button>
        </div>
      </div>

      <DetailTableBody rows={top5} totals={totals} />

      <div style={{ fontSize: 12, color: COLOR.subtext, marginTop: 10 }}>
        ※ 유 데이터는 실시간 집계 현황에 따라 변동될 수 있습니다.
      </div>
    </div>
  );
}

const DT = {
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:          { padding: '10px 14px', fontWeight: 600, color: COLOR.subtext, borderBottom: `1px solid ${COLOR.border}`, textAlign: 'left', background: '#F9FAFB', whiteSpace: 'nowrap', position: 'sticky', top: 0, fontSize: 12 },
  td:          { padding: '10px 14px', borderBottom: `1px solid ${COLOR.border}`, color: COLOR.text, whiteSpace: 'nowrap' },
  moreBtn:     { fontSize: 13, fontWeight: 600, color: COLOR.primary, background: '#EBF3FE', border: 'none', borderRadius: 8, padding: '6px 16px', cursor: 'pointer' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(25,31,40,0.48)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal:       { background: '#FFFFFF', borderRadius: 20, width: 860, maxWidth: '94vw', maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.14)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 22px', borderBottom: `1px solid ${COLOR.border}`, flexShrink: 0 },
  closeBtn:    { background: 'none', border: 'none', fontSize: 18, color: COLOR.subtext, cursor: 'pointer', padding: '2px 6px', borderRadius: 8 },
};

// ── 지표별 부족금액 Top 5 ─────────────────────────────────────────────────────

function ShortfallTop5({ results }) {
  const top5 = results
    .filter(r => !r.achieved && r.targetAmount > 0)
    .map(r => ({ ...r, shortfall: r.targetAmount - r.actual }))
    .sort((a, b) => b.shortfall - a.shortfall)
    .slice(0, 5);

  const maxShortfall = top5[0]?.shortfall ?? 1;

  return (
    <div style={{ ...T.card }}>
      <div style={T.title}>🚨 지표별 부족금액 Top 5</div>

      {top5.length === 0 ? (
        <div style={T.empty}>🎉 모든 지표 달성!</div>
      ) : (
        <div style={T.list}>
          {top5.map((r, i) => (
            <div key={r.key} style={T.row}>
              <div style={T.rowHeader}>
                <span style={{ ...T.rank, background: i === 0 ? '#ff4d4f' : i === 1 ? '#fa8c16' : '#faad14' }}>
                  {i + 1}위
                </span>
                <span style={T.label}>{r.label}</span>
                <span style={T.rate}>{PCT(r.achievementRate)}</span>
              </div>
              <div style={T.barTrack}>
                <div style={{ ...T.barFill, width: `${(r.shortfall / maxShortfall) * 100}%` }} />
              </div>
              <div style={T.shortfallAmt}>
                <span style={T.shortfallNum}>{KRW(r.shortfall)}</span>
                <span style={T.shortfallSub}> 부족</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const T = {
  card:         { background: '#FFFFFF', borderRadius: 16, padding: '18px 20px', border: '1px solid #F2F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  title:        { fontSize: 14, fontWeight: 700, color: '#191F28', marginBottom: 14, letterSpacing: '-0.2px' },
  empty:        { textAlign: 'center', padding: '24px 0', fontSize: 14, color: '#00B493', fontWeight: 600 },
  list:         { display: 'flex', flexDirection: 'column', gap: 14 },
  row:          { display: 'flex', flexDirection: 'column', gap: 5 },
  rowHeader:    { display: 'flex', alignItems: 'center', gap: 8 },
  rank:         { fontSize: 11, fontWeight: 700, color: '#fff', padding: '2px 8px', borderRadius: 99, flexShrink: 0 },
  label:        { fontSize: 13, fontWeight: 600, color: '#191F28', flex: 1 },
  rate:         { fontSize: 12, color: '#8B95A1', flexShrink: 0 },
  barTrack:     { height: 5, background: '#F2F4F6', borderRadius: 99, overflow: 'hidden' },
  barFill:      { height: '100%', background: '#F04452', borderRadius: 99, transition: 'width 0.4s ease' },
  shortfallAmt: { display: 'flex', alignItems: 'baseline', gap: 2 },
  shortfallNum: { fontSize: 13, fontWeight: 700, color: '#F04452' },
  shortfallSub: { fontSize: 11, color: '#8B95A1' },
};

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

// ── 지표 시뮬레이션 ───────────────────────────────────────────────────────────

const CERT_OPTIONS = [
  { key: 'sme',              col: '중소기업제품(연동)',         label: '중소기업'   },
  { key: 'women',            col: '여성기업제품(연동)',         label: '여성기업'   },
  { key: 'startup',          col: '창업기업제품',               label: '창업기업'   },
  { key: 'disabled',         col: '장애인구매(연동)',           label: '장애인기업' },
  { key: 'standard_workshop',col: '장애인표준사업장여부',       label: '표준사업장' },
  { key: 'severe_disabled',  col: '중증장애인제품',             label: '중증장애인' },
  { key: 'social',           col: '사회적기업',                 label: '사회적기업' },
  { key: 'cooperative',      col: '사회적협동조합제품여부',     label: '협동조합'   },
  { key: 'green',            col: '친환경제품',                 label: '친환경제품' },
  { key: 'jawal',            col: '자활용사촌제품',             label: '자활용사촌' },
  { key: 'pilot',            col: '시범구매여부',               label: '시범구매'   },
  { key: 'tech',             col: '기술개발제품대상품목조회',   label: '기술개발'   },
  { key: 'nep',              col: '신제품인증(NEP)여부',        label: 'NEP'        },
];

function createVirtualRow(amount, purchaseType, checkedKeys) {
  const row = {
    '구매구분':               purchaseType,
    '물품금액':               amount,
    '채주지급금액':           0,
    '집행구분':               'Y',
    '제외여부':               0,
    '혁신제품여부':           '',
    '신제품인증(NEP) 대상품목': checkedKeys.includes('nep') ? 'Y' : '',
  };
  CERT_OPTIONS.forEach(({ key, col }) => {
    row[col] = checkedKeys.includes(key) ? 'Y' : '';
  });
  return row;
}

function Simulation({ results, rows, finalScore }) {
  const [amount, setAmount]           = useState('');
  const [purchaseType, setPurchaseType] = useState('물품');
  const [checked, setChecked]         = useState(new Set());
  const [simResult, setSimResult]     = useState(null);

  const fmtInput  = v => v.replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const parseAmt  = v => Number(v.replace(/,/g, '')) || 0;

  const toggleCert = key => setChecked(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const handleAnalyze = () => {
    const amt = parseAmt(amount);
    if (!amt) return;
    const virtualRow   = createVirtualRow(amt, purchaseType, [...checked]);
    const effectiveRows = rows.filter(r => (r['제외여부'] ?? 0) === 0);
    const sim          = calcEngine([...effectiveRows, virtualRow], SIM_OVERRIDES);
    setSimResult(sim);
  };

  // 현재 results를 map으로 변환
  const resultMap = Object.fromEntries(results.map(r => [r.key, r]));

  // 변화있는 지표 계산
  const changes = simResult
    ? simResult.results
        .map(s => {
          const cur = resultMap[s.key];
          if (!cur) return null;
          const rateDiff    = s.achievementRate - cur.achievementRate;
          const targetDiff  = s.targetAmount    - cur.targetAmount;
          const actualDiff  = s.actual          - cur.actual;
          const newlyAchieved = !cur.achieved && s.achieved;
          const hasChange = Math.abs(rateDiff) >= 0.0001 || Math.abs(targetDiff) > 0 || Math.abs(actualDiff) > 0 || newlyAchieved;
          if (!hasChange) return null;
          return {
            key: s.key, label: s.label,
            curTarget: cur.targetAmount, simTarget: s.targetAmount, targetDiff,
            curActual: cur.actual,       simActual: s.actual,       actualDiff,
            curRate: cur.achievementRate, simRate: s.achievementRate, rateDiff,
            newlyAchieved, curAchieved: cur.achieved, simAchieved: s.achieved,
          };
        })
        .filter(Boolean)
        .sort((a, b) => (b.newlyAchieved ? 1 : 0) - (a.newlyAchieved ? 1 : 0) || b.rateDiff - a.rateDiff)
    : [];

  const scoreDiff = simResult ? simResult.finalScore - finalScore : 0;

  return (
    <div style={{ ...S.card, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={S.cardTitle}>🔮 지표 시뮬레이션</div>

      <div style={{ display: 'flex', gap: 16, flex: 1 }}>

        {/* 왼쪽: 입력 */}
        <div style={SIM.inputPane}>
          <div style={SIM.fieldGroup}>
            <div style={SIM.label}>구매예정금액</div>
            <div style={SIM.amountWrap}>
              <input
                value={amount}
                onChange={e => setAmount(fmtInput(e.target.value))}
                placeholder="예: 10,000,000"
                style={SIM.amountInput}
              />
              <span style={SIM.unit}>원</span>
            </div>
          </div>

          <div style={SIM.fieldGroup}>
            <div style={SIM.label}>구매구분</div>
            <div style={{ display: 'flex', gap: 14 }}>
              {['물품', '용역', '공사'].map(t => (
                <label key={t} style={SIM.radioLabel}>
                  <input type="radio" value={t} checked={purchaseType === t}
                    onChange={() => setPurchaseType(t)} style={{ marginRight: 5 }} />
                  {t}
                </label>
              ))}
            </div>
          </div>

          <div style={SIM.fieldGroup}>
            <div style={SIM.label}>인증종류 (중복선택)</div>
            <div style={SIM.certGrid}>
              {CERT_OPTIONS.map(({ key, label }) => (
                <label key={key} style={SIM.certItem}>
                  <input type="checkbox" checked={checked.has(key)}
                    onChange={() => toggleCert(key)} style={{ marginRight: 5 }} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <button
            style={{ ...SIM.analyzeBtn, opacity: parseAmt(amount) > 0 ? 1 : 0.5 }}
            onClick={handleAnalyze}
            disabled={parseAmt(amount) === 0}
          >
            분석하기
          </button>
        </div>

        {/* 오른쪽: 결과 */}
        <div style={SIM.resultPane}>
          {!simResult ? (
            <div style={SIM.placeholder}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
              <div style={{ fontSize: 14, color: COLOR.subtext }}>금액과 구매유형을 입력 후<br />분석하기를 눌러주세요.</div>
            </div>
          ) : (
            <>
              {/* 점수 비교 */}
              <div style={SIM.scoreBox}>
                <div style={SIM.scoreRow}>
                  <span style={SIM.scoreLabel}>현재 점수</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: COLOR.text }}>{finalScore.toFixed(2)}<span style={{ fontSize: 13, color: COLOR.subtext, fontWeight: 400 }}>점</span></span>
                </div>
                <div style={{ fontSize: 18, color: COLOR.subtext, margin: '0 8px' }}>→</div>
                <div style={SIM.scoreRow}>
                  <span style={SIM.scoreLabel}>예상 점수</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: scoreDiff > 0 ? COLOR.success : COLOR.text }}>
                      {simResult.finalScore.toFixed(2)}<span style={{ fontSize: 13, fontWeight: 400, color: COLOR.subtext }}>점</span>
                    </span>
                    {scoreDiff > 0 && (
                      <span style={{ fontSize: 13, fontWeight: 700, color: COLOR.success }}>+{scoreDiff.toFixed(4)}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 선택한 인증 지표 변동 분석 */}
              <div style={{ fontSize: 12, fontWeight: 700, color: COLOR.subtext, marginTop: 12, marginBottom: 4 }}>
                선택한 인증 지표 변동 분석
              </div>
              {changes.length === 0 ? (
                <div style={{ fontSize: 13, color: COLOR.subtext, textAlign: 'center', padding: '16px 0' }}>
                  이 조건으로는 지표 변화가 없습니다.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 4 }}>
                  <thead>
                    <tr style={{ background: COLOR.bg }}>
                      <th style={SIM.th}>지표</th>
                      <th style={{ ...SIM.th, textAlign: 'right' }}>목표액</th>
                      <th style={{ ...SIM.th, textAlign: 'right' }}>지출액</th>
                      <th style={{ ...SIM.th, textAlign: 'right' }}>달성률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map((c, i) => {
                      const tDiffColor = c.targetDiff > 0 ? COLOR.danger : c.targetDiff < 0 ? COLOR.primary : COLOR.subtext;
                      const aDiffColor = c.actualDiff > 0 ? COLOR.success : COLOR.danger;
                      const rDiffColor = c.rateDiff > 0 ? COLOR.success : COLOR.danger;
                      return (
                        <tr key={c.key} style={{ background: c.newlyAchieved ? '#F0FAF8' : i % 2 === 0 ? '#fff' : COLOR.bg }}>
                          {/* 지표명 */}
                          <td style={{ ...SIM.td, fontWeight: 600 }}>{c.label}</td>

                          {/* 목표액 */}
                          <td style={{ ...SIM.td, textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: COLOR.text }}>{KRW(c.simTarget)}</div>
                            {Math.abs(c.targetDiff) > 0 && (
                              <div style={{ fontSize: 10, color: tDiffColor, marginTop: 1 }}>
                                {c.targetDiff > 0 ? '+' : ''}{KRW(c.targetDiff)}
                              </div>
                            )}
                          </td>

                          {/* 지출액 */}
                          <td style={{ ...SIM.td, textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: COLOR.text }}>{KRW(c.simActual)}</div>
                            {Math.abs(c.actualDiff) > 0 && (
                              <div style={{ fontSize: 10, color: aDiffColor, marginTop: 1 }}>
                                {c.actualDiff > 0 ? '+' : ''}{KRW(c.actualDiff)}
                              </div>
                            )}
                          </td>

                          {/* 달성률 */}
                          <td style={{ ...SIM.td, textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                              <span style={{ fontWeight: 700, color: c.simAchieved ? COLOR.success : COLOR.danger }}>
                                {PCT(c.simRate)}
                              </span>
                              {c.newlyAchieved && (
                                <span style={{ fontSize: 10, fontWeight: 700, background: COLOR.success, color: '#fff', padding: '1px 6px', borderRadius: 99 }}>✓ 달성</span>
                              )}
                            </div>
                            {Math.abs(c.rateDiff) >= 0.0001 && (
                              <div style={{ fontSize: 10, color: rDiffColor, marginTop: 1, textAlign: 'right' }}>
                                {c.rateDiff > 0 ? '+' : ''}{(c.rateDiff * 100).toFixed(1)}%p
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}

const SIM = {
  inputPane:   { flex: '0 0 42%', display: 'flex', flexDirection: 'column', gap: 16, borderRight: `1px solid ${COLOR.border}`, paddingRight: 18 },
  resultPane:  { flex: 1, display: 'flex', flexDirection: 'column' },
  fieldGroup:  { display: 'flex', flexDirection: 'column', gap: 7 },
  label:       { fontSize: 12, fontWeight: 600, color: COLOR.subtext },
  amountWrap:  { display: 'flex', alignItems: 'center', gap: 8 },
  amountInput: { flex: 1, padding: '9px 12px', border: `1px solid ${COLOR.border}`, borderRadius: 10, fontSize: 14, outline: 'none', background: COLOR.bg, color: COLOR.text },
  unit:        { fontSize: 13, color: COLOR.subtext, flexShrink: 0 },
  radioLabel:  { fontSize: 13, color: COLOR.text, display: 'flex', alignItems: 'center', cursor: 'pointer' },
  certGrid:    { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '7px 4px' },
  certItem:    { fontSize: 12, color: COLOR.text, display: 'flex', alignItems: 'center', cursor: 'pointer', whiteSpace: 'nowrap' },
  analyzeBtn:  { padding: '10px', background: COLOR.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.2px' },
  placeholder: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  scoreBox:    { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: COLOR.bg, borderRadius: 12, padding: '14px 16px', marginBottom: 4 },
  scoreRow:    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 },
  scoreLabel:  { fontSize: 11, color: COLOR.subtext, fontWeight: 500 },
  th:          { padding: '8px 10px', fontWeight: 600, color: COLOR.subtext, borderBottom: `1px solid ${COLOR.border}`, textAlign: 'left', background: COLOR.bg },
  td:          { padding: '8px 10px', borderBottom: `1px solid ${COLOR.border}`, color: COLOR.text },
};

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
          icon="🎯"
          title="공공구매 목표액"
          value={KRW(stats?.totalTargetSum)}
          sub={`목표 합산`}
        />
        <KpiCard
          icon="📦"
          title="공공구매 지출액"
          value={KRW(stats?.totalPurchase)}
          sub="물품·용역·공사"
        />
        <KpiCard
          icon="✅"
          title="지표달성률(전체)"
          value={`${achieved.length} / ${results.length}개`}
          sub={`(${results.length ? ((achieved.length / results.length) * 100).toFixed(1) : '0.0'}%)`}
          valueColor={achieved.length >= results.length * 0.7 ? COLOR.success : COLOR.danger}
        />
        <KpiCard
          icon="⭐"
          title="공공구매 점수"
          value={finalScore.toFixed(2)}
          unit="/ 4.00점"
          sub={finalScore >= 3 ? '우수' : finalScore >= 2 ? '보통' : '미흡'}
          valueColor={scoreColor}
        />
      </div>

      {/* ── 3열 레이아웃 ── */}
      <div style={S.threeCol}>

        {/* 왼쪽: 바 차트 */}
        <div style={{ ...S.card, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={S.cardTitle}>유형별 목표 대비 달성률</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: COLOR.subtext, marginBottom: 12 }}>
            <span><span style={{ ...S.dot, background: COLOR.success }} />달성</span>
            <span><span style={{ ...S.dot, background: COLOR.gray }} />미달성</span>
            <span style={{ color: COLOR.danger }}>— 100% 목표선</span>
          </div>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height={520}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 36, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F2F4F6" />
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
                  width={84}
                  tick={{ fontSize: 12, fill: COLOR.text }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F9FAFB' }} />
                <ReferenceLine x={100} stroke={COLOR.danger} strokeDasharray="5 3" strokeWidth={1.5} />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={16}>
                  {chartData.map(d => (
                    <Cell key={d.key} fill={d.achieved ? COLOR.success : COLOR.gray} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 가운데: 부족금액 Top 5 */}
        <div style={{ flex: 1 }}>
          <ShortfallTop5 results={results} />
        </div>

        {/* 오른쪽: 달성/미달성 현황 */}
        <div style={{ flex: 1 }}>
          <AchievementStatus results={results} />
        </div>

      </div>

      {/* ── 목표대비 상세현황 + 시뮬레이션 ── */}
      <div style={{ display: 'flex', gap: 24, marginTop: 14, alignItems: 'stretch' }}>
        <div style={{ width: '50%' }}>
          <DetailTable results={results} />
        </div>
        <div style={{ width: '50%' }}>
          <Simulation results={results} rows={rows} finalScore={finalScore} />
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
    padding: '20px 24px',
    border: '1px solid #F2F4F6',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: COLOR.text,
    marginBottom: 16,
    letterSpacing: '-0.2px',
  },
  kpiRow: {
    display: 'flex',
    gap: 14,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    background: '#FFFFFF',
    borderRadius: 16,
    padding: '20px 20px 18px',
    border: '1px solid #F2F4F6',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    minWidth: 0,
  },
  kpiCardClickable: { cursor: 'pointer', transition: 'border-color 0.15s' },
  kpiIcon:     { fontSize: 20, marginBottom: 10 },
  kpiTitle:    { fontSize: 12, color: COLOR.subtext, marginBottom: 8, fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center', letterSpacing: '0.1px' },
  kpiHint:     { fontSize: 11, color: COLOR.primary, fontWeight: 500 },
  kpiValueRow: { display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' },
  kpiValue:    { fontSize: 22, fontWeight: 800, lineHeight: 1, color: COLOR.text, letterSpacing: '-0.5px' },
  kpiUnit:     { fontSize: 13, color: COLOR.subtext },
  kpiSub:      { fontSize: 12, color: COLOR.subtext, marginTop: 6 },
  threeCol: {
    display: 'flex',
    gap: 14,
    alignItems: 'stretch',
    marginBottom: 14,
  },
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
