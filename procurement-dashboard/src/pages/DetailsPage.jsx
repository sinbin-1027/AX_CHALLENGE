import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:4001';

const KRW = (n) => (Number(n) ? Math.round(Number(n)).toLocaleString('ko-KR') + '원' : '-');

const fmtDate = (v) => {
  if (!v) return '-';
  const n = Number(v);
  if (!n) return String(v);
  const d = new Date(Math.round((n - 25569) * 86400 * 1000));
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
};

const TABLE_COLS = [
  { key: '집행구분',       label: '집행구분',  align: 'center' },
  { key: '결의번호',       label: '결의번호',  align: 'left'  },
  { key: '발의일자',       label: '발의일자',  align: 'left', fmt: fmtDate },
  { key: '구매구분',       label: '구매구분',  align: 'left'  },
  { key: '부서명',         label: '부서명',    align: 'left'  },
  { key: '적요',           label: '적요',      align: 'left', maxWidth: 200 },
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
  const row = {
    '집행구분': 'Y', '발의일자': '', '구매구분': '물품', '부서명': '', '적요': '',
    '수령인사업자명': '', '발주품목명': '', '물품금액': '',
  };
  FLAGS.forEach(f => { row[f.key] = ''; });
  return row;
}

// 폼 행 → manual API 바디 변환
function formToManualBody(row) {
  return {
    품목명:                      row['발주품목명']                || row['적요'] || '',
    구매구분:                    row['구매구분']                  || '물품',
    금액:                        Number(row['물품금액'])          || 0,
    중소기업제품:                row['중소기업제품(연동)']        || 'N',
    여성기업제품:                row['여성기업제품(연동)']        || 'N',
    사회적기업:                  row['사회적기업']                || 'N',
    사회적협동조합제품여부:      row['사회적협동조합제품여부']    || 'N',
    장애인구매:                  row['장애인구매(연동)']          || 'N',
    장애인표준사업장여부:        row['장애인표준사업장여부']      || 'N',
    중증장애인제품:              row['중증장애인제품']            || 'N',
    창업기업제품:                row['창업기업제품']              || 'N',
    친환경제품:                  row['친환경제품']                || 'N',
    자활용사촌제품:              row['자활용사촌제품']            || 'N',
    시범구매여부:                row['시범구매여부']              || 'N',
    기술개발제품대상품목조회:    row['기술개발제품대상품목조회'] || 'N',
    신제품인증NEP여부:           row['신제품인증(NEP)여부']       || 'N',
    신제품인증NEP대상품목:       row['신제품인증(NEP) 대상품목'] || 'N',
    혁신제품여부:                row['혁신제품여부']              || 'N',
    집행구분:                    row['집행구분']                  || 'Y',
  };
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
      <div style={F.title}>새 행 입력 (저장 버튼 클릭 시 DB에 저장됩니다)</div>
      <form onSubmit={handleSubmit}>
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
              <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} style={F.input} placeholder={label} />
            </div>
          ))}
          <div style={F.field}>
            <label style={F.label}>구매구분</label>
            <select value={form['구매구분']} onChange={e => set('구매구분', e.target.value)} style={F.input}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={F.field}>
            <label style={F.label}>집행구분</label>
            <select value={form['집행구분']} onChange={e => set('집행구분', e.target.value)}
              style={{ ...F.input, color: form['집행구분'] === 'N' ? '#ff4d4f' : '#1e293b', fontWeight: 600 }}>
              <option value="Y">Y — 집행</option>
              <option value="N">N — 미집행</option>
            </select>
          </div>
        </div>
        <div style={F.flagTitle}>해당 구매 유형 선택</div>
        <div style={F.flagGrid}>
          {FLAGS.map(({ key, label }) => (
            <label key={key} style={F.flagItem}>
              <input type="checkbox" checked={form[key] === 'Y'} onChange={() => toggleFlag(key)} style={{ marginRight: 6 }} />
              {label}
            </label>
          ))}
        </div>
        <div style={F.actions}>
          <button type="button" onClick={onCancel} style={F.cancelBtn}>취소</button>
          <button type="submit" style={F.saveBtn}>추가</button>
        </div>
      </form>
    </div>
  );
}

// ── 테이블 행 ────────────────────────────────────────────────────────────────
function TableRow({ row, index, excluded, onToggleExclude, onDeleteManual, isNew }) {
  const isN      = row['집행구분'] === 'N';
  const isManual = row.__source === 'manual';
  const isRaw    = row.__source === 'raw';

  const rowBg = excluded         ? '#fff2f0'
              : isNew            ? '#fffbe6'
              : isManual && isN  ? '#fff1f0'
              : isN              ? '#fff2f0'
              : index % 2 === 0  ? '#fff'
              :                    '#fafafa';

  return (
    <tr style={{ background: rowBg, opacity: excluded ? 0.7 : 1 }}>
      {/* 제외 체크박스 (raw 행만) */}
      <td style={{ ...P.td, textAlign: 'center', width: 40 }}>
        {isRaw && (
          <input
            type="checkbox"
            checked={excluded}
            onChange={() => onToggleExclude(row.__결의번호)}
            style={{ cursor: 'pointer', width: 15, height: 15 }}
          />
        )}
      </td>

      <td style={{ ...P.td, textAlign: 'center', color: '#aaa', width: 36 }}>{index + 1}</td>

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
              display: 'inline-block', padding: '2px 8px', borderRadius: 99,
              fontSize: 12, fontWeight: 700,
              background: isN ? '#fff1f0' : '#f6ffed',
              color:      isN ? '#ff4d4f' : '#52c41a',
              border:     `1px solid ${isN ? '#ffa39e' : '#b7eb8f'}`,
            }}>{row[c.key] || 'Y'}</span>
          ) : c.key === '물품금액' ? KRW(row[c.key])
            : c.fmt ? c.fmt(row[c.key])
            : (row[c.key] || '-')}
        </td>
      ))}

      <td style={{ ...P.td, textAlign: 'center', width: 56 }}>
        {excluded && <span style={{ fontSize: 11, color: '#ff4d4f', fontWeight: 600 }}>제외</span>}
        {!excluded && isNew && <span style={{ fontSize: 11, color: '#faad14' }}>미저장</span>}
        {!excluded && isManual && !isNew && (
          <button onClick={() => onDeleteManual(row.__id)} style={P.deleteBtn}>삭제</button>
        )}
        {!excluded && isRaw && <span style={{ fontSize: 11, color: '#aaa' }}>엑셀</span>}
      </td>
    </tr>
  );
}

// ── 토스트 ────────────────────────────────────────────────────────────────────
function Toast({ show }) {
  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
      background: '#1e293b', color: '#fff', padding: '12px 28px', borderRadius: 10,
      fontSize: 14, fontWeight: 600, zIndex: 999, boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    }}>
      ✓ 저장되었습니다
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function DetailsPage({ rows, onRefresh }) {
  const [excludedSet, setExcludedSet] = useState(new Set());
  const [localNewRows, setLocalNewRows] = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toast, setToast]         = useState(false);

  // rows가 갱신되면 제외여부 동기화
  useEffect(() => {
    const excluded = new Set(
      rows
        .filter(r => r.__source === 'raw' && r['제외여부'] === 1)
        .map(r => r.__결의번호)
        .filter(Boolean)
    );
    setExcludedSet(excluded);
  }, [rows]);

  const toggleExclude = (bizNo) => {
    if (!bizNo) return;
    setExcludedSet(prev => {
      const next = new Set(prev);
      next.has(bizNo) ? next.delete(bizNo) : next.add(bizNo);
      return next;
    });
  };

  const handleAdd = (newRow) => {
    setLocalNewRows(prev => [...prev, { ...newRow, __source: 'manual', __isNew: true }]);
    setShowForm(false);
  };

  const handleDeleteManual = useCallback(async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/purchases/manual/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (onRefresh) await onRefresh().catch(() => {});
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
    }
  }, [onRefresh]);

  // [저장] 버튼
  const handleSave = async () => {
    setSaving(true);
    try {
      const token   = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

      // 1. 제외 여부 일괄 저장
      await fetch(`${API_BASE}/api/purchases/exclude`, {
        method: 'PUT', headers,
        body: JSON.stringify({ excludeIds: [...excludedSet] }),
      });

      // 2. 미저장 수동 행 저장
      for (const row of localNewRows) {
        await fetch(`${API_BASE}/api/purchases/manual`, {
          method: 'POST', headers,
          body: JSON.stringify(formToManualBody(row)),
        });
      }
      setLocalNewRows([]);

      // 3. 재조회 → calcEngine 갱신
      if (onRefresh) await onRefresh().catch(() => {});

      // 4. 토스트
      setToast(true);
      setTimeout(() => setToast(false), 2500);
    } catch (e) {
      console.error('저장 오류:', e);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('모든 데이터를 초기화하시겠습니까?')) return;
    setResetting(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/purchases/reset`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setLocalNewRows([]);
      if (onRefresh) await onRefresh().catch(() => {});
    } catch {
      alert('초기화 중 오류가 발생했습니다.');
    } finally {
      setResetting(false);
    }
  };

  const allRows = [...rows, ...localNewRows];
  const total   = allRows.reduce((s, r) => s + (Number(r['물품금액']) || 0), 0);
  const excludedTotal = allRows
    .filter(r => excludedSet.has(r.__결의번호))
    .reduce((s, r) => s + (Number(r['물품금액']) || 0), 0);

  const isDirty = localNewRows.length > 0 ||
    rows.some(r => r.__source === 'raw' && ((r['제외여부'] === 1) !== excludedSet.has(r.__결의번호)));

  return (
    <div>
      <Toast show={toast} />

      {/* 헤더 */}
      <div style={P.header}>
        <div>
          <div style={P.pageTitle}>지출 내역</div>
          <div style={P.pageSub}>
            전체 {allRows.length.toLocaleString()}건 · {KRW(total)}
            {excludedSet.size > 0 && (
              <span style={P.excludeBadge}>제외 {excludedSet.size}건 ({KRW(excludedTotal)})</span>
            )}
            {localNewRows.length > 0 && (
              <span style={P.newBadge}>미저장 {localNewRows.length}건</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={P.resetBtn} onClick={handleReset} disabled={resetting}>
            {resetting ? '초기화 중...' : '🗑 초기화'}
          </button>
          <button style={P.addBtn} onClick={() => setShowForm(v => !v)}>
            {showForm ? '✕ 닫기' : '+ 행 추가'}
          </button>
          <button
            style={{ ...P.saveBtn, opacity: saving ? 0.7 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '저장 중...' : isDirty ? '💾 저장 *' : '💾 저장'}
          </button>
        </div>
      </div>

      {/* 행 추가 폼 */}
      {showForm && <AddRowForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />}

      {/* 범례 */}
      <div style={P.legend}>
        <span><span style={{ ...P.dot, background: '#fff2f0', border: '1px solid #ffa39e' }} />제외된 행</span>
        <span><span style={{ ...P.dot, background: '#fffbe6', border: '1px solid #ffd666' }} />미저장 새 행</span>
        <span style={{ color: '#64748b', fontSize: 12 }}>체크박스 선택 후 [저장]을 눌러야 반영됩니다.</span>
      </div>

      {/* 테이블 */}
      <div style={P.tableCard}>
        <div style={{ overflowX: 'auto' }}>
          <table style={P.table}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={{ ...P.th, width: 40, textAlign: 'center' }}>제외</th>
                <th style={{ ...P.th, width: 36, textAlign: 'center' }}>No.</th>
                {TABLE_COLS.map(c => (
                  <th key={c.key} style={{ ...P.th, textAlign: c.align }}>{c.label}</th>
                ))}
                <th style={{ ...P.th, width: 56, textAlign: 'center' }}>구분</th>
              </tr>
            </thead>
            <tbody>
              {allRows.length === 0 && (
                <tr>
                  <td colSpan={TABLE_COLS.length + 3} style={{ ...P.td, textAlign: 'center', color: '#aaa', padding: '40px 0' }}>
                    업로드된 데이터가 없습니다.
                  </td>
                </tr>
              )}
              {allRows.map((row, i) => (
                <TableRow
                  key={row.__결의번호 ?? `manual-${row.__id ?? i}`}
                  row={row}
                  index={i}
                  excluded={row.__source === 'raw' && excludedSet.has(row.__결의번호)}
                  onToggleExclude={toggleExclude}
                  onDeleteManual={handleDeleteManual}
                  isNew={!!row.__isNew}
                />
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f5f5f5', fontWeight: 700 }}>
                <td style={{ ...P.td, textAlign: 'center' }} colSpan={TABLE_COLS.length + 1}>합계</td>
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
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  pageTitle:    { fontSize: 20, fontWeight: 800, color: '#191F28', letterSpacing: '-0.5px' },
  pageSub:      { fontSize: 13, color: '#8B95A1', marginTop: 4 },
  excludeBadge: { marginLeft: 10, background: '#FFF0F1', color: '#F04452', padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 600 },
  newBadge:     { marginLeft: 6, background: '#FFF7EC', color: '#FF6B00', padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 600 },
  addBtn:       { padding: '9px 18px', background: '#3182F6', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  saveBtn:      { padding: '9px 18px', background: '#00B493', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  resetBtn:     { padding: '9px 14px', background: '#FFFFFF', color: '#F04452', border: '1px solid #F2F4F6', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  legend:       { display: 'flex', gap: 16, alignItems: 'center', marginBottom: 10, fontSize: 12, color: '#8B95A1' },
  dot:          { display: 'inline-block', width: 12, height: 12, borderRadius: 3, marginRight: 4 },
  tableCard:    { background: '#FFFFFF', borderRadius: 16, border: '1px solid #F2F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' },
  table:        { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:           { padding: '11px 12px', fontWeight: 600, color: '#8B95A1', borderBottom: '1px solid #F2F4F6', textAlign: 'left', whiteSpace: 'nowrap', background: '#F9FAFB', fontSize: 12 },
  td:           { padding: '10px 12px', borderBottom: '1px solid #F2F4F6', whiteSpace: 'nowrap', color: '#191F28' },
  deleteBtn:    { padding: '4px 10px', background: '#FFF0F1', color: '#F04452', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
};

const F = {
  card:      { background: '#FFFFFF', borderRadius: 16, padding: '20px 24px', marginBottom: 12, border: '1px solid #EBF3FE', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  title:     { fontSize: 14, fontWeight: 700, color: '#191F28', marginBottom: 14, letterSpacing: '-0.2px' },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px 16px', marginBottom: 14 },
  field:     { display: 'flex', flexDirection: 'column', gap: 4 },
  label:     { fontSize: 12, fontWeight: 600, color: '#8B95A1' },
  input:     { padding: '9px 12px', border: '1px solid #F2F4F6', borderRadius: 10, fontSize: 13, outline: 'none', background: '#F9FAFB', color: '#191F28' },
  flagTitle: { fontSize: 13, fontWeight: 600, color: '#8B95A1', marginBottom: 8 },
  flagGrid:  { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px 4px', marginBottom: 14 },
  flagItem:  { fontSize: 13, color: '#191F28', display: 'flex', alignItems: 'center', cursor: 'pointer' },
  actions:   { display: 'flex', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { padding: '8px 18px', background: '#FFFFFF', border: '1px solid #F2F4F6', borderRadius: 10, fontSize: 13, cursor: 'pointer', color: '#8B95A1' },
  saveBtn:   { padding: '8px 22px', background: '#3182F6', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
};
