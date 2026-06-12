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
    background: '#FFFFFF',
    borderRight: '1px solid #F2F4F6',
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
    padding: '24px 20px 20px',
    borderBottom: '1px solid #F2F4F6',
  },
  logoIcon: { fontSize: 22 },
  logoText: { fontSize: 16, fontWeight: 800, color: '#191F28', letterSpacing: '-0.3px' },
  nav:  { padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 14px',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'background 0.12s',
  },
  itemActive:  { background: '#EBF3FE' },
  icon:        { fontSize: 16 },
  label:       { fontSize: 14, fontWeight: 500, color: '#8B95A1' },
  labelActive: { color: '#3182F6', fontWeight: 600 },
};
