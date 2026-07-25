import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || '';

function formatDateTime(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function GuideDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [guide,      setGuide]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);

  const downloadUrl = `${API_BASE}/api/guides/${id}/download`;
  const isPdf       = /\.pdf$/i.test(guide?.originalFilename ?? '');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`${API_BASE}/api/guides/${id}`, { headers: authHeaders() })
      .then(res => {
        if (!res.ok) throw new Error('요청 실패');
        return res.json();
      })
      .then(setGuide)
      .catch(() => setError('자료를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [id]);

  // PDF 미리보기: iframe의 src 요청은 인증 헤더를 실어보낼 수 없으므로
  // 인증된 fetch로 blob을 받아 objectURL로 변환해 렌더링한다.
  useEffect(() => {
    if (!isPdf) return;
    let objectUrl;
    fetch(downloadUrl, { headers: authHeaders() })
      .then(res => {
        if (!res.ok) throw new Error('미리보기 실패');
        return res.blob();
      })
      .then(blob => {
        objectUrl = window.URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch(() => setPreviewUrl(null));

    return () => { if (objectUrl) window.URL.revokeObjectURL(objectUrl); };
  }, [isPdf, downloadUrl]);

  const handleDownload = async () => {
    try {
      const res = await fetch(downloadUrl, { headers: authHeaders() });
      if (!res.ok) throw new Error('다운로드 실패');
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = guide?.originalFilename ?? 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('다운로드 중 오류가 발생했습니다.');
    }
  };

  if (loading) return <div style={S.centerMsg}>불러오는 중…</div>;
  if (error)   return <div style={{ ...S.centerMsg, color: '#F04452' }}>{error}</div>;
  if (!guide)  return null;

  return (
    <div style={S.page}>
      <button style={S.backBtn} onClick={() => navigate('/regulations')}>← 목록으로</button>

      <div style={S.card}>
        <div style={S.header}>
          <div>
            <div style={S.title}>{guide.title}</div>
            <div style={S.meta}>{formatDateTime(guide.uploadedAt)} · {guide.originalFilename}</div>
          </div>
          <button style={S.downloadBtn} onClick={handleDownload}>다운로드</button>
        </div>

        {isPdf ? (
          previewUrl ? (
            <iframe title={guide.title} src={previewUrl} style={S.previewFrame} />
          ) : (
            <div style={S.noPreview}>미리보기를 불러오는 중이거나 사용할 수 없습니다. 다운로드해서 확인해주세요.</div>
          )
        ) : (
          <div style={S.noPreview}>미리보기를 지원하지 않는 파일 형식입니다. 다운로드해서 확인해주세요.</div>
        )}
      </div>
    </div>
  );
}

// ── 스타일 ───────────────────────────────────────────────────────────────────
const S = {
  page: { fontFamily: "-apple-system, 'Pretendard', 'Apple SD Gothic Neo', sans-serif" },

  centerMsg: { padding: '80px 0', textAlign: 'center', color: '#8B95A1', fontSize: 14 },

  backBtn: { background: 'none', border: 'none', color: '#3182F6', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 14 },

  card: { background: '#FFFFFF', borderRadius: 16, border: '1px solid #F2F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px', borderBottom: '1px solid #F2F4F6' },
  title:  { fontSize: 17, fontWeight: 700, color: '#191F28', letterSpacing: '-0.3px' },
  meta:   { fontSize: 13, color: '#8B95A1', marginTop: 6 },

  downloadBtn: { padding: '9px 18px', background: '#3182F6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },

  previewFrame: { width: '100%', height: '75vh', border: 'none', display: 'block' },
  noPreview: { padding: '80px 24px', textAlign: 'center', color: '#8B95A1', fontSize: 14 },
};
