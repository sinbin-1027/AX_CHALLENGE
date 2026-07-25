import { useEffect, useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '';

function formatDateTime(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function UploadHistoryPage({ deptId }) {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!deptId) return;
    setLoading(true);
    setError('');

    fetch(`${API_BASE}/api/uploads/history?deptId=${deptId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => {
        if (!res.ok) throw new Error('요청 실패');
        return res.json();
      })
      .then(data => setRows(data))
      .catch(() => setError('업로드 기록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [deptId]);

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.cardTitle}>업로드 기록</div>

        {loading ? (
          <div style={S.centerMsg}>불러오는 중…</div>
        ) : error ? (
          <div style={{ ...S.centerMsg, color: '#F04452' }}>{error}</div>
        ) : rows.length === 0 ? (
          <div style={S.centerMsg}>업로드 기록이 없습니다</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: 72, textAlign: 'center' }}>순번</th>
                <th style={S.th}>내용</th>
                <th style={{ ...S.th, width: 200 }}>일시</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ ...S.td, textAlign: 'center', color: '#8B95A1' }}>{i + 1}</td>
                  <td style={S.td}>{r.description}</td>
                  <td style={S.td}>{formatDateTime(r.uploadedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const S = {
  page: { fontFamily: "-apple-system, 'Pretendard', 'Apple SD Gothic Neo', sans-serif" },

  card: { background: '#FFFFFF', borderRadius: 16, border: '1px solid #F2F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#191F28', letterSpacing: '-0.2px', padding: '20px 24px', borderBottom: '1px solid #F2F4F6' },

  centerMsg: { padding: '80px 0', textAlign: 'center', color: '#8B95A1', fontSize: 14 },

  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: '12px 16px', fontWeight: 600, color: '#8B95A1', fontSize: 12,
    borderBottom: '1px solid #F2F4F6', textAlign: 'left', background: '#F9FAFB', whiteSpace: 'nowrap',
  },
  td: { padding: '12px 16px', borderBottom: '1px solid #F2F4F6', color: '#191F28', whiteSpace: 'nowrap' },
};
