import { useState } from 'react';
import { calcEngine } from '../utils/calcEngine';

// Dashboard의 SIM_OVERRIDES와 동일
const SIM_OVERRIDES = {
  headcount: 14,
  fixedTargets: { green_product: 2247000, jawal_veteran: 1420000 },
};

const CERT_OPTIONS = [
  { key: 'sme',              col: '중소기업제품(연동)',         label: '중소기업'   },
  { key: 'women',            col: '여성기업제품(연동)',         label: '여성기업'   },
  { key: 'startup',          col: '창업기업제품',               label: '창업기업'   },
  { key: 'disabled',         col: '장애인구매(연동)',           label: '장애인기업' },
  { key: 'standard_workshop',col: '장애인표준사업장여부',       label: '장애인표준사업장' },
  { key: 'severe_disabled',  col: '중증장애인제품',             label: '중증장애인' },
  { key: 'social',           col: '사회적기업',                 label: '사회적기업' },
  { key: 'cooperative',      col: '사회적협동조합제품여부',     label: '사회적협동조합' },
  { key: 'green',            col: '친환경제품',                 label: '친환경제품' },
  { key: 'jawal',            col: '자활용사촌제품',             label: '자활용사촌' },
  { key: 'pilot',            col: '시범구매여부',               label: '시범구매'   },
  { key: 'tech',             col: '기술개발제품대상품목조회',   label: '기술개발'   },
  { key: 'nep',              col: '신제품인증(NEP)여부',        label: 'NEP'        },
  { key: 'innovative',       col: '혁신제품여부',               label: '혁신제품'   },
];

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

const KRW = (n) => n == null ? '-' : Math.round(n).toLocaleString('ko-KR') + '원';
const PCT = (r) => r == null ? '-' : (r * 100).toFixed(1) + '%';

function createVirtualRow(amount, purchaseType, checkedKeys) {
  const row = {
    '구매구분':               purchaseType,
    '물품금액':               amount,
    '채주지급금액':           0,
    '집행구분':               'Y',
    '제외여부':               0,
    '신제품인증(NEP) 대상품목': checkedKeys.includes('nep') ? 'Y' : '',
  };
  CERT_OPTIONS.forEach(({ key, col }) => {
    row[col] = checkedKeys.includes(key) ? 'Y' : '';
  });
  return row;
}

// ── 요약 카드 ─────────────────────────────────────────────────────────────────
function SummaryCard({ icon, label, value, sub, valueColor }) {
  return (
    <div style={SC.card}>
      <div style={SC.icon}>{icon}</div>
      <div style={SC.label}>{label}</div>
      <div style={{ ...SC.value, color: valueColor ?? COLOR.text }}>{value}</div>
      {sub && <div style={SC.sub}>{sub}</div>}
    </div>
  );
}

const SC = {
  card:  { background: '#fff', borderRadius: 16, padding: '20px 24px', border: `1px solid ${COLOR.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', flex: 1 },
  icon:  { fontSize: 22, marginBottom: 8 },
  label: { fontSize: 12, color: COLOR.subtext, fontWeight: 500, marginBottom: 6 },
  value: { fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1 },
  sub:   { fontSize: 12, color: COLOR.subtext, marginTop: 6 },
};

// ── 메인 ─────────────────────────────────────────────────────────────────────
export default function SimulationPage({ rows = [], results = [], finalScore = 0, maxScore = 4 }) {
  const [amount, setAmount]             = useState('');
  const [purchaseType, setPurchaseType] = useState('물품');
  const [checked, setChecked]           = useState(new Set());
  const [simResult, setSimResult]       = useState(null);

  const fmtInput = v => v.replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const parseAmt = v => Number(v.replace(/,/g, '')) || 0;

  const toggleCert = key => setChecked(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const handleAnalyze = () => {
    const amt = parseAmt(amount);
    if (!amt) return;
    const virtualRow    = createVirtualRow(amt, purchaseType, [...checked]);
    const effectiveRows = rows.filter(r => (r['제외여부'] ?? 0) === 0);
    const sim           = calcEngine([...effectiveRows, virtualRow], SIM_OVERRIDES);
    setSimResult(sim);
  };

  const handleReset = () => {
    setAmount('');
    setPurchaseType('물품');
    setChecked(new Set());
    setSimResult(null);
  };

  const resultMap = Object.fromEntries(results.map(r => [r.key, r]));

  const achieved    = results.filter(r => r.achieved);
  const totalPurchaseAll = results.reduce((s, r) => s + (r.actual ?? 0), 0);

  const changes = simResult
    ? simResult.results
        .map(s => {
          const cur = resultMap[s.key];
          if (!cur) return null;
          const rateDiff     = s.achievementRate - cur.achievementRate;
          const actualDiff   = s.actual          - cur.actual;
          const newlyAchieved = !cur.achieved && s.achieved;
          const lostAchieved  = cur.achieved && !s.achieved;
          const hasChange = Math.abs(rateDiff) >= 0.0001 || Math.abs(actualDiff) > 0 || newlyAchieved || lostAchieved;
          if (!hasChange) return null;
          return {
            key: s.key, label: s.label,
            curTarget: cur.targetAmount, simTarget: s.targetAmount,
            curActual: cur.actual,       simActual: s.actual,       actualDiff,
            curRate: cur.achievementRate, simRate: s.achievementRate, rateDiff,
            newlyAchieved, lostAchieved, curAchieved: cur.achieved, simAchieved: s.achieved,
          };
        })
        .filter(Boolean)
        .sort((a, b) =>
          (b.newlyAchieved ? 2 : b.lostAchieved ? -2 : 0) -
          (a.newlyAchieved ? 2 : a.lostAchieved ? -2 : 0) ||
          b.rateDiff - a.rateDiff
        )
    : [];

  const scoreDiff   = simResult ? simResult.finalScore - finalScore : 0;
  const scoreColor  = finalScore >= 3 ? COLOR.success : finalScore >= 2 ? '#faad14' : COLOR.danger;
  const simColor    = simResult
    ? (simResult.finalScore >= 3 ? COLOR.success : simResult.finalScore >= 2 ? '#faad14' : COLOR.danger)
    : COLOR.text;

  return (
    <div style={{ fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>

      {/* ── 요약 카드 ── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        <SummaryCard
          icon="⭐"
          label="현재 공공구매 점수"
          value={`${finalScore.toFixed(2)}점`}
          sub={`만점 ${maxScore?.toFixed(2) ?? '4.00'}점`}
          valueColor={scoreColor}
        />
        <SummaryCard
          icon="✅"
          label="달성 지표"
          value={`${achieved.length} / ${results.length}개`}
          sub={results.length ? `달성률 ${((achieved.length / results.length) * 100).toFixed(1)}%` : '-'}
          valueColor={achieved.length >= results.length * 0.7 ? COLOR.success : COLOR.danger}
        />
        <SummaryCard
          icon="📦"
          label="총 구매 실적"
          value={KRW(rows.filter(r => (r['제외여부'] ?? 0) === 0).reduce((s, r) => s + (Number(r['물품금액']) || 0), 0))}
          sub={`${rows.length}건`}
        />
        <SummaryCard
          icon="🔍"
          label="미달성 지표"
          value={`${results.filter(r => !r.achieved && r.targetAmount > 0).length}개`}
          sub="추가 구매 필요"
          valueColor={COLOR.danger}
        />
      </div>

      {/* ── 시뮬레이션 패널 ── */}
      <div style={P.panel}>
        <div style={P.header}>
          <div>
            <div style={P.title}>🔮 실적 시뮬레이션</div>
            <div style={P.desc}>구매 예정 건을 입력하면 지표별 달성률과 점수 변화를 미리 확인할 수 있습니다.</div>
          </div>
          {simResult && (
            <button onClick={handleReset} style={P.resetBtn}>초기화</button>
          )}
        </div>

        <div style={P.body}>

          {/* 왼쪽: 입력 */}
          <div style={P.inputPane}>

            <div style={P.fieldGroup}>
              <div style={P.label}>구매예정금액</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  value={amount}
                  onChange={e => setAmount(fmtInput(e.target.value))}
                  placeholder="예: 10,000,000"
                  style={P.amountInput}
                />
                <span style={{ fontSize: 13, color: COLOR.subtext, flexShrink: 0 }}>원</span>
              </div>
            </div>

            <div style={P.fieldGroup}>
              <div style={P.label}>구매유형</div>
              <div style={{ display: 'flex', gap: 20 }}>
                {['물품', '용역', '공사'].map(t => (
                  <label key={t} style={P.radioLabel}>
                    <input type="radio" value={t} checked={purchaseType === t}
                      onChange={() => setPurchaseType(t)} style={{ marginRight: 6 }} />
                    {t}
                  </label>
                ))}
              </div>
            </div>

            <div style={P.fieldGroup}>
              <div style={P.label}>인증종류 (중복선택)</div>
              <div style={P.certGrid}>
                {CERT_OPTIONS.map(({ key, label }) => (
                  <label key={key} style={{ ...P.certItem, background: checked.has(key) ? '#EBF3FE' : 'transparent' }}>
                    <input type="checkbox" checked={checked.has(key)}
                      onChange={() => toggleCert(key)} style={{ marginRight: 6 }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <button
              style={{ ...P.analyzeBtn, opacity: parseAmt(amount) > 0 ? 1 : 0.45, cursor: parseAmt(amount) > 0 ? 'pointer' : 'not-allowed' }}
              onClick={handleAnalyze}
              disabled={parseAmt(amount) === 0}
            >
              분석하기
            </button>

            {/* 입력 요약 */}
            {simResult && (
              <div style={P.inputSummary}>
                <div style={P.inputSummaryTitle}>분석 조건</div>
                <div style={P.inputSummaryRow}>
                  <span>금액</span><span style={{ fontWeight: 700 }}>{KRW(parseAmt(amount))}</span>
                </div>
                <div style={P.inputSummaryRow}>
                  <span>구분</span><span style={{ fontWeight: 700 }}>{purchaseType}</span>
                </div>
                {checked.size > 0 && (
                  <div style={P.inputSummaryRow}>
                    <span>인증</span>
                    <span style={{ fontWeight: 700, textAlign: 'right', maxWidth: 160 }}>
                      {CERT_OPTIONS.filter(c => checked.has(c.key)).map(c => c.label).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 오른쪽: 결과 */}
          <div style={P.resultPane}>
            {!simResult ? (
              <div style={P.placeholder}>
                <div style={{ fontSize: 48, marginBottom: 14 }}>📊</div>
                <div style={{ fontSize: 16, color: COLOR.subtext, marginBottom: 8 }}>구매 예정 정보를 입력하고</div>
                <div style={{ fontSize: 16, color: COLOR.subtext }}>"분석하기"를 눌러주세요.</div>
              </div>
            ) : (
              <>
                {/* 점수 비교 카드 */}
                <div style={P.scoreRow}>
                  <div style={P.scoreBox}>
                    <div style={P.scoreBoxLabel}>현재 점수</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: scoreColor, letterSpacing: '-1px' }}>
                      {finalScore.toFixed(2)}
                      <span style={{ fontSize: 16, fontWeight: 400, color: COLOR.subtext }}> / {maxScore?.toFixed(2) ?? '4.00'}점</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 28, color: COLOR.subtext, alignSelf: 'center' }}>→</div>
                  <div style={{ ...P.scoreBox, border: `2px solid ${scoreDiff > 0 ? COLOR.success : COLOR.border}` }}>
                    <div style={P.scoreBoxLabel}>예상 점수</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontSize: 32, fontWeight: 800, color: simColor, letterSpacing: '-1px' }}>
                        {simResult.finalScore.toFixed(2)}
                        <span style={{ fontSize: 16, fontWeight: 400, color: COLOR.subtext }}> / {maxScore?.toFixed(2) ?? '4.00'}점</span>
                      </span>
                      {scoreDiff !== 0 && (
                        <span style={{ fontSize: 15, fontWeight: 700, color: scoreDiff > 0 ? COLOR.success : COLOR.danger }}>
                          {scoreDiff > 0 ? '+' : ''}{scoreDiff.toFixed(4)}
                        </span>
                      )}
                    </div>
                    {scoreDiff > 0 && (
                      <div style={{ fontSize: 12, color: COLOR.success, marginTop: 4, fontWeight: 600 }}>
                        점수 상승 예상 ↑
                      </div>
                    )}
                  </div>
                </div>

                {/* 지표 변동 테이블 */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.subtext, marginBottom: 8 }}>
                    지표별 변동 분석 {changes.length > 0 ? `(${changes.length}개 변화)` : ''}
                  </div>
                  {changes.length === 0 ? (
                    <div style={P.noChange}>
                      이 조건으로는 지표 변화가 없습니다.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={P.table}>
                        <thead>
                          <tr style={{ background: COLOR.bg }}>
                            <th style={P.th}>지표</th>
                            <th style={{ ...P.th, textAlign: 'right' }}>목표액</th>
                            <th style={{ ...P.th, textAlign: 'right' }}>현재 실적</th>
                            <th style={{ ...P.th, textAlign: 'right' }}>예상 실적</th>
                            <th style={{ ...P.th, textAlign: 'right' }}>증가분</th>
                            <th style={{ ...P.th, textAlign: 'right' }}>현재 달성률</th>
                            <th style={{ ...P.th, textAlign: 'right' }}>예상 달성률</th>
                            <th style={{ ...P.th, textAlign: 'center' }}>결과</th>
                          </tr>
                        </thead>
                        <tbody>
                          {changes.map((c, i) => {
                            const aDiffColor = c.actualDiff > 0 ? COLOR.success : COLOR.danger;
                            const rDiffColor = c.rateDiff > 0 ? COLOR.success : COLOR.danger;
                            const rowBg = c.newlyAchieved ? '#F0FAF8' : c.lostAchieved ? '#FFF5F5' : i % 2 === 0 ? '#fff' : COLOR.bg;
                            return (
                              <tr key={c.key} style={{ background: rowBg }}>
                                <td style={{ ...P.td, fontWeight: 600 }}>{c.label}</td>
                                <td style={{ ...P.td, textAlign: 'right', color: COLOR.subtext }}>{KRW(c.simTarget)}</td>
                                <td style={{ ...P.td, textAlign: 'right' }}>{KRW(c.curActual)}</td>
                                <td style={{ ...P.td, textAlign: 'right', fontWeight: 700 }}>{KRW(c.simActual)}</td>
                                <td style={{ ...P.td, textAlign: 'right', color: aDiffColor, fontWeight: 700 }}>
                                  {c.actualDiff > 0 ? '+' : ''}{KRW(c.actualDiff)}
                                </td>
                                <td style={{ ...P.td, textAlign: 'right', color: c.curAchieved ? COLOR.success : COLOR.danger }}>
                                  {PCT(c.curRate)}
                                </td>
                                <td style={{ ...P.td, textAlign: 'right' }}>
                                  <span style={{ color: rDiffColor, fontWeight: 700 }}>{PCT(c.simRate)}</span>
                                  {Math.abs(c.rateDiff) >= 0.0001 && (
                                    <span style={{ fontSize: 11, color: rDiffColor, marginLeft: 4 }}>
                                      ({c.rateDiff > 0 ? '+' : ''}{(c.rateDiff * 100).toFixed(1)}%p)
                                    </span>
                                  )}
                                </td>
                                <td style={{ ...P.td, textAlign: 'center' }}>
                                  {c.newlyAchieved && (
                                    <span style={P.badgeSuccess}>✓ 달성</span>
                                  )}
                                  {c.lostAchieved && (
                                    <span style={P.badgeDanger}>✗ 미달</span>
                                  )}
                                  {!c.newlyAchieved && !c.lostAchieved && (
                                    <span style={P.badgeNeutral}>변동</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ── 스타일 ───────────────────────────────────────────────────────────────────
const P = {
  panel:        { background: '#fff', borderRadius: 16, border: `1px solid ${COLOR.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '22px 28px', borderBottom: `1px solid ${COLOR.border}` },
  title:        { fontSize: 18, fontWeight: 800, color: COLOR.text, letterSpacing: '-0.3px', marginBottom: 4 },
  desc:         { fontSize: 13, color: COLOR.subtext },
  resetBtn:     { padding: '8px 18px', background: '#F2F4F6', color: COLOR.text, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' },
  body:         { display: 'flex', gap: 0 },
  inputPane:    { flex: '0 0 320px', borderRight: `1px solid ${COLOR.border}`, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 },
  resultPane:   { flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column' },
  fieldGroup:   { display: 'flex', flexDirection: 'column', gap: 8 },
  label:        { fontSize: 12, fontWeight: 700, color: COLOR.subtext, textTransform: 'uppercase', letterSpacing: '0.5px' },
  amountInput:  { flex: 1, padding: '11px 14px', border: `1.5px solid ${COLOR.border}`, borderRadius: 10, fontSize: 15, outline: 'none', background: COLOR.bg, color: COLOR.text, fontWeight: 600 },
  radioLabel:   { fontSize: 14, color: COLOR.text, display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 500 },
  certGrid:     { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 6px' },
  certItem:     { fontSize: 13, color: COLOR.text, display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '6px 8px', borderRadius: 8, transition: 'background 0.15s' },
  analyzeBtn:   { padding: '13px', background: COLOR.primary, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, letterSpacing: '-0.2px' },
  inputSummary: { background: COLOR.bg, borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 },
  inputSummaryTitle: { fontSize: 11, fontWeight: 700, color: COLOR.subtext, marginBottom: 2 },
  inputSummaryRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: 13, color: COLOR.text, gap: 8 },
  placeholder:  { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px 0' },
  scoreRow:     { display: 'flex', gap: 16, alignItems: 'stretch' },
  scoreBox:     { flex: 1, background: COLOR.bg, borderRadius: 14, padding: '18px 22px', border: `1.5px solid ${COLOR.border}` },
  scoreBoxLabel:{ fontSize: 12, color: COLOR.subtext, fontWeight: 600, marginBottom: 8 },
  noChange:     { textAlign: 'center', padding: '32px 0', fontSize: 14, color: COLOR.subtext, background: COLOR.bg, borderRadius: 12 },
  table:        { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:           { padding: '10px 14px', fontWeight: 600, color: COLOR.subtext, borderBottom: `1px solid ${COLOR.border}`, textAlign: 'left', background: COLOR.bg, whiteSpace: 'nowrap', fontSize: 12 },
  td:           { padding: '11px 14px', borderBottom: `1px solid ${COLOR.border}`, color: COLOR.text, whiteSpace: 'nowrap' },
  badgeSuccess: { fontSize: 11, fontWeight: 700, background: COLOR.success, color: '#fff', padding: '3px 10px', borderRadius: 99 },
  badgeDanger:  { fontSize: 11, fontWeight: 700, background: COLOR.danger,  color: '#fff', padding: '3px 10px', borderRadius: 99 },
  badgeNeutral: { fontSize: 11, fontWeight: 600, background: '#F2F4F6',     color: COLOR.subtext, padding: '3px 10px', borderRadius: 99 },
};
