import { useState } from 'react';

const KRW = (n) => (Number(n) ? Math.round(Number(n)).toLocaleString('ko-KR') + '원' : '-');

const TABLE_COLS = [
  { key: '집행구분',       label: '집행구분',  align: 'center' },
  { key: '발의일자',       label: '발의일자',  align: 'left'  },
  { key: '구매구분',       label: '구매구분',  align: 'left'  },
  { key: '부서명',         label: '부서명',    align: 'left'  },
  { key: '적요',           label: '적요',      align: 'left', maxWidth: 180 },
  { key: '수령인사업자명', label: '거래처',    align: 'left', maxWidth: 160 },
  { key: '발주품목명',     label: '품목명',    align: 'left', maxWidth: 160 },
  { key: '물품금액',       label: '금액',      align: 'right' },
];

const FLAGS = [
  { key: '중소기업제품(연동)',       label: '중소기업'   },
  { key: '여성기업제품(연동)',       label: '여성기업'   },
  { key: '사회적기업',               label: '사회적기업' },
  { key: '사회적협동조합제품여부',   label: '협동조합'   },
  { key: '장애인구매(연동)',         label: '장애인기업' },
  { key: '장애인표준사업장여부',     label: '표준사업장' },
  { key: '중증장애인제품',           label: '중증장애인' },
  { key: '창업기업제품',             label: '창업기업'   },
  { key: '친환경제품',               label: '녹색제품'   },
  { key: '자활용사촌제품',           label: '자활용사촌' },
  { key: '시범구매여부',             label: '시범구매'   },
  { key: '기술개발제품대상품목조회', label: '기술개발'   },
  { key: '신제품인증(NEP)여부',      label: 'NEP'        },
  { key: '신제품인증(NEP) 대상품목', label: 'NEP대상품목'},
];

const CATEGORIES = ['물품', '용역', '공사', '온누리상품권'];

function emptyRow() {
  const row = { '집행구분': 'Y', '발의일자': '', '구매구분': '물품', '부서명': '', '적요': '',
    '수령인사업자명': '', '발주품목명': '', '예산명': '', '물품금액': '', '채주지급금액': '' };
  FLAGS.forEach(f => { row[f.key] = ''; });
  return row;
}

// ── 행 추가 폼 ───────────────────────────────────────────────────────────────
function AddRowForm({ onAdd, onCancel }) {
  const [form, setForm] = useState(emptyRow());

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const toggleFlag = (key) => set(key, form[key] === 'Y' ? '' : 'Y');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form['물품금액']) return alert('금액을 입력해주세요.');
    onAdd({ ...form, '물품금액': Number(form['물품금액']) || 0 });
  };

  return (
    <div style={F.card}>
      <div style={F.title}>새 행 입력</div>

      <form onSubmit={handleSubmit}>
        {/* 기본 정보 */}
        <div style={F.grid}>
          {[
            { key: '발의일자',       label: '발의일자',  type: 'date'   },
            { key: '부서명',         label: '부서명',    type: 'text'   },
            { key: '수령인사업자명', label: '거래처',    type: 'text'   },
            { key: '발주품목명',     label: '품목명',    type: 'text'   },
            { key: '적요',           label: '적요',      type: 'text'   },
            { key: '물품금액',       label: '금액 (원)', type: 'number' },
          ].map(({ key, label, type }) => (
            <div key={key} style={F.field}>
              <label style={F.label}>{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                style={F.input}
                placeholder={label}
              />
            </div>
          ))}

          {/* 구매구분 select */}
          <div style={F.field}>
            <label style={F.label}>구매구분</label>
            <select value={form['구매구분']} onChange={e => set('구매구분', e.target.value)} style={F.input}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* 집행구분 select */}
          <div style={F.field}>
            <label style={F.label}>집행구분</label>
            <select
              value={form['집행구분']}
              onChange={e => set('집행구분', e.target.value)}
              style={{ ...F.input, color: form['집행구분'] === 'N' ? '#ff4d4f' : '#1e293b', fontWeight: 600 }}
            >
              <option value="Y">Y — 집행</option>
              <option value="N">N — 미집행</option>
            </select>
          </div>
        </div>

        {/* 구매 유형 플래그 */}
        <div style={F.flagTitle}>해당 구매 유형 선택</div>
        <div style={F.flagGrid}>
          {FLAGS.map(({ key, label }) => (
            <label key={key} style={F.flagItem}>
              <input
                type="checkbox"
                checked={form[key] === 'Y'}
                onChange={() => toggleFlag(key)}
                style={{ marginRight: 6 }}
              />
              {label}
            </label>
          ))}
        </div>

        {/* 버튼 */}
        <div style={F.actions}>
          <button type="button" onClick={onCancel} style={F.cancelBtn}>취소</button>
          <button type="submit" style={F.saveBtn}>행 추가</button>
        </div>
      </form>
    </div>
  );
}

// ── 테이블 행 ────────────────────────────────────────────────────────────────
function TableRow({ row, index, onDelete }) {
  const isN      = row['집행구분'] === 'N';
  const isManual = !!row.__manual;
  const rowBg    = isManual && isN ? '#fff1f0'
                 : isManual        ? '#fffbe6'
                 : isN             ? '#fff2f0'
                 : index % 2 === 0 ? '#fff'
                 :                   '#fafafa';

  return (
    <tr style={{ background: rowBg, opacity: isN ? 0.75 : 1 }}>
      <td style={{ ...P.td, textAlign: 'center', color: '#aaa' }}>{index + 1}</td>
      {TABLE_COLS.map(c => (
        <td
          key={c.key}
          style={{
            ...P.td,
            textAlign: c.align,
            maxWidth: c.maxWidth,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontWeight: c.key === '물품금액' ? 600 : 400,
          }}
          title={String(row[c.key] ?? '')}
        >
          {c.key === '집행구분' ? (
            <span style={{
              display: 'inline-block', padding: '2px 10px', borderRadius: 99,
              fontSize: 12, fontWeight: 700,
              background: isN ? '#fff1f0' : '#f6ffed',
              color:      isN ? '#ff4d4f' : '#52c41a',
              border:     `1px solid ${isN ? '#ffa39e' : '#b7eb8f'}`,
            }}>
              {row[c.key] || 'Y'}
            </span>
          ) : c.key === '물품금액' ? KRW(row[c.key])
            : (row[c.key] || '-')}
        </td>
      ))}
      <td style={{ ...P.td, textAlign: 'center' }}>
        {isManual ? (
          <button onClick={() => onDelete(index)} style={P.deleteBtn}>삭제</button>
        ) : (
          <span style={{ fontSize: 11, color: '#aaa' }}>엑셀</span>
        )}
      </td>
    </tr>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function DetailsPage({ rows, onRowsChange }) {
  const [showForm, setShowForm] = useState(false);

  const total    = rows.reduce((s, r) => s + (Number(r['물품금액']) || 0), 0);
  const manualCount = rows.filter(r => r.__manual).length;

  const handleAdd = (newRow) => {
    onRowsChange([...rows, { ...newRow, __manual: true }]);
    setShowForm(false);
  };

  const handleDelete = (idx) => {
    if (!rows[idx].__manual) return;
    onRowsChange(rows.filter((_, i) => i !== idx));
  };

  return (
    <div>
      {/* 헤더 */}
      <div style={P.header}>
        <div>
          <div style={P.pageTitle}>지출 내역</div>
          <div style={P.pageSub}>
            총 {rows.length.toLocaleString()}건 · {KRW(total)}
            {manualCount > 0 && <span style={P.manualBadge}>직접 입력 {manualCount}건 포함</span>}
          </div>
        </div>
        <button style={P.addBtn} onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ 닫기' : '+ 행 추가'}
        </button>
      </div>

      {/* 행 추가 폼 */}
      {showForm && (
        <AddRowForm
          onAdd={handleAdd}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* 테이블 */}
      <div style={P.tableCard}>
        <div style={{ overflowX: 'auto' }}>
          <table style={P.table}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={{ ...P.th, width: 40, textAlign: 'center' }}>No.</th>
                {TABLE_COLS.map(c => (
                  <th key={c.key} style={{ ...P.th, textAlign: c.align }}>{c.label}</th>
                ))}
                <th style={{ ...P.th, textAlign: 'center', width: 60 }}>구분</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={TABLE_COLS.length + 2} style={{ ...P.td, textAlign: 'center', color: '#aaa', padding: '40px 0' }}>
                    업로드된 데이터가 없습니다.
                  </td>
                </tr>
              )}
              {rows.map((row, i) => (
                <TableRow key={i} row={row} index={i} onDelete={handleDelete} />
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f5f5f5', fontWeight: 700 }}>
                <td style={{ ...P.td, textAlign: 'center' }} colSpan={TABLE_COLS.length}>합계</td>
                <td style={{ ...P.td, textAlign: 'right', color: '#1677ff' }}>{KRW(total)}</td>
                <td style={P.td} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── 스타일 ───────────────────────────────────────────────────────────────────
const P = {
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  pageTitle:   { fontSize: 20, fontWeight: 700, color: '#1e293b' },
  pageSub:     { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  manualBadge: { marginLeft: 10, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 99, fontSize: 12 },
  addBtn:      { padding: '9px 20px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  tableCard:   { background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:          { padding: '11px 12px', fontWeight: 600, color: '#64748b', borderBottom: '2px solid #f0f0f0', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: '#fafafa' },
  td:          { padding: '9px 12px', borderBottom: '1px solid #f5f5f5', whiteSpace: 'nowrap', color: '#1e293b' },
  deleteBtn:   { padding: '3px 10px', background: '#fff1f0', color: '#ff4d4f', border: '1px solid #ffa39e', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
};

const F = {
  card:      { background: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #e6f4ff' },
  title:     { fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 16 },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px 16px', marginBottom: 16 },
  field:     { display: 'flex', flexDirection: 'column', gap: 4 },
  label:     { fontSize: 12, fontWeight: 500, color: '#64748b' },
  input:     { padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fafafa' },
  flagTitle: { fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 10 },
  flagGrid:  { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px 4px', marginBottom: 16 },
  flagItem:  { fontSize: 13, color: '#334155', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '4px 0' },
  actions:   { display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 },
  cancelBtn: { padding: '8px 20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#64748b' },
  saveBtn:   { padding: '8px 24px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
