import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = process.env.REACT_APP_API_URL || '';

const KRW = (n) => n == null ? '-' : Math.round(n).toLocaleString('ko-KR') + '원';

const FORECAST_COLOR = {
  shortage:   '#F04452',
  underspend: '#3182F6',
  onTrack:    '#00B493',
};

function buildHeadline(forecast) {
  if (forecast.type === 'shortage')   return `집행 추세 유지 시 연말 기준 ${KRW(forecast.amount)} 부족 예상됩니다.`;
  if (forecast.type === 'underspend') return `집행 추세 유지 시 연말 기준 ${KRW(forecast.amount)} 불용 예상됩니다.`;
  return '예산 계획대로 순조롭게 집행 중입니다.';
}

function buildMonthlySub(thisMonthActual, monthlyRecommended) {
  const diff = thisMonthActual - monthlyRecommended;
  const tolerance = monthlyRecommended * 0.05;
  if (Math.abs(diff) <= tolerance) return '월 권장 집행액과 비슷한 수준';
  if (diff > 0) return `월 권장 집행액 대비 ${KRW(diff)} 초과`;
  return `월 권장 집행액 대비 ${KRW(Math.abs(diff))} 미달`;
}

function formatDateDot(dateStr) {
  return dateStr.replace(/-/g, '.');
}

function rateBarColor(rate) {
  if (rate >= 90) return '#F04452';
  if (rate >= 70) return '#FF6B00';
  return '#00B493';
}

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#8B95A1' }}>{KRW(v)}</div>
    </div>
  );
}

// ── 지표 카드 ─────────────────────────────────────────────────────────────────
function TrendCard({ item }) {
  const chartData = item.monthlyActual.map((v, i) => ({ month: `${i + 1}월`, value: v }));
  const color = FORECAST_COLOR[item.forecast.type] ?? '#3182F6';

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>{item.label}</div>

      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F4F6" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8B95A1' }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={v => v >= 10000 ? `${Math.round(v / 10000)}만` : v}
              tick={{ fontSize: 10, fill: '#8B95A1' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<TrendTooltip />} cursor={{ fill: '#F9FAFB' }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={28} fill="#3182F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ ...S.headline, color }}>{buildHeadline(item.forecast)}</div>
      <div style={S.footnote}>* 집행 추세는 일평균 집행액을 기준으로 산정</div>

      <div style={S.sub}>{buildMonthlySub(item.thisMonthActual, item.monthlyRecommended)}</div>
      <div style={S.footnote}>* 월 권장 집행액은 연간 배정액을 12개월로 균등 배분하여 산정</div>
    </div>
  );
}

// ── 스냅샷 카드 (국내여비 / 국외업무여비) ────────────────────────────────────
function SnapshotCard({ item }) {
  if (item.noSnapshotData) {
    return (
      <div style={S.card}>
        <div style={S.cardTitle}>{item.label}</div>
        <div style={S.noSnapshotMsg}>예산현황 스냅샷 데이터가 아직 없습니다</div>
      </div>
    );
  }

  const remaining = item.allocatedTotal - item.spentSoFar;
  const rate = item.allocatedTotal > 0 ? (item.spentSoFar / item.allocatedTotal) * 100 : 0;
  const barColor = rateBarColor(rate);
  const headlineColor = item.forecast ? (FORECAST_COLOR[item.forecast.type] ?? '#3182F6') : '#8B95A1';

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>{item.label}</div>
      <div style={S.snapshotDate}>{formatDateDot(item.기준일)} 기준 스냅샷 데이터</div>

      <div style={S.snapshotStats}>
        <div style={S.statCol}>
          <div style={S.statLabel}>배정액</div>
          <div style={S.statValue}>{KRW(item.allocatedTotal)}</div>
        </div>
        <div style={S.statCol}>
          <div style={S.statLabel}>집행액</div>
          <div style={S.statValue}>{KRW(item.spentSoFar)}</div>
        </div>
        <div style={S.statCol}>
          <div style={S.statLabel}>잔액</div>
          <div style={S.statValue}>{KRW(remaining)}</div>
        </div>
      </div>

      <div style={S.rateBarRow}>
        <div style={S.rateBarTrack}>
          <div style={{ ...S.rateBarFill, width: `${Math.min(Math.max(rate, 0), 100)}%`, background: barColor }} />
        </div>
        <span style={{ ...S.rateBarPct, color: barColor }}>{rate.toFixed(1)}%</span>
      </div>

      {item.forecast && (
        <>
          <div style={{ ...S.headline, color: headlineColor }}>{buildHeadline(item.forecast)}</div>
          <div style={S.footnote}>* 집행 추세는 일평균 집행액을 기준으로 산정</div>
        </>
      )}
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function BudgetExecutionTrendPage({ deptId, year }) {
  const [items,   setItems]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!deptId || !year) return;
    setLoading(true);
    setError('');

    fetch(`${API_BASE}/api/budget/execution-trend?deptId=${deptId}&year=${year}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => {
        if (!res.ok) throw new Error('요청 실패');
        return res.json();
      })
      .then(setItems)
      .catch(() => setError('집행추이 데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [deptId, year]);

  if (loading) return <div style={S.centerMsg}>불러오는 중…</div>;
  if (error)   return <div style={{ ...S.centerMsg, color: '#F04452' }}>{error}</div>;
  if (!items?.length) return <div style={S.centerMsg}>집행추이 데이터가 없습니다.</div>;

  const chartItems    = items.filter(it => Array.isArray(it.monthlyActual));
  const snapshotItems = items.filter(it => !Array.isArray(it.monthlyActual));

  return (
    <div style={S.page}>
      <div style={S.pageTitle}>집행 추이 분석</div>

      <div style={S.row}>
        {chartItems.map(item => <TrendCard key={item.key} item={item} />)}
      </div>

      {snapshotItems.length > 0 && (
        <div style={{ ...S.row, marginTop: 14 }}>
          {snapshotItems.map(item => <SnapshotCard key={item.key} item={item} />)}
        </div>
      )}
    </div>
  );
}

// ── 스타일 ───────────────────────────────────────────────────────────────────
const S = {
  page: { fontFamily: "-apple-system, 'Pretendard', 'Apple SD Gothic Neo', sans-serif" },

  centerMsg: { padding: '80px 0', textAlign: 'center', color: '#8B95A1', fontSize: 14 },

  pageTitle: { fontSize: 18, fontWeight: 800, color: '#191F28', letterSpacing: '-0.4px', marginBottom: 14 },
  row:       { display: 'flex', gap: 14, alignItems: 'stretch' },

  card:      { flex: 1, background: '#FFFFFF', borderRadius: 16, padding: '20px 20px 18px', border: '1px solid #F2F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#191F28', letterSpacing: '-0.2px', marginBottom: 12 },

  headline: { fontSize: 14, fontWeight: 700, marginTop: 14, letterSpacing: '-0.2px' },
  sub:      { fontSize: 12, color: '#8B95A1', marginTop: 10, fontWeight: 500 },
  footnote: { fontSize: 11, color: '#B0B8C1', marginTop: 4 },

  snapshotDate:  { fontSize: 12, color: '#8B95A1', fontWeight: 500, marginBottom: 14 },
  snapshotStats: { display: 'flex', gap: 16, marginBottom: 14 },
  statCol:       { flex: 1 },
  statLabel:     { fontSize: 12, color: '#8B95A1', fontWeight: 500, marginBottom: 4 },
  statValue:     { fontSize: 15, color: '#191F28', fontWeight: 700, letterSpacing: '-0.2px' },

  rateBarRow:   { display: 'flex', alignItems: 'center', gap: 8 },
  rateBarTrack: { flex: 1, height: 6, background: '#F2F4F6', borderRadius: 99, overflow: 'hidden' },
  rateBarFill:  { height: '100%', borderRadius: 99, transition: 'width 0.3s ease' },
  rateBarPct:   { fontSize: 12, fontWeight: 700, flexShrink: 0, width: 44, textAlign: 'right' },

  noSnapshotMsg: { padding: '40px 0', textAlign: 'center', color: '#8B95A1', fontSize: 13 },
};
