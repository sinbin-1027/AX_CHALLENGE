import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Cell, ResponsiveContainer,
} from 'recharts';

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

// ── 지표별 목표액 모달 ────────────────────────────────────────────────────────
const BASIS_TEXT = {
  sme:                '총구매액 × 80%',
  startup:            '총구매액 × 15%',
  women_goods:        '물품구매액 × 5%',
  women_service:      '용역구매액 × 5%',
  women_construction: '공사구매액 × 3%',
  social_enterprise:  '(물품+용역) × 5%',
  cooperative:        '(물품+용역) × 0.1%',
  disabled_enterprise:'총구매액 × 1%',
  standard_workshop:  '(물품+용역) × 0.8%',
  severe_disabled:    '(물품+용역) × 1.1%',
  tech_development:   '중소기업물품 × 20%',
  pilot_purchase:     '중소기업물품 × 1.5%',
  nep:                'NEP대상품목 × 20%',
  green_product:      '고정 목표액',
  jawal_veteran:      '고정 목표액',
  innovative_product: '(물품+용역) × 3%',
  onnuri_voucher:     '부서인원 × 250,000원',
};

export function TargetModal({ results, onClose }) {
  const total = results.reduce((s, r) => s + r.targetAmount, 0);
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
                <th style={{ ...TM.th, textAlign: 'right' }}>목표액</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.key} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ ...TM.td, fontWeight: 600 }}>{r.label}</td>
                  <td style={{ ...TM.td, color: COLOR.subtext, fontSize: 12 }}>
                    {BASIS_TEXT[r.key] ?? '-'}
                  </td>
                  <td style={{ ...TM.td, textAlign: 'right', fontWeight: 600 }}>
                    {r.targetAmount > 0 ? KRW(r.targetAmount) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f0f4f8', fontWeight: 700 }}>
                <td style={TM.td} colSpan={2}>합계</td>
                <td style={{ ...TM.td, textAlign: 'right', color: COLOR.primary }}>{KRW(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

const TM = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(25,31,40,0.48)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  panel:   { background: '#FFFFFF', borderRadius: 20, width: 600, maxWidth: '90vw', maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.14)' },
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
  { key: '구매구분',        label: '구매구분',    align: 'left'  },
  { key: '수령인사업자명',  label: '거래처',      align: 'left'  },
  { key: '적요',            label: '적요',        align: 'left'  },
  { key: '예산명',          label: '예산명',      align: 'left'  },
  { key: '물품금액',        label: '금액',        align: 'right' },
];

export function DetailModal({ rows, onClose }) {
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
  { label: '사회적협동조합', key: 'cooperative' },
  { label: '장애인기업',     key: 'disabled_enterprise' },
  { label: '장애인표준사업장', key: 'standard_workshop' },
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

// ── 메인 ─────────────────────────────────────────────────────────────────────
export default function Dashboard({ results, totalScore, finalScore, stats, rows = [], maxScore, isYeonsoo = false }) {
  const [showDetail, setShowDetail]         = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
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

      {showDetail      && <DetailModal  rows={rows}    onClose={() => setShowDetail(false)} />}
      {showTargetModal && <TargetModal  results={results} onClose={() => setShowTargetModal(false)} />}

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
          onClick={() => setShowTargetModal(true)}
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
          unit={`/ ${maxScore?.toFixed(2) ?? '4.00'}점`}
          valueColor={scoreColor}
        />
      </div>

      {/* ── 중단: 바 차트 + 목표대비 상세현황 ── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'stretch', marginBottom: 20 }}>

        {/* 왼쪽 50%: 바 차트 */}
        <div style={{ ...S.card, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={S.cardTitle}>유형별 목표 대비 달성률</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: COLOR.subtext, marginBottom: 12 }}>
            <span><span style={{ ...S.dot, background: COLOR.success }} />달성</span>
            <span><span style={{ ...S.dot, background: COLOR.danger }} />미달성</span>
            <span style={{ color: COLOR.subtext }}>— 100% 목표선</span>
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
                <ReferenceLine x={100} stroke={COLOR.subtext} strokeDasharray="5 3" strokeWidth={1.5} />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={16}>
                  {chartData.map(d => (
                    <Cell key={d.key} fill={d.achieved ? COLOR.success : COLOR.danger} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 오른쪽 50%: 목표대비 상세현황 */}
        <div style={{ flex: 1 }}>
          <DetailTable results={results} />
        </div>

      </div>

      {/* ── 하단: 지표별 부족금액 Top5 + 달성/미달성 현황 ── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'stretch', marginBottom: 20 }}>

        {/* 왼쪽 50%: 부족금액 Top 5 */}
        <div style={{ flex: 1 }}>
          <ShortfallTop5 results={results} />
        </div>

        {/* 오른쪽 50%: 달성/미달성 현황 */}
        <div style={{ flex: 1 }}>
          <AchievementStatus results={results} />
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
