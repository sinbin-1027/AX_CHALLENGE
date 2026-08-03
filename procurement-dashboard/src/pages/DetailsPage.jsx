import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import AmountText from '../components/AmountText';
import FileUpload from '../components/FileUpload';

const API_BASE = process.env.REACT_APP_API_URL || '';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});
const FETCH_OPTS = { get headers() { return getAuthHeaders(); } };

// calc 컬럼명 → DB 컬럼명 (다른 이름을 가진 항목만)
const CALC_TO_DB_COL = {
  '중소기업제품(연동)':       '중소기업제품',
  '여성기업제품(연동)':       '여성기업제품',
  '장애인구매(연동)':         '장애인구매',
  '신제품인증(NEP)여부':      '신제품인증NEP여부',
  '신제품인증(NEP) 대상품목': '신제품인증NEP대상품목',
};
function toDbColName(k) { return CALC_TO_DB_COL[k] ?? k; }

const fmtDate = (v) => {
  if (!v) return '-';
  const n = Number(v);
  if (!n) return String(v).slice(0, 10);
  const d = new Date(Math.round((n - 25569) * 86400 * 1000));
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
};

const toDateInput = (v) => {
  if (!v && v !== 0) return '';
  const n = Number(v);
  if (!n) return String(v).slice(0, 10);
  const d = new Date(Math.round((n - 25569) * 86400 * 1000));
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
};

const TABLE_COLS = [
  { key: '집행구분',       label: '집행구분',  align: 'center', width: 100, resizable: false },
  { key: '결의번호',       label: '결의번호',  align: 'left',   width: 100 },
  { key: '발의일자',       label: '발의일자',  align: 'left',   width: 110, fmt: fmtDate },
  { key: '구매구분',       label: '구매유형',  align: 'left',   width: 90  },
  { key: '수령인사업자명', label: '구매처',    align: 'left',   width: 160 },
  { key: '적요',           label: '적요',      align: 'left',   width: 200 },
  { key: '발주품목명',     label: '품목명',    align: 'left',   width: 160 },
  { key: '예산명',         label: '예산명',    align: 'left',   width: 180 },
  { key: '물품금액',       label: '금액',      align: 'right',  width: 110 },
];

// 컬럼 리사이즈 대상이 아닌 고정 컬럼(모수 제외 체크박스 / 순번 / 구분 배지)의 기본 너비
// (텍스트가 잘리지 않도록 항상 이 너비 그대로 고정 — 드래그로 리사이즈 불가)
const EXTRA_COL_WIDTHS = { __exclude: 90, __seq: 60, __type: 80 };

// 테이블 전체 컬럼의 순서 (colWidths의 key 목록이자 리사이즈 시 이웃 컬럼을 찾는 기준)
const COL_ORDER = ['__exclude', '__seq', ...TABLE_COLS.map(c => c.key), '__type'];

const FLAGS = [
  { key: '중소기업제품(연동)',       label: '중소기업'   },
  { key: '여성기업제품(연동)',       label: '여성기업'   },
  { key: '사회적기업',               label: '사회적기업' },
  { key: '사회적협동조합제품여부',   label: '사회적협동조합' },
  { key: '장애인구매(연동)',         label: '장애인기업' },
  { key: '장애인표준사업장여부',     label: '장애인표준사업장' },
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

const SORTABLE_KEYS = new Set(['결의번호', '발의일자', '구매구분', '적요', '수령인사업자명', '발주품목명', '물품금액']);

function normFlag(val) {
  return (val === 'Y' || val === '해당있음') ? 'Y' : '';
}

function emptyRow() {
  const row = {
    '집행구분': 'Y', '발의일자': '', '구매구분': '물품',
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
    '적요':           row['적요'] ?? '',
    '수령인사업자명': row['수령인사업자명'] ?? '',
    '발주품목명':     row['발주품목명'] ?? '',
    '물품금액':       String(row['물품금액'] ?? ''),
  };
  FLAGS.forEach(f => { d[f.key] = normFlag(row[f.key]); });
  return d;
}

// ── 편집 패널 ────────────────────────────────────────────────────────────────
function EditPanel({ mode, draft, selectedRow, onChange, onToggleFlag, onConfirm, onCancel, onDelete }) {
  if (mode === 'idle') {
    return (
      <div style={F.idlePanel}>
        행을 클릭하면 상세정보가 표시됩니다&nbsp;&nbsp;·&nbsp;&nbsp;[+ 행 추가] 버튼으로 새 행을 입력할 수 있습니다
      </div>
    );
  }

  const isAdd = mode === 'add';
  const title = isAdd ? '새 행 입력' : '수정';
  const isN   = draft['집행구분'] === 'N';

  return (
    <div style={{ ...F.card, ...(isAdd ? F.cardAdd : {}) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ ...F.title, ...(isAdd ? F.titleAdd : {}) }}>{title}</span>
        <button onClick={onCancel} style={F.closeBtnX}>✕</button>
      </div>
      <div style={F.grid}>
        {[
          { key: '발의일자',       label: '발의일자',  type: 'date'   },
          { key: '수령인사업자명', label: '구매처',    type: 'text'   },
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
          <label style={F.label}>구매유형</label>
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
        {!isAdd && (
          <button type="button" onClick={onDelete} style={F.deleteBtn}>삭제</button>
        )}
        <button type="button" onClick={onConfirm} style={F.saveBtn}>{isAdd ? '추가' : '저장'}</button>
      </div>
    </div>
  );
}

// ── 컬럼 너비 드래그 핸들 ────────────────────────────────────────────────────
function ResizeHandle({ colKey, onResizeStart }) {
  return (
    <span
      onMouseDown={e => onResizeStart(colKey, e)}
      onClick={e => e.stopPropagation()}
      style={P.resizeHandle}
    />
  );
}

// ── 테이블 행 ────────────────────────────────────────────────────────────────
function TableRow({ row, index, excluded, isSelected, onRowClick, onToggleExclude }) {
  const isRaw      = row.__source === 'raw';
  const isPending   = row.__source === 'pending-manual' || row.__source === 'pending-excel';
  const isN        = row['집행구분'] === 'N';
  const excludeKey = isRaw ? row.__결의번호 : row.__id;

  const rowBg = isSelected      ? '#EFF6FF'
              : isPending       ? '#FFFBEB'
              : excluded        ? '#fff2f0'
              : isN             ? '#fff2f0'
              : index % 2 === 0 ? '#fff'
              :                   '#fafafa';

  return (
    <tr
      style={{ background: rowBg, opacity: excluded ? 0.7 : 1, cursor: 'pointer' }}
      onClick={() => onRowClick(row)}
    >
      <td style={{ ...P.td, textAlign: 'center', width: 40 }} onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={excluded}
          disabled={isPending}
          onChange={() => onToggleExclude(excludeKey)}
          style={{ cursor: isPending ? 'not-allowed' : 'pointer', width: 15, height: 15, opacity: isPending ? 0.4 : 1 }}
        />
      </td>
      <td style={{ ...P.td, textAlign: 'center', color: '#aaa', width: 36 }}>{index + 1}</td>
      {TABLE_COLS.map(c => (
        <td
          key={c.key}
          style={{
            ...P.td,
            textAlign: c.align,
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
          ) : c.key === '물품금액' ? (Number(row[c.key]) ? <AmountText value={row[c.key]} /> : '-')
            : c.fmt ? c.fmt(row[c.key])
            : (row[c.key] || '-')}
        </td>
      ))}
      <td style={{ ...P.td, textAlign: 'center', width: 80 }}>
        {isPending
          ? <span style={P.badgeYellow}>미저장</span>
          : isRaw
            ? <span style={P.badgeGray}>엑셀</span>
            : <span style={P.badgeBlue}>수기</span>}
      </td>
    </tr>
  );
}

// ── 토스트 ────────────────────────────────────────────────────────────────────
function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
      background: '#1e293b', color: '#fff', padding: '12px 28px', borderRadius: 10,
      fontSize: 14, fontWeight: 600, zIndex: 999, boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    }}>
      ✓ {message}
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function DetailsPage({ rows, excludedSet: excludedSetProp = new Set(), deptId, onRefresh }) {
  const [excludedSet, setExcludedSet] = useState(new Set());
  const [sortConfig, setSortConfig]   = useState({ key: null, direction: null });
  const [panelMode, setPanelMode]     = useState('idle');  // 'idle' | 'add' | 'edit'
  const [selectedRow, setSelectedRow] = useState(null);
  const [panelDraft, setPanelDraft]   = useState({});
  const [toast, setToast]             = useState(null);
  // "저장"을 누르기 전까지 로컬에만 존재하는 대기(pending) 행들 — 행 추가 / 엑셀 업로드 공통
  const [pendingManualRows, setPendingManualRows] = useState([]);
  const [pendingExcelRows,  setPendingExcelRows]  = useState([]);
  const [showUploadModal,  setShowUploadModal]    = useState(false);
  // 컬럼 너비는 %로 관리 (합계 100 유지 → 가로 스크롤 없이 항상 컨테이너 폭에 꽉 참)
  const [colWidths, setColWidths]     = useState(() => {
    const px = { ...EXTRA_COL_WIDTHS, ...Object.fromEntries(TABLE_COLS.map(c => [c.key, c.width])) };
    const total = COL_ORDER.reduce((s, k) => s + px[k], 0);
    return Object.fromEntries(COL_ORDER.map(k => [k, (px[k] / total) * 100]));
  });

  useEffect(() => {
    setExcludedSet(new Set(excludedSetProp));
  }, [excludedSetProp]);

  // ── 컬럼 너비 드래그 리사이즈 (드래그한 컬럼과 바로 오른쪽 이웃 컬럼끼리 폭을 주고받음) ──
  const tableWrapRef = useRef(null);
  const resizingRef  = useRef(null);
  const MIN_COL_PX   = 40;

  const handleResizeMove = useCallback((e) => {
    const r = resizingRef.current;
    if (!r) return;
    const deltaPct = ((e.clientX - r.startX) / r.containerWidth) * 100;
    let newLeft  = r.startLeftPct + deltaPct;
    let newRight = r.startRightPct - deltaPct;
    if (newLeft < r.minPct)       { newRight -= (r.minPct - newLeft);  newLeft  = r.minPct; }
    else if (newRight < r.minPct) { newLeft  -= (r.minPct - newRight); newRight = r.minPct; }
    setColWidths(prev => ({ ...prev, [r.leftKey]: newLeft, [r.rightKey]: newRight }));
  }, []);

  const handleResizeEnd = useCallback(() => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleResizeMove]);

  const handleResizeStart = useCallback((key, e) => {
    e.preventDefault();
    e.stopPropagation();
    const idx      = COL_ORDER.indexOf(key);
    const rightKey = COL_ORDER[idx + 1];
    if (!rightKey) return; // 마지막 컬럼은 오른쪽 이웃이 없어 리사이즈 불가 (이전 컬럼 핸들로 조정)

    const containerWidth = tableWrapRef.current?.getBoundingClientRect().width || 1;
    resizingRef.current = {
      leftKey: key, rightKey,
      startX: e.clientX,
      startLeftPct:  colWidths[key],
      startRightPct: colWidths[rightKey],
      containerWidth,
      minPct: (MIN_COL_PX / containerWidth) * 100,
    };
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [colWidths, handleResizeMove, handleResizeEnd]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const toggleExclude = (key) => {
    if (!key) return;
    setExcludedSet(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
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

  const handlePanelChange     = (key, val) => setPanelDraft(prev => ({ ...prev, [key]: val }));
  const handlePanelToggleFlag = (key)      => setPanelDraft(prev => ({ ...prev, [key]: prev[key] === 'Y' ? '' : 'Y' }));

  // ── API 핸들러 ───────────────────────────────────────────────────────────────

  // 엑셀 파싱 결과: 서버에 바로 올리지 않고 대기 목록에만 추가 ("저장"을 눌러야 반영)
  const handleExcelParsed = (parsedRows) => {
    const tagged = parsedRows.map(r => ({ ...r, __source: 'pending-excel' }));
    setPendingExcelRows(prev => [...prev, ...tagged]);
    showToast(`${parsedRows.length.toLocaleString()}건 파싱됨 — "저장"을 눌러야 반영됩니다.`);
  };

  // 행 추가: 서버에 바로 POST하지 않고 대기 목록에만 추가 ("저장"을 눌러야 반영)
  const handlePanelAdd = () => {
    if (!panelDraft['물품금액']) { alert('금액을 입력해주세요.'); return; }
    const newRow = { ...panelDraft, '물품금액': Number(panelDraft['물품금액']) || 0 };
    setPendingManualRows(prev => [...prev, newRow]);
    handleClosePanel();
    showToast('행이 대기 목록에 추가되었습니다. "저장"을 눌러야 반영됩니다.');
  };

  const handlePanelSave = async () => {
    if (!selectedRow) return;
    const editedFields = { ...panelDraft, '물품금액': Number(panelDraft['물품금액']) || 0 };

    // 대기 중인 행 수정: 로컬 배열만 갱신 (서버 호출 없음)
    if (selectedRow.__source === 'pending-manual') {
      setPendingManualRows(prev => prev.map((r, i) => i === selectedRow.__pendingIndex ? { ...r, ...editedFields } : r));
      handleClosePanel();
      showToast('대기 중인 행이 수정되었습니다');
      return;
    }
    if (selectedRow.__source === 'pending-excel') {
      setPendingExcelRows(prev => prev.map((r, i) => i === selectedRow.__pendingIndex ? { ...r, ...editedFields } : r));
      handleClosePanel();
      showToast('대기 중인 행이 수정되었습니다');
      return;
    }

    try {
      if (selectedRow.__source === 'raw') {
        // calc 컬럼명 → DB 컬럼명 변환 후 전송
        const dbFields = {};
        for (const [k, v] of Object.entries(editedFields)) {
          dbFields[toDbColName(k)] = v;
        }
        const res = await fetch(`${API_BASE}/api/purchases/adjust`, {
          ...FETCH_OPTS,
          method: 'PUT',
          body:   JSON.stringify({ deptId, 결의번호: selectedRow.__결의번호, fields: dbFields }),
        });
        if (!res.ok) throw new Error('수정 실패');
      } else if (selectedRow.__source === 'manual') {
        const res = await fetch(`${API_BASE}/api/purchases/manual/${selectedRow.__id}`, {
          ...FETCH_OPTS,
          method: 'PUT',
          body:   JSON.stringify({ deptId, ...editedFields }),
        });
        if (!res.ok) throw new Error('수정 실패');
      }
      handleClosePanel();
      onRefresh?.();
      showToast('저장되었습니다');
    } catch (e) {
      alert('행 수정 중 오류가 발생했습니다.');
      console.error(e);
    }
  };

  const handlePanelDelete = async () => {
    if (!selectedRow) return;
    if (!window.confirm('이 행을 삭제할까요?')) return;

    // 대기 중인 행 삭제: 로컬 배열에서만 제거 (서버 호출 없음)
    if (selectedRow.__source === 'pending-manual') {
      setPendingManualRows(prev => prev.filter((_, i) => i !== selectedRow.__pendingIndex));
      handleClosePanel();
      showToast('대기 중인 행이 삭제되었습니다');
      return;
    }
    if (selectedRow.__source === 'pending-excel') {
      setPendingExcelRows(prev => prev.filter((_, i) => i !== selectedRow.__pendingIndex));
      handleClosePanel();
      showToast('대기 중인 행이 삭제되었습니다');
      return;
    }

    try {
      if (selectedRow.__source === 'raw') {
        const bizNo = encodeURIComponent(selectedRow.__결의번호 ?? '');
        const res = await fetch(`${API_BASE}/api/purchases/delete/${bizNo}?deptId=${deptId}`, {
          ...FETCH_OPTS,
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('삭제 실패');
      } else if (selectedRow.__source === 'manual') {
        const res = await fetch(`${API_BASE}/api/purchases/manual/${selectedRow.__id}?deptId=${deptId}`, {
          ...FETCH_OPTS,
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('삭제 실패');
      }
      handleClosePanel();
      onRefresh?.();
      showToast('삭제되었습니다');
    } catch (e) {
      alert('행 삭제 중 오류가 발생했습니다.');
      console.error(e);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('정말 초기화하시겠어요? 지금까지 업로드/입력한 내용이 모두 사라집니다.')) return;

    try {
      const res = await fetch(`${API_BASE}/api/purchases/reset?deptId=${deptId}`, {
        ...FETCH_OPTS,
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('초기화 실패');
      setPendingManualRows([]);
      setPendingExcelRows([]);
      onRefresh?.();
      showToast('초기화되었습니다');
    } catch (e) {
      alert('초기화 중 오류가 발생했습니다.');
      console.error(e);
    }
  };

  // 대기 중인 행(수기 추가 + 엑셀 업로드) + 제외 설정을 한 번에 서버로 반영
  const handleSave = async () => {
    try {
      for (const draft of pendingManualRows) {
        const { __source, __pendingIndex, __pendingKey, ...fields } = draft;
        const res = await fetch(`${API_BASE}/api/purchases/manual`, {
          ...FETCH_OPTS,
          method: 'POST',
          body:   JSON.stringify({ deptId, ...fields }),
        });
        if (!res.ok) throw new Error('행 추가 반영 실패');
      }

      if (pendingExcelRows.length > 0) {
        const cleanRows = pendingExcelRows.map(({ __source, __pendingIndex, __pendingKey, ...rest }) => rest);
        const res = await fetch(`${API_BASE}/api/purchases/upload`, {
          ...FETCH_OPTS,
          method: 'POST',
          body:   JSON.stringify({ deptId, rows: cleanRows }),
        });
        if (!res.ok) throw new Error('엑셀 업로드 반영 실패');
      }

      const res = await fetch(`${API_BASE}/api/purchases/exclude`, {
        ...FETCH_OPTS,
        method: 'PUT',
        body:   JSON.stringify({ deptId, excludeIds: [...excludedSet] }),
      });
      if (!res.ok) throw new Error('저장 실패');

      setPendingManualRows([]);
      setPendingExcelRows([]);
      onRefresh?.();
      showToast('저장되었습니다');
    } catch (e) {
      alert('저장 중 오류가 발생했습니다.');
      console.error(e);
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key !== key)          return { key, direction: 'asc' };
      if (prev.direction === 'asc')  return { key, direction: 'desc' };
      if (prev.direction === 'desc') return { key: null, direction: null };
      return { key, direction: 'asc' };
    });
  };

  // ── 집계 / 정렬 ──────────────────────────────────────────────────────────────

  const total = rows.reduce((s, r) => s + (Number(r['물품금액']) || 0), 0);
  const excludedTotal = rows
    .filter(r => excludedSet.has(r.__source === 'raw' ? r.__결의번호 : r.__id))
    .reduce((s, r) => s + (Number(r['물품금액']) || 0), 0);

  const pendingCount = pendingManualRows.length + pendingExcelRows.length;
  const pendingTotal = [...pendingManualRows, ...pendingExcelRows]
    .reduce((s, r) => s + (Number(r['물품금액']) || 0), 0);

  const isDirty = useMemo(() => {
    if (pendingCount > 0) return true;
    if (excludedSet.size !== excludedSetProp.size) return true;
    for (const id of excludedSet) if (!excludedSetProp.has(id)) return true;
    return false;
  }, [excludedSet, excludedSetProp, pendingCount]);

  // 아직 저장 전인 대기 행들을 화면 목록에 같이 보여준다 (서버 rows + 로컬 pending)
  const displayRows = useMemo(() => {
    const pendingManualDisplay = pendingManualRows.map((r, i) => ({
      ...r, __source: 'pending-manual', __pendingIndex: i, __pendingKey: `pm-${i}`,
    }));
    const pendingExcelDisplay = pendingExcelRows.map((r, i) => ({
      ...r, __source: 'pending-excel', __pendingIndex: i, __pendingKey: `pe-${i}`,
    }));
    return [...rows, ...pendingManualDisplay, ...pendingExcelDisplay];
  }, [rows, pendingManualRows, pendingExcelRows]);

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return displayRows;
    return [...displayRows].sort((a, b) => {
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
  }, [displayRows, sortConfig]);

  const tableMaxH = panelMode === 'idle' ? 'calc(100vh - 310px)' : 'calc(100vh - 530px)';

  return (
    <div>
      <Toast message={toast} />

      {/* 상단 고정 패널 */}
      <div style={P.stickyTop}>
        <div style={P.header}>
          <div>
            <div style={P.pageTitle}>구매 실적 등록</div>
            <div style={P.pageSub}>
              전체 {rows.length.toLocaleString()}건 · <AmountText value={total} scale={1} />
              {excludedSet.size > 0 && (
                <span style={P.excludeBadge}>모수 제외 {excludedSet.size}건 (<AmountText value={excludedTotal} />)</span>
              )}
              {pendingCount > 0 && (
                <span style={P.pendingBadge}>대기 중 {pendingCount.toLocaleString()}건 (<AmountText value={pendingTotal} scale={1} />)</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={P.resetBtn}   onClick={handleReset}>초기화</button>
            <button style={P.addBtn}     onClick={() => setShowUploadModal(true)}>데이터 업데이트</button>
            <button style={P.addBtn}     onClick={handleOpenAdd}>+ 행 추가</button>
            <button style={P.refreshBtn} onClick={() => { onRefresh?.(); showToast('조회되었습니다'); }}>조회</button>
            <button style={P.saveBtn}    onClick={handleSave}>{isDirty ? '저장 *' : '저장'}</button>
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
          onDelete={handlePanelDelete}
        />

        <div style={P.legend}>
          <span><span style={{ ...P.dot, background: '#EFF6FF', border: '1px solid #93c5fd' }} />선택된 행</span>
          <span><span style={{ ...P.dot, background: '#fff2f0', border: '1px solid #ffa39e' }} />모수 제외된 행</span>
          <span><span style={{ ...P.dot, background: '#FFFBEB', border: '1px solid #fbbf24' }} />대기 중(미저장) 행</span>
        </div>
      </div>

      {showUploadModal && (
        <div style={P.modalOverlay} onClick={() => setShowUploadModal(false)}>
          <div style={P.modalCard} onClick={e => e.stopPropagation()}>
            <div style={P.modalHeader}>
              <span style={P.modalTitle}>엑셀 데이터 업로드</span>
              <button onClick={() => setShowUploadModal(false)} style={P.modalClose}>✕</button>
            </div>
            <div style={P.modalBody}>
              <FileUpload deptId={deptId} onParsed={handleExcelParsed} />
              <div style={P.modalHint}>확인 후 "저장"을 눌러야 실제로 반영됩니다.</div>
            </div>
          </div>
        </div>
      )}

      {/* 테이블 */}
      <div style={P.tableCard}>
        <div ref={tableWrapRef} style={{ overflowX: 'hidden', overflowY: 'auto', maxHeight: tableMaxH }}>
          <table style={P.table}>
            <colgroup>
              <col style={{ width: `${colWidths.__exclude}%` }} />
              <col style={{ width: `${colWidths.__seq}%` }} />
              {TABLE_COLS.map(c => <col key={c.key} style={{ width: `${colWidths[c.key]}%` }} />)}
              <col style={{ width: `${colWidths.__type}%` }} />
            </colgroup>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr style={{ background: '#F9FAFB' }}>
                <th style={{ ...P.th, textAlign: 'center' }}>모수 제외</th>
                <th style={{ ...P.th, textAlign: 'center' }}>순번</th>
                {TABLE_COLS.map(c => {
                  const sortable  = SORTABLE_KEYS.has(c.key);
                  const active    = sortConfig.key === c.key;
                  const resizable = c.resizable !== false;
                  return (
                    <th
                      key={c.key}
                      style={{ ...P.th, textAlign: c.align, cursor: sortable ? 'pointer' : 'default', userSelect: 'none', position: resizable ? 'relative' : undefined }}
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
                      {resizable && <ResizeHandle colKey={c.key} onResizeStart={handleResizeStart} />}
                    </th>
                  );
                })}
                <th style={{ ...P.th, textAlign: 'center' }}>구분</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 && (
                <tr>
                  <td colSpan={TABLE_COLS.length + 3} style={{ ...P.td, textAlign: 'center', color: '#aaa', padding: '40px 0' }}>
                    데이터가 없습니다.
                  </td>
                </tr>
              )}
              {sortedRows.map((row, i) => (
                <TableRow
                  key={row.__결의번호 ?? row.__pendingKey ?? `manual-${row.__id ?? i}`}
                  row={row}
                  index={i}
                  excluded={excludedSet.has(row.__source === 'raw' ? row.__결의번호 : row.__id)}
                  isSelected={
                    selectedRow != null && (
                      (row.__id != null          && row.__id          === selectedRow.__id) ||
                      (row.__결의번호 != null     && row.__결의번호    === selectedRow.__결의번호) ||
                      (row.__pendingKey != null   && row.__pendingKey  === selectedRow.__pendingKey)
                    )
                  }
                  onRowClick={handleRowClick}
                  onToggleExclude={toggleExclude}
                />
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f5f5f5', fontWeight: 700 }}>
                <td style={{ ...P.td, textAlign: 'center' }} colSpan={TABLE_COLS.length + 1}>합계</td>
                <td style={{ ...P.td, textAlign: 'right', color: '#1677ff' }}><AmountText value={total} /></td>
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
  resetBtn:     { padding: '9px 14px', background: 'transparent', color: '#8B95A1', border: '1px solid #E5E8EB', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  addBtn:       { padding: '9px 18px', background: '#3182F6', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  saveBtn:      { padding: '9px 18px', background: '#00B493', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  refreshBtn:   { padding: '9px 18px', background: '#FFFFFF', color: '#3182F6', border: '1px solid #3182F6', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  legend:       { display: 'flex', gap: 16, alignItems: 'center', marginBottom: 10, fontSize: 12, color: '#8B95A1' },
  dot:          { display: 'inline-block', width: 12, height: 12, borderRadius: 3, marginRight: 4 },
  tableCard:    { background: '#FFFFFF', borderRadius: 16, border: '1px solid #F2F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' },
  table:        { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 13 },
  th:           { padding: '11px 12px', fontWeight: 600, color: '#8B95A1', borderBottom: '1px solid #F2F4F6', textAlign: 'left', whiteSpace: 'nowrap', background: '#F9FAFB', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' },
  td:           { padding: '10px 12px', borderBottom: '1px solid #F2F4F6', whiteSpace: 'nowrap', color: '#191F28' },
  resizeHandle: { position: 'absolute', top: 0, right: -3, width: 6, height: '100%', cursor: 'col-resize', zIndex: 3, touchAction: 'none' },
  badgeGray:    { display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: '#F2F4F6', color: '#8B95A1' },
  badgeBlue:    { display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: '#EBF3FE', color: '#3182F6' },
  badgeYellow:  { display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: '#FEF3C7', color: '#B45309' },
  pendingBadge: { marginLeft: 10, background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 600 },

  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalCard:    { background: '#fff', borderRadius: 16, width: 560, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden' },
  modalHeader:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #F2F4F6' },
  modalTitle:   { fontSize: 16, fontWeight: 700, color: '#191F28' },
  modalClose:   { background: 'none', border: 'none', fontSize: 18, color: '#8B95A1', cursor: 'pointer', lineHeight: 1, padding: '2px 6px' },
  modalBody:    { padding: '24px' },
  modalHint:    { marginTop: 14, fontSize: 12, color: '#8B95A1', lineHeight: 1.5 },
};

const F = {
  card:      { background: '#FFFFFF', borderRadius: 14, padding: '14px 18px', marginBottom: 10, border: '1px solid #EBF3FE', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  cardAdd:   { border: '2px solid #faad14' },
  idlePanel: { padding: '14px 18px', border: '1.5px dashed #E2E8F0', borderRadius: 12, textAlign: 'center', color: '#94a3b8', fontSize: 13, marginBottom: 10 },
  title:     { fontSize: 14, fontWeight: 700, color: '#191F28' },
  titleAdd:  { color: '#faad14' },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px 14px', marginBottom: 10 },
  field:     { display: 'flex', flexDirection: 'column', gap: 3 },
  label:     { fontSize: 12, fontWeight: 600, color: '#8B95A1' },
  input:     { padding: '8px 10px', border: '1px solid #F2F4F6', borderRadius: 8, fontSize: 13, outline: 'none', background: '#F9FAFB', color: '#191F28' },
  flagTitle: { fontSize: 12, fontWeight: 600, color: '#8B95A1', marginBottom: 6 },
  flagGrid:  { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px 4px', marginBottom: 10 },
  flagItem:  { fontSize: 12, color: '#191F28', display: 'flex', alignItems: 'center', cursor: 'pointer' },
  actions:   { display: 'flex', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { padding: '7px 16px', background: '#FFFFFF', border: '1px solid #F2F4F6', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#8B95A1' },
  deleteBtn: { padding: '7px 16px', background: '#FFF0F1', border: '1px solid #FFCDD0', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#F04452', fontWeight: 600 },
  saveBtn:   { padding: '7px 20px', background: '#3182F6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  closeBtnX: { padding: '4px 9px', border: 'none', background: '#F2F4F6', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#8B95A1', lineHeight: 1 },
};
