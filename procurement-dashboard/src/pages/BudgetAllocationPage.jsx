import { useEffect, useState } from 'react';
import AmountText from '../components/AmountText';

const API_BASE = process.env.REACT_APP_API_URL || '';

const PCT = (n) => n == null ? '-' : Number(n).toFixed(1) + '%';

function rateColor(rate) {
  if (rate >= 90) return '#00B493';
  if (rate >= 70) return '#3182F6';
  if (rate >= 50) return '#FF6B00';
  return '#F04452';
}

// ── 예산 배정 요약 카드 ──────────────────────────────────────────────────────
// 집행률 색상 (아래 상세 테이블의 rateColor와 반대 의미: 집행률이 높을수록 잔여예산이
// 빠듯하다는 경고 신호이므로 높을수록 빨강)
function budgetRateColor(rate) {
  if (rate >= 90) return '#F04452';
  if (rate >= 70) return '#FF6B00';
  return '#00B493';
}

// 개별 항목 카드: 제목 → 잔액(강조) → 집행률 바 → 배정액 보조텍스트
// (showBar=false면 바/보조텍스트 없이 금액만 표시 — 연간 배정액 카드용)
function ItemCard({ title, allocated, executed, showBar = true, style, valueStyle, subStyle }) {
  const remaining = allocated - executed;
  const rate = allocated > 0 ? (executed / allocated) * 100 : 0;
  const color = budgetRateColor(rate);

  return (
    <div style={{ ...S.itemCard, ...style }}>
      <div style={S.kpiTitle}>{title}</div>
      <div style={{ ...S.itemValue, ...valueStyle }}><AmountText value={remaining} scale={1} /></div>
      {showBar && (
        <>
          <div style={S.itemBarRow}>
            <div style={S.itemBarTrack}>
              <div style={{ ...S.itemBarFill, width: `${Math.min(Math.max(rate, 0), 100)}%`, background: color }} />
            </div>
            <span style={{ ...S.itemBarPct, color }}>{PCT(rate)}</span>
          </div>
          <div style={{ ...S.itemSub, ...subStyle }}>배정 <AmountText value={allocated} scale={1} /></div>
        </>
      )}
    </div>
  );
}

// 그룹 카드: 상단에 그룹 총합, 하단에 하위 항목 2개
function GroupCard({ title, totalAllocated, items }) {
  return (
    <div style={{ ...S.itemCard, ...S.groupCard }}>
      <div style={S.kpiTitle}>{title}</div>
      <div style={S.itemValue}><AmountText value={totalAllocated} scale={1} /></div>
      <div style={S.groupSubRow}>
        {items.map(it => (
          <ItemCard key={it.title} {...it} style={S.groupSubItem} subStyle={{ fontSize: 12 }} />
        ))}
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
export default function BudgetAllocationPage({ deptId, year }) {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [collapsed, setCollapsed] = useState(() => new Set());

  useEffect(() => {
    if (!deptId || !year) return;
    setLoading(true);
    setError('');

    fetch(`${API_BASE}/api/budget/allocation?deptId=${deptId}&year=${year}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => {
        if (!res.ok) throw new Error('요청 실패');
        return res.json();
      })
      .then(json => setData(json))
      .catch(() => setError('예산 배정 현황을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [deptId, year]);

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

  // ── 예산 배정 요약 카드 계산 ─────────────────────────────────────────────────
  const allItems    = groups.flatMap(g => g.items);
  const annualTotal = allItems.reduce((s, r) => s + (r.년예산 || 0), 0);

  // 예산과목명 조건에 맞는 항목들의 배정액/집행액 합
  const sumFields = (pred) => {
    const matched = allItems.filter(r => pred(r.예산과목명 ?? ''));
    return {
      allocated: matched.reduce((s, r) => s + (r.배정액 || 0), 0),
      executed:  matched.reduce((s, r) => s + (r.집행액 || 0), 0),
    };
  };

  // 활동비: 업무추진비 / 여비
  const 업무추진비        = sumFields(n => n.includes('업무추진비'));
  const 여비              = sumFields(n => n.includes('여비'));
  const 활동비총합배정액 = 업무추진비.allocated + 여비.allocated;

  // 운영비: 특근매식비 / 기타운영비(부운영비·회의비·기타운영비 통합, OR 조건)
  const 특근매식비        = sumFields(n => n.includes('특근매식비'));
  const 기타운영비        = sumFields(n => n.includes('부운영비') || n.includes('회의비') || n.includes('기타운영비'));
  const 운영비총합배정액 = 특근매식비.allocated + 기타운영비.allocated;

  // 일반수용비 / 일반용역비 / 일반공사비
  const 일반수용비 = sumFields(n => n.includes('수용'));
  const 일반용역비 = sumFields(n => n.includes('일반용역'));
  const 일반공사비 = sumFields(n => n.includes('공사'));

  return (
    <div style={S.page}>

      {/* 예산 배정 요약 카드 */}
      <div style={S.kpiRow}>
        <ItemCard
          title="연간 배정액"
          allocated={annualTotal}
          executed={0}
          showBar={false}
          style={S.standaloneCard}
          valueStyle={{ fontSize: 15 }}
        />

        <GroupCard
          title="활동비 배정액"
          totalAllocated={활동비총합배정액}
          items={[
            { title: '업무추진비', ...업무추진비 },
            { title: '여비',       ...여비 },
          ]}
        />

        <GroupCard
          title="운영비 배정액"
          totalAllocated={운영비총합배정액}
          items={[
            { title: '특근매식비', ...특근매식비 },
            { title: '기타운영비', ...기타운영비 },
          ]}
        />

        <ItemCard title="일반수용비" {...일반수용비} style={S.standaloneCard} />
        <ItemCard title="일반용역비" {...일반용역비} style={S.standaloneCard} />
        <ItemCard title="공사비" {...일반공사비} style={S.standaloneCard} />
      </div>

      {/* 메인 테이블 */}
      <div style={S.card}>
        <div style={S.tableScroll}>
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
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}><AmountText value={total.배정액합계} scale={1} /></td>
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}><AmountText value={total.집행액합계} scale={1} /></td>
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}><AmountText value={total.잔액합계} scale={1} /></td>
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: rateColor(totalRate) }}>{PCT(totalRate)}</td>
              <td style={S.td}><RateBar rate={totalRate} /></td>
            </tr>
          </tfoot>
        </table>
        </div>
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
          <td style={{ ...S.td, textAlign: 'right' }}><AmountText value={item.배정액} scale={1} /></td>
          <td style={{ ...S.td, textAlign: 'right' }}><AmountText value={item.집행액} scale={1} /></td>
          <td style={{ ...S.td, textAlign: 'right' }}><AmountText value={item.잔액} scale={1} /></td>
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
          <td style={{ ...S.td, ...S.subtotalCell, textAlign: 'right' }}><AmountText value={subtotal.배정액합계} scale={1} /></td>
          <td style={{ ...S.td, ...S.subtotalCell, textAlign: 'right' }}><AmountText value={subtotal.집행액합계} scale={1} /></td>
          <td style={{ ...S.td, ...S.subtotalCell, textAlign: 'right' }}><AmountText value={subtotal.잔액합계} scale={1} /></td>
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

  kpiRow:      { display: 'flex', gap: 14, marginBottom: 18, alignItems: 'stretch' },
  kpiTitle:    { fontSize: 15, color: '#8B95A1', marginBottom: 8, fontWeight: 600 },

  itemCard:       { background: '#FFFFFF', borderRadius: 16, padding: '18px 18px 16px', border: '1px solid #F2F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minWidth: 0, display: 'flex', flexDirection: 'column' },
  standaloneCard: { flex: 1 },
  itemValue:      { fontSize: 20, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.4px', color: '#191F28' },
  itemBarRow:     { display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 },
  itemBarTrack:   { flex: 1, height: 5, background: '#F2F4F6', borderRadius: 99, overflow: 'hidden' },
  itemBarFill:    { height: '100%', borderRadius: 99, transition: 'width 0.3s ease' },
  itemBarPct:     { fontSize: 11, fontWeight: 700, flexShrink: 0, width: 36, textAlign: 'right' },
  itemSub:        { fontSize: 14, color: '#8B95A1', marginTop: 6, fontWeight: 500 },

  groupCard:     { flex: 2.2 },
  groupSubRow:   { display: 'flex', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid #F2F4F6' },
  groupSubItem:  { flex: 1, background: '#F9FAFB', border: '1px solid #F2F4F6', borderRadius: 12, padding: '12px 14px', boxShadow: 'none' },

  card: { background: '#FFFFFF', borderRadius: 16, border: '1px solid #F2F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' },

  tableScroll: { overflowY: 'auto', overflowX: 'auto', maxHeight: 640 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: '12px 16px', fontWeight: 600, color: '#8B95A1', fontSize: 12,
    borderBottom: '1px solid #F2F4F6', textAlign: 'left', background: '#F9FAFB', whiteSpace: 'nowrap',
    position: 'sticky', top: 0, zIndex: 1,
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
