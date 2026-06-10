import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';

const SHEET_NAME = 'RAW';
const API_BASE   = 'http://localhost:4001';

export default function FileUpload({ onDataLoad }) {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus]     = useState('idle'); // idle | parsing | saving | done | error
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
          resolve(XLSX.utils.sheet_to_json(ws, { defval: '' }));
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
      reader.readAsArrayBuffer(file);
    }).catch((err) => { setError(err.message); setStatus('error'); return null; });

    if (!rows) return;

    // 2. 백엔드 저장
    setStatus('saving');
    const uploadedAt = new Date().toISOString();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/data/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ filename: file.name, rows }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? '서버 저장에 실패했습니다.');
      }
    } catch (err) {
      // 저장 실패해도 대시보드는 표시 (경고만)
      setError(`저장 실패: ${err.message}`);
    }

    setFileInfo({ name: file.name, count: rows.length });
    setStatus('done');
    onDataLoad(rows, { filename: file.name, uploadedAt });
  }, [onDataLoad]);

  const handleDrop     = useCallback((e) => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); }, [processFile]);
  const handleDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = ()  => setDragging(false);
  const handleChange    = (e) => processFile(e.target.files[0]);
  const handleClick     = ()  => inputRef.current?.click();

  const loading = status === 'parsing' || status === 'saving';

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
            <span>{status === 'parsing' ? '파일 분석 중...' : '서버에 저장 중...'}</span>
          </div>
        ) : fileInfo ? (
          <div style={styles.status}>
            <span style={styles.iconDone}>✓</span>
            <div>
              <div style={styles.fileName}>{fileInfo.name}</div>
              <div style={styles.rowCount}>총 {fileInfo.count.toLocaleString('ko-KR')}개 행 로드 완료</div>
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
