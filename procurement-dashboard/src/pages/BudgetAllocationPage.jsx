import { useEffect, useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '';

const KRW = (n) => n == null ? '-' : Math.round(n).toLocaleString('ko-KR') + '원';
const PCT = (n) => n == null ? '-' : Number(n).toFixed(1) + '%';

function rateColor(rate) {
  if (rate >= 90) return '#00B493';
  if (rate >= 70) return '#3182F6';
  if (rate >= 50) return '#FF6B00';
  return '#F04452';
}

// ── KPI 카드 ─────────────────────────────────────────────────────────────────
function KpiCard({ title, value, unit, valueColor }) {
  return (
    <div style={S.kpiCard}>
      <div style={S.kpiTitle}>{title}</div>
      <div style={S.kpiValueRow}>
        <span style={{ ...S.kpiValue, color: valueColor ?? '#191F28' }}>{value}</span>
        {unit && <span style={S.kpiUnit}>{unit}</span>}
      </div>
    </div>
  );
}

// ── 진행바 ───────────────────────────────────────────────────────────────────
function RateBar({ rate }) {
  const color = rateColor(rate);
  const width = Math.min(Math.max(rate ?? 0, 0), 100);
  return (
    <div style={S.barTrack}>
      <div style={{ ...S.barFill, width: `${width}%`, background: color }} />
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function BudgetAllocationPage({ deptId }) {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [collapsed, setCollapsed] = useState(() => new Set());

  useEffect(() => {
    if (!deptId) return;
    setLoading(true);
    setError('');

    fetch(`${API_BASE}/api/budget/allocation?deptId=${deptId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => {
        if (!res.ok) throw new Error('요청 실패');
        return res.json();
      })
      .then(json => setData(json))
      .catch(() => setError('예산 배정 현황을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [deptId]);

  const toggleGroup = (절명) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(절명) ? next.delete(절명) : next.add(절명);
      return next;
    });
  };

  if (loading) return <div style={S.centerMsg}>불러오는 중…</div>;
  if (error)   return <div style={{ ...S.centerMsg, color: '#F04452' }}>{error}</div>;
  if (!data || !data.groups?.length) return <div style={S.centerMsg}>배정 데이터가 없습니다.</div>;

  const { groups, total } = data;
  const totalRate = total.배정액합계 > 0 ? (total.집행액합계 / total.배정액합계) * 100 : 0;

  return (
    <div style={S.page}>

      {/* KPI 카드 3개 */}
      <div style={S.kpiRow}>
        <KpiCard title="총 배정액" value={KRW(total.배정액합계)} />
        <KpiCard title="총 집행액" value={KRW(total.집행액합계)} />
        <KpiCard title="전체 집행률" value={PCT(totalRate)} valueColor={rateColor(totalRate)} />
      </div>

      {/* 메인 테이블 */}
      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>예산과목</th>
              <th style={{ ...S.th, textAlign: 'center' }}>회계연도</th>
              <th style={{ ...S.th, textAlign: 'right' }}>배정액</th>
              <th style={{ ...S.th, textAlign: 'right' }}>집행액</th>
              <th style={{ ...S.th, textAlign: 'right' }}>잔액</th>
              <th style={{ ...S.th, textAlign: 'right' }}>집행률</th>
              <th style={{ ...S.th, width: 140 }}>진행바</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => {
              const isOpen = !collapsed.has(group.절명);
              return (
                <BudgetGroupRows
                  key={group.절명}
                  group={group}
                  isOpen={isOpen}
                  onToggle={() => toggleGroup(group.절명)}
                />
              );
            })}
          </tbody>
          <tfoot>
            <tr style={S.totalRow}>
              <td style={{ ...S.td, fontWeight: 700 }} colSpan={2}>합계</td>
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{KRW(total.배정액합계)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{KRW(total.집행액합계)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{KRW(total.잔액합계)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: rateColor(totalRate) }}>{PCT(totalRate)}</td>
              <td style={S.td}><RateBar rate={totalRate} /></td>
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  );
}

// ── 절명 그룹 (대분류 + 소분류 + 소계) ────────────────────────────────────────
function BudgetGroupRows({ group, isOpen, onToggle }) {
  const { 절명, items, subtotal } = group;

  return (
    <>
      <tr style={S.groupRow} onClick={onToggle}>
        <td style={{ ...S.td, ...S.groupCell }} colSpan={7}>
          <span style={S.groupArrow}>{isOpen ? '▼' : '▶'}</span>
          {절명}
          <span style={S.groupCount}>({items.length}건)</span>
        </td>
      </tr>

      {isOpen && items.map((item, i) => (
        <tr key={i} style={S.subRow}>
          <td style={{ ...S.td, ...S.subCell }}>{item.예산과목명}</td>
          <td style={{ ...S.td, textAlign: 'center' }}>{item.회계연도}</td>
          <td style={{ ...S.td, textAlign: 'right' }}>{KRW(item.배정액)}</td>
          <td style={{ ...S.td, textAlign: 'right' }}>{KRW(item.집행액)}</td>
          <td style={{ ...S.td, textAlign: 'right' }}>{KRW(item.잔액)}</td>
          <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: rateColor(item.집행률) }}>
            {PCT(item.집행률)}
          </td>
          <td style={S.td}><RateBar rate={item.집행률} /></td>
        </tr>
      ))}

      {isOpen && (
        <tr style={S.subtotalRow}>
          <td style={{ ...S.td, ...S.subtotalCell }}>소계</td>
          <td style={S.td} />
          <td style={{ ...S.td, ...S.subtotalCell, textAlign: 'right' }}>{KRW(subtotal.배정액합계)}</td>
          <td style={{ ...S.td, ...S.subtotalCell, textAlign: 'right' }}>{KRW(subtotal.집행액합계)}</td>
          <td style={{ ...S.td, ...S.subtotalCell, textAlign: 'right' }}>{KRW(subtotal.잔액합계)}</td>
          <td style={{ ...S.td, ...S.subtotalCell, textAlign: 'right', color: rateColor(subtotal.집행률평균) }}>
            {PCT(subtotal.집행률평균)}
          </td>
          <td style={S.td}><RateBar rate={subtotal.집행률평균} /></td>
        </tr>
      )}
    </>
  );
}

// ── 스타일 ───────────────────────────────────────────────────────────────────
const S = {
  page: { fontFamily: "-apple-system, 'Pretendard', 'Apple SD Gothic Neo', sans-serif" },

  centerMsg: { padding: '80px 0', textAlign: 'center', color: '#8B95A1', fontSize: 14 },

  kpiRow:      { display: 'flex', gap: 14, marginBottom: 18 },
  kpiCard:     { flex: 1, background: '#FFFFFF', borderRadius: 16, padding: '20px 20px 18px', border: '1px solid #F2F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minWidth: 0 },
  kpiTitle:    { fontSize: 12, color: '#8B95A1', marginBottom: 8, fontWeight: 500 },
  kpiValueRow: { display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' },
  kpiValue:    { fontSize: 22, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.5px' },
  kpiUnit:     { fontSize: 13, color: '#8B95A1' },

  card: { background: '#FFFFFF', borderRadius: 16, border: '1px solid #F2F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' },

  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: '12px 16px', fontWeight: 600, color: '#8B95A1', fontSize: 12,
    borderBottom: '1px solid #F2F4F6', textAlign: 'left', background: '#F9FAFB', whiteSpace: 'nowrap',
  },
  td: { padding: '10px 16px', borderBottom: '1px solid #F2F4F6', color: '#191F28', whiteSpace: 'nowrap' },

  groupRow:    { cursor: 'pointer', background: '#EBF3FE' },
  groupCell:   { fontWeight: 700, color: '#191F28' },
  groupArrow:  { display: 'inline-block', width: 16, fontSize: 10, color: '#3182F6' },
  groupCount:  { marginLeft: 8, fontSize: 12, fontWeight: 500, color: '#8B95A1' },

  subRow:  { background: '#FFFFFF' },
  subCell: { paddingLeft: 36, fontWeight: 400, color: '#191F28', whiteSpace: 'normal' },

  subtotalRow:   { background: '#F9FAFB' },
  subtotalCell:  { fontStyle: 'italic', fontWeight: 600, color: '#4E5968', paddingLeft: 36 },

  totalRow: { background: '#F0F4F8' },

  barTrack: { height: 6, background: '#F2F4F6', borderRadius: 99, overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 99, transition: 'width 0.3s ease' },
};
