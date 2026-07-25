import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || '';

function formatDateTime(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatFileSize(bytes) {
  if (bytes == null) return '-';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

// ── 파일 업로드 모달 ──────────────────────────────────────────────────────────
function UploadModal({ onClose, onUploaded }) {
  const [title,       setTitle]       = useState('');
  const [file,        setFile]        = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');

  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (!file)          { setError('파일을 선택해주세요.'); return; }

    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/api/guides`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body:    formData,
      });
      if (!res.ok) throw new Error('업로드 실패');
      onUploaded();
    } catch {
      setError('업로드 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={M.overlay} onClick={onClose}>
      <div style={M.panel} onClick={e => e.stopPropagation()}>
        <div style={M.header}>
          <div style={M.headerTitle}>파일 업로드</div>
          <button style={M.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={M.body}>
          <div style={M.field}>
            <label style={M.label}>제목</label>
            <input
              style={M.input}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              autoFocus
            />
          </div>
          <div style={M.field}>
            <label style={M.label}>파일</label>
            <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
          {error && <div style={M.error}>{error}</div>}
        </div>

        <div style={M.footer}>
          <button style={M.cancelBtn} onClick={onClose}>취소</button>
          <button style={M.submitBtn} onClick={handleSubmit} disabled={submitting}>
            {submitting ? '업로드 중…' : '업로드'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function GuideListPage() {
  const navigate = useNavigate();
  const [rows,       setRows]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const fetchList = () => {
    setLoading(true);
    setError('');
    fetch(`${API_BASE}/api/guides`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => {
        if (!res.ok) throw new Error('요청 실패');
        return res.json();
      })
      .then(setRows)
      .catch(() => setError('목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchList(); }, []);

  return (
    <div style={S.page}>

      <div style={S.headerRow}>
        <div style={S.pageTitle}>규정/가이드</div>
        <button style={S.uploadBtn} onClick={() => setShowUpload(true)}>파일 업로드</button>
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); fetchList(); }}
        />
      )}

      <div style={S.card}>
        {loading ? (
          <div style={S.centerMsg}>불러오는 중…</div>
        ) : error ? (
          <div style={{ ...S.centerMsg, color: '#F04452' }}>{error}</div>
        ) : rows.length === 0 ? (
          <div style={S.centerMsg}>등록된 자료가 없습니다</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>제목</th>
                <th style={{ ...S.th, width: 200 }}>업로드일시</th>
                <th style={{ ...S.th, width: 120, textAlign: 'right' }}>파일크기</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  style={{ ...S.row, background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                  onClick={() => navigate(`/regulations/${r.id}`)}
                >
                  <td style={S.td}>{r.title}</td>
                  <td style={S.td}>{formatDateTime(r.uploadedAt)}</td>
                  <td style={{ ...S.td, textAlign: 'right', color: '#8B95A1' }}>{formatFileSize(r.fileSize)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}

// ── 스타일 ───────────────────────────────────────────────────────────────────
const S = {
  page: { fontFamily: "-apple-system, 'Pretendard', 'Apple SD Gothic Neo', sans-serif" },

  headerRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pageTitle:  { fontSize: 18, fontWeight: 800, color: '#191F28', letterSpacing: '-0.4px' },
  uploadBtn:  { padding: '9px 18px', background: '#3182F6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },

  card: { background: '#FFFFFF', borderRadius: 16, border: '1px solid #F2F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' },

  centerMsg: { padding: '80px 0', textAlign: 'center', color: '#8B95A1', fontSize: 14 },

  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: '12px 16px', fontWeight: 600, color: '#8B95A1', fontSize: 12,
    borderBottom: '1px solid #F2F4F6', textAlign: 'left', background: '#F9FAFB', whiteSpace: 'nowrap',
  },
  td: { padding: '12px 16px', borderBottom: '1px solid #F2F4F6', color: '#191F28', whiteSpace: 'nowrap' },
  row: { cursor: 'pointer' },
};

// ── 모달 스타일 ───────────────────────────────────────────────────────────────
const M = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  panel:   { background: '#fff', borderRadius: 16, width: 420, maxWidth: '90vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' },
  header:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #F2F4F6', flexShrink: 0 },
  headerTitle: { fontSize: 16, fontWeight: 700, color: '#191F28' },
  closeBtn: { background: 'none', border: 'none', fontSize: 18, color: '#8B95A1', cursor: 'pointer', padding: '2px 6px', borderRadius: 8 },

  body:  { padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: { fontSize: 13, fontWeight: 600, color: '#191F28' },
  input: { padding: '10px 12px', border: '1.5px solid #E5E8EB', borderRadius: 8, fontSize: 14, outline: 'none', color: '#191F28' },
  error: { fontSize: 13, color: '#F04452', fontWeight: 500 },

  footer:    { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 22px', borderTop: '1px solid #F2F4F6' },
  cancelBtn: { padding: '9px 16px', background: '#fff', color: '#8B95A1', border: '1px solid #E5E8EB', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  submitBtn: { padding: '9px 16px', background: '#3182F6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
