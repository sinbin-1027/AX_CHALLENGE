import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';

const API_BASE = process.env.REACT_APP_API_URL ?? '';

const SHEET_NAME = 'RAW';
const EXCLUDED_BUDGET_KEYWORDS = ['업무추진비', '부운영비', '기타운영비', '특근매식비'];

export default function FileUpload({ deptId, onDataLoad }) {
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
          const ws = wb.Sheets[SHEET_NAME];
          if (!ws) {
            const available = wb.SheetNames.join(', ');
            throw new Error(`'${SHEET_NAME}' 시트를 찾을 수 없습니다. (파일 내 시트: ${available})`);
          }
          const parsed = XLSX.utils.sheet_to_json(ws, { defval: '' });
          const withFlag = parsed.map(r => ({ ...r, '집행구분': 'Y' }));
          const filtered = withFlag.filter(row => {
            const 예산명 = String(row['예산명'] ?? '');
            return !EXCLUDED_BUDGET_KEYWORDS.some(k => 예산명.includes(k));
          });
          filtered._excluded = withFlag.length - filtered.length;
          resolve(filtered);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
      reader.readAsArrayBuffer(file);
    }).catch((err) => { setError(err.message); setStatus('error'); return null; });

    if (!rows) return;

    const excluded = rows._excluded ?? 0;
    const total    = rows.length + excluded;

    // 2. 서버 업로드
    setStatus('uploading');
    try {
      const res = await fetch(`${API_BASE}/api/purchases/upload`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ deptId, rows }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? '업로드 실패');
      }
      const result = await res.json();
      setFileInfo({ name: file.name, total, excluded, count: rows.length, added: result.added, skipped: result.skipped });
      setStatus('done');
      onDataLoad(result);
    } catch (err) {
      setError(err.message || '업로드 중 오류가 발생했습니다.');
      setStatus('error');
    }
  }, [deptId, onDataLoad]);

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
            </div>
            <span style={styles.reupload}>다시 업로드</span>
          </div>
        ) : (
          <div style={styles.status}>
            <span style={styles.iconUpload}>📂</span>
            <div>
              <div style={styles.hint}>엑셀 파일을 여기에 끌어다 놓거나 클릭하여 업로드</div>
              <div style={styles.sub}>.xlsx · RAW 시트</div>
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
  iconUpload:       { fontSize: 32 },
  iconDone:         { fontSize: 28, color: '#22c55e', fontWeight: 700 },
  hint:             { fontSize: 15, color: '#334155', fontWeight: 500 },
  sub:              { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  fileName:         { fontSize: 15, fontWeight: 600, color: '#1e293b' },
  rowCount:         { fontSize: 13, color: '#64748b', marginTop: 4 },
  reupload:         { marginLeft: 'auto', fontSize: 13, color: '#3b82f6', textDecoration: 'underline' },
  error:            { marginTop: 8, padding: '10px 14px', borderRadius: 8, background: '#fef2f2', color: '#ef4444', fontSize: 13 },
  spinner:          { display: 'inline-block', width: 24, height: 24, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
};
