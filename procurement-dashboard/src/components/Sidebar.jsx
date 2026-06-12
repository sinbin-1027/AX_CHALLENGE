import { Link, useLocation } from 'react-router-dom';

const NAV = [
  { path: '/',             icon: '📊', label: '대시보드'  },
  { path: '/details',      icon: '📋', label: '지출 내역' },
  { path: '/vendors',      icon: '🏢', label: '업체 추천' },
  { path: '/vendor-list',  icon: '🗂️', label: '업체 관리' },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <div style={S.sidebar}>
      <div style={S.logo}>
        <span style={S.logoIcon}>🏛</span>
        <span style={S.logoText}>공공구매</span>
      </div>

      <nav style={S.nav}>
        {NAV.map(({ path, icon, label }) => {
          const active = pathname === path;
          return (
            <Link key={path} to={path} style={{ textDecoration: 'none' }}>
              <div style={{ ...S.item, ...(active ? S.itemActive : {}) }}>
                <span style={S.icon}>{icon}</span>
                <span style={{ ...S.label, ...(active ? S.labelActive : {}) }}>{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

const S = {
  sidebar: {
    width: 220,
    minHeight: '100vh',
    background: '#fff',
    borderRight: '1px solid #e8e8e8',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '20px 20px 16px',
    borderBottom: '1px solid #f0f0f0',
  },
  logoIcon: { fontSize: 22 },
  logoText: { fontSize: 16, fontWeight: 800, color: '#1e293b' },
  nav:  { padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  itemActive:  { background: '#eff6ff' },
  icon:        { fontSize: 17 },
  label:       { fontSize: 14, fontWeight: 500, color: '#64748b' },
  labelActive: { color: '#1677ff', fontWeight: 600 },
};
