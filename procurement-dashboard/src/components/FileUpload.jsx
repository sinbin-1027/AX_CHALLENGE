import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';

const API_BASE = process.env.REACT_APP_API_URL ?? '';

const SHEET_NAME = 'RAW';
const EXCLUDED_BUDGET_KEYWORDS = ['업무추진비', '부운영비', '기타운영비', '특근매식비'];

// onParsed가 주어지면 서버로 즉시 업로드하지 않고, 파싱 결과만 콜백으로 넘긴다
// (호출부가 "저장" 시점까지 대기(pending) 상태로 들고 있다가 나중에 반영하는 흐름에 씀).
// onParsed가 없으면 기존처럼 파싱 즉시 /api/purchases/upload로 서버 반영한다.
export default function FileUpload({ deptId, onDataLoad, onParsed }) {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus]     = useState('idle'); // idle | parsing | uploading | done | error
  const [fileInfo, setFileInfo] = useState(null);
  const [error, setError]       = useState(null);
  const inputRef = useRef(null);

  const processFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.xlsx')) {
      setError('.xlsx 파일만 업로드할 수 있습니다.');
      return;
    }

    setStatus('parsing');
    setError(null);
    setFileInfo(null);

    // 1. 엑셀 파싱
    const rows = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          // 'RAW'라는 이름의 시트가 있으면 그걸 우선 쓰고, 없으면 시트명과 무관하게 첫 번째 시트를 읽는다.
          const rawSheetName = wb.SheetNames.find(n => n.trim().toUpperCase() === SHEET_NAME);
          const targetName   = rawSheetName ?? wb.SheetNames[0];
          const ws           = wb.Sheets[targetName];
          if (!ws) {
            throw new Error('엑셀 파일에 읽을 수 있는 시트가 없습니다.');
          }
          const parsed = XLSX.utils.sheet_to_json(ws, { defval: '' });
          const withFlag = parsed.map(r => ({ ...r, '집행구분': 'Y' }));
          const excludedByKeyword = {};
          const filtered = withFlag.filter(row => {
            const 예산명 = String(row['예산명'] ?? '');
            const matched = EXCLUDED_BUDGET_KEYWORDS.find(k => 예산명.includes(k));
            if (!matched) return true;
            excludedByKeyword[matched] = (excludedByKeyword[matched] ?? 0) + 1;
            return false;
          });
          filtered._excluded          = withFlag.length - filtered.length;
          filtered._excludedByKeyword = excludedByKeyword;
          resolve(filtered);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
      reader.readAsArrayBuffer(file);
    }).catch((err) => { setError(err.message); setStatus('error'); return null; });

    if (!rows) return;

    const excluded          = rows._excluded ?? 0;
    const excludedByKeyword = rows._excludedByKeyword ?? {};
    const total             = rows.length + excluded;

    // onParsed 모드: 서버에 아무것도 반영하지 않고 파싱 결과만 넘긴다 (대기 상태로 보관)
    if (onParsed) {
      setFileInfo({ name: file.name, total, excluded, excludedByKeyword, count: rows.length });
      setStatus('done');
      onParsed(rows, { name: file.name, total, excluded, excludedByKeyword, count: rows.length });
      return;
    }

    // 2. 서버 업로드 (기존 방식: 파싱 즉시 반영)
    setStatus('uploading');
    try {
      const res = await fetch(`${API_BASE}/api/purchases/upload`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body:    JSON.stringify({ deptId, rows }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? '업로드 실패');
      }
      const result = await res.json();
      setFileInfo({ name: file.name, total, excluded, excludedByKeyword, count: rows.length, added: result.added, skipped: result.skipped });
      setStatus('done');
      onDataLoad(result);
    } catch (err) {
      setError(err.message || '업로드 중 오류가 발생했습니다.');
      setStatus('error');
    }
  }, [deptId, onDataLoad, onParsed]);

  const handleDrop     = useCallback((e) => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); }, [processFile]);
  const handleDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = ()  => setDragging(false);
  const handleChange    = (e) => processFile(e.target.files[0]);
  const handleClick     = ()  => inputRef.current?.click();

  const loading = status === 'parsing' || status === 'uploading';

  return (
    <div style={styles.wrapper}>
      <div
        style={{ ...styles.dropzone, ...(dragging ? styles.dropzoneDragging : {}) }}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input ref={inputRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={handleChange} />

        {loading ? (
          <div style={styles.status}>
            <span style={styles.spinner} />
            <span>{status === 'parsing' ? '파일 분석 중…' : '서버에 업로드 중…'}</span>
          </div>
        ) : fileInfo ? (
          <div style={styles.status}>
            <span style={styles.iconDone}>✓</span>
            <div>
              <div style={styles.fileName}>{fileInfo.name}</div>
              <div style={styles.rowCount}>
                {fileInfo.added != null
                  ? `${fileInfo.count.toLocaleString('ko-KR')}행 파싱 → 신규 ${fileInfo.added.toLocaleString('ko-KR')}건 저장 (중복 ${fileInfo.skipped.toLocaleString('ko-KR')}건 제외)`
                  : fileInfo.excluded > 0
                    ? `총 ${fileInfo.total.toLocaleString('ko-KR')}개 중 ${fileInfo.excluded.toLocaleString('ko-KR')}개 제외 → ${fileInfo.count.toLocaleString('ko-KR')}개 로드 완료`
                    : `총 ${fileInfo.count.toLocaleString('ko-KR')}개 행 로드 완료`}
              </div>
              {fileInfo.excluded > 0 && fileInfo.excludedByKeyword && (
                <div style={styles.excludeReason}>
                  {Object.entries(fileInfo.excludedByKeyword)
                    .map(([keyword, count]) => `'${keyword}'(${count.toLocaleString('ko-KR')}건)`)
                    .join(', ')} 포함 항목은 실적에서 자동 제외됩니다
                </div>
              )}
            </div>
            <span style={styles.reupload}>다시 업로드</span>
          </div>
        ) : (
          <div style={styles.status}>
            <div>
              <div style={styles.hint}>엑셀 파일을 여기에 끌어다 놓거나 클릭하여 업로드</div>
              <div style={styles.sub}>.xlsx · 시트명 무관 (RAW 시트가 있으면 우선 사용)</div>
            </div>
          </div>
        )}
      </div>

      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}

const styles = {
  wrapper:          { width: '100%' },
  dropzone:         { border: '2px dashed #cbd5e1', borderRadius: 12, padding: '32px 24px', cursor: 'pointer', background: '#f8fafc', transition: 'border-color 0.15s, background 0.15s', userSelect: 'none' },
  dropzoneDragging: { borderColor: '#3b82f6', background: '#eff6ff' },
  status:           { display: 'flex', alignItems: 'center', gap: 16 },
  iconDone:         { fontSize: 28, color: '#22c55e', fontWeight: 700 },
  hint:             { fontSize: 15, color: '#334155', fontWeight: 500 },
  sub:              { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  fileName:         { fontSize: 15, fontWeight: 600, color: '#1e293b' },
  rowCount:         { fontSize: 13, color: '#64748b', marginTop: 4 },
  excludeReason:    { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 },
  reupload:         { marginLeft: 'auto', fontSize: 13, color: '#3b82f6', textDecoration: 'underline' },
  error:            { marginTop: 8, padding: '10px 14px', borderRadius: 8, background: '#fef2f2', color: '#ef4444', fontSize: 13 },
  spinner:          { display: 'inline-block', width: 24, height: 24, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
};
