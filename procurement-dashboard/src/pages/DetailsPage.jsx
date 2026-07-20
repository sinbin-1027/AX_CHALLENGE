import { useState, useEffect, useMemo } from 'react';

const KRW = (n) => (Number(n) ? Math.round(Number(n)).toLocaleString('ko-KR') + '원' : '-');

const fmtDate = (v) => {
  if (!v) return '-';
  const n = Number(v);
  if (!n) return String(v);
  const d = new Date(Math.round((n - 25569) * 86400 * 1000));
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
};

const toDateInput = (v) => {
  if (!v && v !== 0) return '';
  const n = Number(v);
  if (!n) return String(v);
  const d = new Date(Math.round((n - 25569) * 86400 * 1000));
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
};

const TABLE_COLS = [
  { key: '집행구분',       label: '집행구분',  align: 'center' },
  { key: '결의번호',       label: '결의번호',  align: 'left'   },
  { key: '발의일자',       label: '발의일자',  align: 'left',  fmt: fmtDate },
  { key: '구매구분',       label: '구매구분',  align: 'left'   },
  { key: '부서명',         label: '부서명',    align: 'left'   },
  { key: '적요',           label: '적요',      align: 'left',  maxWidth: 200 },
  { key: '수령인사업자명', label: '거래처',    align: 'left',  maxWidth: 160 },
  { key: '발주품목명',     label: '품목명',    align: 'left',  maxWidth: 160 },
  { key: '물품금액',       label: '금액',      align: 'right'  },
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
  { key: '혁신제품여부',             label: '혁신제품'   },
];

const CATEGORIES = ['물품', '용역', '공사', '온누리상품권', '없음'];

const SORTABLE_KEYS = new Set(['결의번호', '발의일자', '구매구분', '부서명', '적요', '수령인사업자명', '발주품목명', '물품금액']);

function normFlag(val) {
  return (val === 'Y' || val === '해당있음') ? 'Y' : '';
}

function emptyRow() {
  const row = {
    '집행구분': 'Y', '발의일자': '', '구매구분': '물품', '부서명': '',
    '적요': '', '수령인사업자명': '', '발주품목명': '', '물품금액': '',
  };
  FLAGS.forEach(f => { row[f.key] = ''; });
  return row;
}

function rowToDraft(row) {
  const d = {
    '집행구분':       row['집행구분'] ?? 'Y',
    '발의일자':       toDateInput(row['발의일자']),
    '구매구분':       row['구매구분'] ?? '물품',
    '부서명':         row['부서명'] ?? '',
    '적요':           row['적요'] ?? '',
    '수령인사업자명': row['수령인사업자명'] ?? '',
    '발주품목명':     row['발주품목명'] ?? '',
    '물품금액':       String(row['물품금액'] ?? ''),
  };
  FLAGS.forEach(f => { d[f.key] = normFlag(row[f.key]); });
  return d;
}

// ── 편집 패널 ────────────────────────────────────────────────────────────────
function EditPanel({ mode, draft, selectedRow, onChange, onToggleFlag, onConfirm, onCancel }) {
  if (mode === 'idle') {
    return (
      <div style={F.idlePanel}>
        행을 클릭하면 상세정보가 표시됩니다&nbsp;&nbsp;·&nbsp;&nbsp;[+ 행 추가] 버튼으로 새 행을 입력할 수 있습니다
      </div>
    );
  }

  const isAdd = mode === 'add';
  const isRaw = selectedRow?.__source === 'raw';
  const rowId = isAdd ? null
              : isRaw ? (selectedRow?.['결의번호'] ?? selectedRow?.__결의번호 ?? '')
              : '수기입력';
  const title = isAdd ? '새 행 입력' : `행 수정 — ${rowId}`;
  const isN   = draft['집행구분'] === 'N';

  return (
    <div style={F.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={F.title}>{title}</span>
        <button onClick={onCancel} style={F.closeBtnX}>✕</button>
      </div>
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
              value={draft[key] ?? ''}
              onChange={e => onChange(key, e.target.value)}
              style={F.input}
              placeholder={label}
            />
          </div>
        ))}
        <div style={F.field}>
          <label style={F.label}>구매구분</label>
          <select value={draft['구매구분'] ?? '물품'} onChange={e => onChange('구매구분', e.target.value)} style={F.input}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={F.field}>
          <label style={F.label}>집행구분</label>
          <select
            value={draft['집행구분'] ?? 'Y'}
            onChange={e => onChange('집행구분', e.target.value)}
            style={{ ...F.input, color: isN ? '#ff4d4f' : '#1e293b', fontWeight: 600 }}
          >
            <option value="Y">Y — 집행</option>
            <option value="N">N — 미집행</option>
          </select>
        </div>
      </div>
      <div style={F.flagTitle}>해당 구매 유형 선택</div>
      <div style={F.flagGrid}>
        {FLAGS.map(({ key, label }) => (
          <label key={key} style={F.flagItem}>
            <input type="checkbox" checked={draft[key] === 'Y'} onChange={() => onToggleFlag(key)} style={{ marginRight: 5 }} />
            {label}
          </label>
        ))}
      </div>
      <div style={F.actions}>
        <button type="button" onClick={onCancel} style={F.cancelBtn}>취소</button>
        <button type="button" onClick={onConfirm} style={F.saveBtn}>{isAdd ? '추가' : '저장'}</button>
      </div>
    </div>
  );
}

// ── 테이블 행 ────────────────────────────────────────────────────────────────
function TableRow({ row, index, excluded, isSelected, onRowClick, onToggleExclude, onDeleteManual, isNew }) {
  const isManual = row.__source === 'manual';
  const isRaw    = row.__source === 'raw';
  const isN      = row['집행구분'] === 'N';

  const rowBg = isSelected      ? '#EFF6FF'
              : excluded        ? '#fff2f0'
              : isNew           ? '#fffbe6'
              : isN             ? '#fff2f0'
              : index % 2 === 0 ? '#fff'
              :                   '#fafafa';

  return (
    <tr
      style={{ background: rowBg, opacity: excluded ? 0.7 : 1, cursor: 'pointer' }}
      onClick={() => onRowClick(row)}
    >
      <td style={{ ...P.td, textAlign: 'center', width: 40 }} onClick={e => e.stopPropagation()}>
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
      <td style={{ ...P.td, textAlign: 'center', width: 80 }} onClick={e => e.stopPropagation()}>
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
export default function DetailsPage({ rows, excludedSet: excludedSetProp = new Set(), onSave, onReset, onRefresh, onRowUpdate }) {
  const [excludedSet, setExcludedSet]   = useState(new Set());
  const [localNewRows, setLocalNewRows] = useState([]);
  const [sortConfig, setSortConfig]     = useState({ key: null, direction: null });
  const [panelMode, setPanelMode]       = useState('idle');  // 'idle' | 'add' | 'edit'
  const [selectedRow, setSelectedRow]   = useState(null);
  const [panelDraft, setPanelDraft]     = useState({});
  const [toast, setToast]               = useState(false);

  useEffect(() => {
    setExcludedSet(new Set(excludedSetProp));
  }, [excludedSetProp]);

  const toggleExclude = (bizNo) => {
    if (!bizNo) return;
    setExcludedSet(prev => {
      const next = new Set(prev);
      next.has(bizNo) ? next.delete(bizNo) : next.add(bizNo);
      return next;
    });
  };

  const handleClosePanel = () => {
    setPanelMode('idle');
    setSelectedRow(null);
    setPanelDraft({});
  };

  const handleRowClick = (row) => {
    setSelectedRow(row);
    setPanelDraft(rowToDraft(row));
    setPanelMode('edit');
  };

  const handleOpenAdd = () => {
    setSelectedRow(null);
    setPanelDraft(emptyRow());
    setPanelMode('add');
  };

  const handlePanelChange    = (key, val) => setPanelDraft(prev => ({ ...prev, [key]: val }));
  const handlePanelToggleFlag = (key)     => setPanelDraft(prev => ({ ...prev, [key]: prev[key] === 'Y' ? '' : 'Y' }));

  const handlePanelAdd = () => {
    if (!panelDraft['물품금액']) { alert('금액을 입력해주세요.'); return; }
    const localId = `local_${Date.now()}`;
    setLocalNewRows(prev => [...prev, {
      ...panelDraft,
      '물품금액': Number(panelDraft['물품금액']) || 0,
      __source: 'manual',
      __isNew: true,
      __id: localId,
    }]);
    handleClosePanel();
  };

  const handlePanelSave = () => {
    if (!selectedRow) return;
    const editedFields = { ...panelDraft, '물품금액': Number(panelDraft['물품금액']) || 0 };
    if (selectedRow.__isNew) {
      setLocalNewRows(prev => prev.map(r =>
        r.__id === selectedRow.__id ? { ...r, ...editedFields } : r
      ));
    } else {
      onRowUpdate?.(selectedRow, editedFields);
    }
    handleClosePanel();
  };

  const handleDeleteManual = (id) => {
    setLocalNewRows(prev => prev.filter(r => r.__id !== id));
    if (selectedRow?.__id === id) handleClosePanel();
  };

  const handleSave = () => {
    console.log('DetailsPage handleSave — localNewRows:', localNewRows);
    if (onSave) onSave(excludedSet, localNewRows);
    setLocalNewRows([]);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };

  const handleReset = () => {
    if (!window.confirm('업로드/수기입력 데이터를 모두 초기화할까요? 데모데이터는 유지됩니다.')) return;
    setLocalNewRows([]);
    setExcludedSet(new Set());
    handleClosePanel();
    onReset?.();
  };

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key !== key)              return { key, direction: 'asc' };
      if (prev.direction === 'asc')      return { key, direction: 'desc' };
      if (prev.direction === 'desc')     return { key: null, direction: null };
      return { key, direction: 'asc' };
    });
  };

  const allRows       = [...rows, ...localNewRows];
  const total         = allRows.reduce((s, r) => s + (Number(r['물품금액']) || 0), 0);
  const excludedTotal = allRows
    .filter(r => excludedSet.has(r.__결의번호))
    .reduce((s, r) => s + (Number(r['물품금액']) || 0), 0);
  const isDirty = localNewRows.length > 0 ||
    rows.some(r => r.__source === 'raw' && ((r['제외여부'] === 1) !== excludedSet.has(r.__결의번호)));
  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return allRows;
    return [...allRows].sort((a, b) => {
      const aVal = a[sortConfig.key] ?? '';
      const bVal = b[sortConfig.key] ?? '';
      if (sortConfig.key === '물품금액') {
        return sortConfig.direction === 'asc'
          ? Number(aVal) - Number(bVal)
          : Number(bVal) - Number(aVal);
      }
      return sortConfig.direction === 'asc'
        ? String(aVal).localeCompare(String(bVal), 'ko')
        : String(bVal).localeCompare(String(aVal), 'ko');
    });
  }, [allRows, sortConfig]);

  const tableMaxH = panelMode === 'idle' ? 'calc(100vh - 310px)' : 'calc(100vh - 530px)';

  return (
    <div>
      <Toast show={toast} />

      {/* 상단 고정 패널 */}
      <div style={P.stickyTop}>
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
            <button style={P.resetBtn}   onClick={handleReset}>🗑 초기화</button>
            <button style={P.addBtn}     onClick={handleOpenAdd}>+ 행 추가</button>
            <button style={P.refreshBtn} onClick={() => onRefresh?.()}>🔄 조회</button>
            <button style={P.saveBtn}    onClick={handleSave}>{isDirty ? '💾 저장 *' : '💾 저장'}</button>
          </div>
        </div>

        <EditPanel
          mode={panelMode}
          draft={panelDraft}
          selectedRow={selectedRow}
          onChange={handlePanelChange}
          onToggleFlag={handlePanelToggleFlag}
          onConfirm={panelMode === 'add' ? handlePanelAdd : handlePanelSave}
          onCancel={handleClosePanel}
        />

        <div style={P.legend}>
          <span><span style={{ ...P.dot, background: '#EFF6FF', border: '1px solid #93c5fd' }} />선택된 행</span>
          <span><span style={{ ...P.dot, background: '#fff2f0', border: '1px solid #ffa39e' }} />제외된 행</span>
          <span><span style={{ ...P.dot, background: '#fffbe6', border: '1px solid #ffd666' }} />미저장 새 행</span>
          <span style={{ color: '#64748b', fontSize: 12 }}>행 클릭 → 패널에서 수정 · 체크박스로 제외 설정 후 [저장]</span>
        </div>
      </div>

      {/* 테이블 */}
      <div style={P.tableCard}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: tableMaxH }}>
          <table style={P.table}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr style={{ background: '#F9FAFB' }}>
                <th style={{ ...P.th, width: 40, textAlign: 'center' }}>제외</th>
                <th style={{ ...P.th, width: 36, textAlign: 'center' }}>No.</th>
                {TABLE_COLS.map(c => {
                  const sortable = SORTABLE_KEYS.has(c.key);
                  const active   = sortConfig.key === c.key;
                  return (
                    <th
                      key={c.key}
                      style={{ ...P.th, textAlign: c.align, cursor: sortable ? 'pointer' : 'default', userSelect: 'none' }}
                      onClick={sortable ? () => handleSort(c.key) : undefined}
                    >
                      {c.label}
                      {sortable && (
                        <span style={{ marginLeft: 4, fontSize: 10, color: active ? '#3182F6' : '#CBD5E0' }}>
                          {active && sortConfig.direction === 'asc'  ? '▲'
                         : active && sortConfig.direction === 'desc' ? '▼'
                         : '⇅'}
                        </span>
                      )}
                    </th>
                  );
                })}
                <th style={{ ...P.th, width: 80, textAlign: 'center' }}>구분</th>
              </tr>
            </thead>
            <tbody>
              {allRows.length === 0 && (
                <tr>
                  <td colSpan={TABLE_COLS.length + 3} style={{ ...P.td, textAlign: 'center', color: '#aaa', padding: '40px 0' }}>
                    데이터가 없습니다.
                  </td>
                </tr>
              )}
              {sortedRows.map((row, i) => (
                <TableRow
                  key={row.__결의번호 ?? `manual-${row.__id ?? i}`}
                  row={row}
                  index={i}
                  excluded={row.__source === 'raw' && excludedSet.has(row.__결의번호)}
                  isSelected={
                    selectedRow != null && (
                      (row.__id != null        && row.__id        === selectedRow.__id) ||
                      (row.__결의번호 != null   && row.__결의번호  === selectedRow.__결의번호)
                    )
                  }
                  onRowClick={handleRowClick}
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
  stickyTop:    { position: 'sticky', top: 0, zIndex: 10, background: '#F9FAFB', paddingBottom: 8 },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  pageTitle:    { fontSize: 20, fontWeight: 800, color: '#191F28', letterSpacing: '-0.5px' },
  pageSub:      { fontSize: 13, color: '#8B95A1', marginTop: 4 },
  excludeBadge: { marginLeft: 10, background: '#FFF0F1', color: '#F04452', padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 600 },
  newBadge:     { marginLeft: 6, background: '#FFF7EC', color: '#FF6B00', padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 600 },
  addBtn:       { padding: '9px 18px', background: '#3182F6', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  saveBtn:      { padding: '9px 18px', background: '#00B493', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  resetBtn:     { padding: '9px 14px', background: '#FFFFFF', color: '#F04452', border: '1px solid #F2F4F6', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  refreshBtn:   { padding: '9px 18px', background: '#FFFFFF', color: '#3182F6', border: '1px solid #3182F6', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  legend:       { display: 'flex', gap: 16, alignItems: 'center', marginBottom: 10, fontSize: 12, color: '#8B95A1' },
  dot:          { display: 'inline-block', width: 12, height: 12, borderRadius: 3, marginRight: 4 },
  tableCard:    { background: '#FFFFFF', borderRadius: 16, border: '1px solid #F2F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' },
  table:        { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:           { padding: '11px 12px', fontWeight: 600, color: '#8B95A1', borderBottom: '1px solid #F2F4F6', textAlign: 'left', whiteSpace: 'nowrap', background: '#F9FAFB', fontSize: 12 },
  td:           { padding: '10px 12px', borderBottom: '1px solid #F2F4F6', whiteSpace: 'nowrap', color: '#191F28' },
  deleteBtn:    { padding: '4px 10px', background: '#FFF0F1', color: '#F04452', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
};

const F = {
  card:      { background: '#FFFFFF', borderRadius: 14, padding: '14px 18px', marginBottom: 10, border: '1px solid #EBF3FE', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  idlePanel: { padding: '14px 18px', border: '1.5px dashed #E2E8F0', borderRadius: 12, textAlign: 'center', color: '#94a3b8', fontSize: 13, marginBottom: 10 },
  title:     { fontSize: 14, fontWeight: 700, color: '#191F28' },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px 14px', marginBottom: 10 },
  field:     { display: 'flex', flexDirection: 'column', gap: 3 },
  label:     { fontSize: 12, fontWeight: 600, color: '#8B95A1' },
  input:     { padding: '8px 10px', border: '1px solid #F2F4F6', borderRadius: 8, fontSize: 13, outline: 'none', background: '#F9FAFB', color: '#191F28' },
  flagTitle: { fontSize: 12, fontWeight: 600, color: '#8B95A1', marginBottom: 6 },
  flagGrid:  { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px 4px', marginBottom: 10 },
  flagItem:  { fontSize: 12, color: '#191F28', display: 'flex', alignItems: 'center', cursor: 'pointer' },
  actions:   { display: 'flex', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { padding: '7px 16px', background: '#FFFFFF', border: '1px solid #F2F4F6', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#8B95A1' },
  saveBtn:   { padding: '7px 20px', background: '#3182F6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  closeBtnX: { padding: '4px 9px', border: 'none', background: '#F2F4F6', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#8B95A1', lineHeight: 1 },
};
