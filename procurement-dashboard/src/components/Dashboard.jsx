import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Cell, ResponsiveContainer,
} from 'recharts';

// ── 포맷 헬퍼 ────────────────────────────────────────────────────────────────

const KRW  = (n) => (n == null ? '-' : Math.round(n).toLocaleString('ko-KR') + '원');
const PCT  = (r) => (r == null ? '-' : (r * 100).toFixed(1) + '%');
const SIGN = (n) => (n >= 0 ? '+' : '') + Math.round(n).toLocaleString('ko-KR') + '원';

const C = {
  success: '#52c41a',
  warning: '#faad14',
  danger:  '#ff4d4f',
  primary: '#1677ff',
  gray:    '#8c8c8c',
  border:  '#e8e8e8',
  bg:      '#f0f2f5',
  card:    '#ffffff',
};

function scoreColor(s) {
  if (s >= 3) return C.success;
  if (s >= 2) return C.warning;
  return C.danger;
}

// ── KPI 카드 ─────────────────────────────────────────────────────────────────

function KpiCard({ title, value, sub, accent }) {
  return (
    <div style={{ ...S.card, flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, color: C.gray, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent ?? '#1e293b', lineHeight: 1.2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: C.gray, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ── 프로그레스바 (테이블용) ───────────────────────────────────────────────────

function MiniBar({ rate, achieved }) {
  const pct = Math.min((rate ?? 0) * 100, 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: achieved ? C.success : C.primary, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 12, width: 46, textAlign: 'right', color: achieved ? C.success : '#595959' }}>
        {PCT(rate)}
      </span>
    </div>
  );
}

// ── 커스텀 툴팁 ──────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div>달성률: <b style={{ color: d.achieved ? C.success : C.primary }}>{d.rateLabel}</b></div>
      <div>목표액: {KRW(d.targetAmount)}</div>
      <div>실적액: {KRW(d.actual)}</div>
    </div>
  );
}

// ── 메인 대시보드 ─────────────────────────────────────────────────────────────

export default function Dashboard({ results, totalScore, finalScore, stats }) {
  const fColor = scoreColor(finalScore);

  // 바 차트 데이터 (achievementRate → %, 200% 상한)
  const chartData = results.map((r) => ({
    label:        r.label,
    rate:         Math.min(+(r.achievementRate * 100).toFixed(1), 200),
    rateLabel:    PCT(r.achievementRate),
    achieved:     r.achieved,
    targetAmount: r.targetAmount,
    actual:       r.actual,
    key:          r.key,
  }));

  // 달성 / 미달성 분류
  const achieved    = results.filter((r) => r.achieved).sort((a, b) => b.achievementRate - a.achievementRate);
  const notAchieved = results.filter((r) => !r.achieved).sort((a, b) => b.achievementRate - a.achievementRate);

  return (
    <div style={{ background: C.bg, borderRadius: 16, padding: 24, marginTop: 24 }}>

      {/* ── KPI 카드 5개 ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <KpiCard
          title="총 구매액"
          value={KRW(stats.totalPurchaseAll)}
          sub={`거래 ${stats.rowCount.toLocaleString('ko-KR')}건`}
        />
        <KpiCard
          title="공공구매 실적액"
          value={KRW(stats.totalPurchase)}
          sub="물품 + 용역 + 공사"
        />
        <KpiCard
          title="공공구매 목표액 합산"
          value={KRW(stats.totalTargetSum)}
          sub={`실적 대비 ${((stats.totalActualSum / stats.totalTargetSum) * 100).toFixed(1)}%`}
        />
        <KpiCard
          title="달성 지표"
          value={`${achieved.length} / ${results.length}개`}
          sub={`배점 ${totalScore.toFixed(2)} / 9.5`}
        />
        <KpiCard
          title="공공구매 점수"
          value={`${finalScore.toFixed(2)} / 4.00`}
          accent={fColor}
          sub={finalScore >= 3 ? '우수' : finalScore >= 2 ? '보통' : '미흡'}
        />
      </div>

      {/* ── 중간 섹션: 차트 + 퍼포머 ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>

        {/* 바 차트 */}
        <div style={{ ...S.card, flex: 3 }}>
          <div style={S.sectionTitle}>유형별 목표 대비 달성률</div>
          <div style={{ fontSize: 12, color: C.gray, marginBottom: 16 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, background: C.success, borderRadius: 2, marginRight: 4 }} />달성&nbsp;&nbsp;
            <span style={{ display: 'inline-block', width: 10, height: 10, background: C.primary, borderRadius: 2, marginRight: 4 }} />미달성&nbsp;&nbsp;
            <span style={{ color: C.warning }}>│ 70% 기준선</span>
          </div>
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 32, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis
                type="number"
                domain={[0, 150]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
                tickCount={7}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={90}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine x={100} stroke="#d9d9d9" strokeDasharray="4 4" />
              <ReferenceLine x={70} stroke={C.warning} strokeDasharray="4 4" label={{ value: '70%', position: 'top', fontSize: 11, fill: C.warning }} />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {chartData.map((d) => (
                  <Cell key={d.key} fill={d.achieved ? C.success : C.primary} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 우수 / 개선 목록 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={S.card}>
            <div style={{ ...S.sectionTitle, color: C.success }}>상위 우수 지표</div>
            {achieved.length === 0 && <div style={S.empty}>달성 지표 없음</div>}
            {achieved.map((r) => (
              <div key={r.key} style={S.performerRow}>
                <span style={{ fontSize: 13, color: '#1e293b', flex: 1 }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.success }}>{PCT(r.achievementRate)}</span>
              </div>
            ))}
          </div>

          <div style={S.card}>
            <div style={{ ...S.sectionTitle, color: C.danger }}>개선 필요 지표</div>
            {notAchieved.length === 0 && <div style={S.empty}>모든 지표 달성!</div>}
            {notAchieved.map((r) => (
              <div key={r.key} style={S.performerRow}>
                <span style={{ fontSize: 13, color: '#1e293b', flex: 1 }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.danger }}>{PCT(r.achievementRate)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 상세 테이블 ── */}
      <div style={S.card}>
        <div style={S.sectionTitle}>목표 대비 상세 현황</div>
        <table style={S.table}>
          <thead>
            <tr style={S.thead}>
              <th style={S.th}>구매유형</th>
              <th style={{ ...S.th, textAlign: 'right' }}>목표액</th>
              <th style={{ ...S.th, textAlign: 'right' }}>실적액</th>
              <th style={{ ...S.th, width: 200 }}>달성률</th>
              <th style={{ ...S.th, textAlign: 'right' }}>잔여액</th>
              <th style={{ ...S.th, textAlign: 'center' }}>배점</th>
              <th style={{ ...S.th, textAlign: 'center' }}>획득</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const remainder = Math.max(0, r.targetAmount - r.actual);
              return (
                <tr key={r.key} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={S.td}>
                    <span style={{
                      display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                      background: r.achieved ? C.success : C.border,
                      marginRight: 8, verticalAlign: 'middle',
                    }} />
                    {r.label}
                  </td>
                  <td style={{ ...S.td, textAlign: 'right', color: '#595959' }}>{KRW(r.targetAmount)}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontWeight: 500 }}>{KRW(r.actual)}</td>
                  <td style={{ ...S.td, paddingRight: 12 }}>
                    <MiniBar rate={r.achievementRate} achieved={r.achieved} />
                  </td>
                  <td style={{ ...S.td, textAlign: 'right', color: remainder > 0 ? C.danger : C.success }}>
                    {remainder > 0 ? SIGN(-remainder) : '달성'}
                  </td>
                  <td style={{ ...S.td, textAlign: 'center', color: C.gray }}>{r.points.toFixed(1)}</td>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 99,
                      background: r.achieved ? '#f6ffed' : '#fff1f0',
                      color: r.achieved ? C.success : C.danger,
                    }}>
                      {r.achieved ? `✓ ${r.score.toFixed(1)}` : `✗ 0`}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f5f5f5', fontWeight: 600 }}>
              <td style={S.td}>합계</td>
              <td style={{ ...S.td, textAlign: 'right' }}>{KRW(stats.totalTargetSum)}</td>
              <td style={{ ...S.td, textAlign: 'right' }}>{KRW(stats.totalActualSum)}</td>
              <td style={S.td} />
              <td style={S.td} />
              <td style={{ ...S.td, textAlign: 'center' }}>9.5</td>
              <td style={{ ...S.td, textAlign: 'center', color: fColor }}>{totalScore.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  );
}

// ── 스타일 상수 ───────────────────────────────────────────────────────────────

const S = {
  card: {
    background: C.card,
    borderRadius: 12,
    padding: '20px 24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: 16,
  },
  performerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '7px 0',
    borderBottom: `1px solid ${C.border}`,
  },
  empty: {
    fontSize: 13,
    color: C.gray,
    textAlign: 'center',
    padding: '12px 0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  thead: {
    borderBottom: `2px solid ${C.border}`,
  },
  th: {
    padding: '10px 12px',
    fontWeight: 600,
    color: '#595959',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '10px 12px',
    borderBottom: `1px solid ${C.border}`,
    whiteSpace: 'nowrap',
  },
};
