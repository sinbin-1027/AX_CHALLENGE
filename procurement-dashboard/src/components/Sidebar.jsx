import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const NAV = [
  {
    key: 'dashboard',
    icon: '🏠',
    label: '종합현황',
    path: '/',
  },
  {
    key: 'budget',
    icon: '📊',
    label: '예산관리',
    children: [
      { key: 'budget-alloc',  label: '예산 배정 현황', path: '/budget/allocation' },
      { key: 'budget-exec',   label: '예산 집행 현황', path: '/budget/execution'  },
      { key: 'budget-trend',  label: '집행 추이 분석', path: '/budget/trend'      },
    ],
  },
  {
    key: 'procurement',
    icon: '📋',
    label: '공공구매 관리',
    children: [
      { key: 'proc-indicators', label: '지표 현황',           path: '/procurement/indicators' },
      { key: 'proc-details',    label: '지표별 실적 상세',     path: '/procurement/details'    },
      { key: 'proc-register',   label: '실적 등록(수기등록)', path: '/procurement/register'   },
      { key: 'proc-simulation', label: '공공구매 시뮬레이션', path: '/procurement/simulation' },
      { key: 'proc-vendors',    label: '인증 보유 업체 검색', path: '/procurement/vendors'    },
    ],
  },
  {
    key: 'regulations',
    icon: '📖',
    label: '규정/가이드',
    path: '/regulations',
  },
  {
    key: 'data',
    icon: '🗂️',
    label: '데이터 관리',
    children: [
      { key: 'data-uploads',  label: '업로드 기록',       path: '/data/uploads'  },
      { key: 'data-vendors',  label: '인증 보유 업체 관리', path: '/data/vendors'  },
    ],
  },
];

function getActiveParentKey(pathname) {
  const parent = NAV.find(item => item.children?.some(c => c.path === pathname));
  return parent?.key ?? null;
}

export default function Sidebar() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState(() => {
    const k = getActiveParentKey(pathname);
    return k ? new Set([k]) : new Set();
  });

  // 페이지 이동 시 해당 상위 메뉴 자동 오픈
  useEffect(() => {
    const k = getActiveParentKey(pathname);
    if (k) setOpenKeys(prev => new Set([...prev, k]));
  }, [pathname]);

  const toggle = key => {
    if (collapsed) return;
    setOpenKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const isChildActive = item => item.children?.some(c => c.path === pathname);

  return (
    <div style={{ ...S.sidebar, width: collapsed ? 60 : 230 }}>

      {/* 로고 */}
      <div style={S.logo}>
        <span style={S.logoIcon}>🏛</span>
        {!collapsed && <span style={S.logoText}>KOSME 예산 관리 시스템</span>}
      </div>

      {/* 네비게이션 */}
      <nav style={S.nav}>
        {NAV.map(item => {
          if (!item.children) {
            const active = pathname === item.path;
            return (
              <Link key={item.key} to={item.path} style={{ textDecoration: 'none' }}>
                <div style={{ ...S.item, ...(active ? S.itemActive : {}) }} title={collapsed ? item.label : ''}>
                  <span style={S.icon}>{item.icon}</span>
                  {!collapsed && <span style={S.itemLabel}>{item.label}</span>}
                </div>
              </Link>
            );
          }

          const parentActive = isChildActive(item);
          const isOpen = openKeys.has(item.key);

          return (
            <div key={item.key}>
              <div
                style={{ ...S.item, ...(parentActive && !isOpen ? S.itemParentActive : {}) }}
                onClick={() => toggle(item.key)}
                title={collapsed ? item.label : ''}
              >
                <span style={S.icon}>{item.icon}</span>
                {!collapsed && (
                  <>
                    <span style={S.itemLabel}>{item.label}</span>
                    <span style={S.arrow}>{isOpen ? '▲' : '▼'}</span>
                  </>
                )}
              </div>

              {!collapsed && isOpen && (
                <div style={S.subMenu}>
                  {item.children.map(child => {
                    const active = pathname === child.path;
                    return (
                      <Link key={child.key} to={child.path} style={{ textDecoration: 'none' }}>
                        <div style={{ ...S.subItem, ...(active ? S.subItemActive : {}) }}>
                          <span style={S.subDot} />
                          {child.label}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* 접기 버튼 */}
      <div style={S.collapseBtn} onClick={() => setCollapsed(c => !c)}>
        <span style={{ fontSize: 14 }}>{collapsed ? '→' : '←'}</span>
        {!collapsed && <span style={S.collapseBtnLabel}>메뉴 접기</span>}
      </div>
    </div>
  );
}

const S = {
  sidebar: {
    background: '#1B2B4B',
    minHeight: '100vh',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    transition: 'width 0.22s cubic-bezier(.4,0,.2,1)',
    overflow: 'hidden',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '20px 14px 18px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    minHeight: 64,
  },
  logoIcon: { fontSize: 20, flexShrink: 0 },
  logoText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    letterSpacing: '-0.2px',
  },
  nav: {
    flex: 1,
    padding: '10px 8px',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 2,
    transition: 'background 0.12s',
    minHeight: 38,
  },
  itemActive:       { background: '#3182F6', color: '#fff' },
  itemParentActive: { color: '#fff' },
  icon:      { fontSize: 15, flexShrink: 0, width: 20, textAlign: 'center' },
  itemLabel: { fontSize: 13, fontWeight: 500, flex: 1, whiteSpace: 'nowrap' },
  arrow:     { fontSize: 9, color: 'rgba(255,255,255,0.35)', flexShrink: 0 },
  subMenu:   { paddingLeft: 4, marginBottom: 4 },
  subItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 10px 7px 30px',
    borderRadius: 6,
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginBottom: 1,
    transition: 'background 0.12s, color 0.12s',
    whiteSpace: 'nowrap',
  },
  subItemActive: { background: '#3182F6', color: '#fff' },
  subDot: {
    width: 4, height: 4, borderRadius: '50%',
    background: 'currentColor', flexShrink: 0,
  },
  collapseBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 14px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    transition: 'color 0.12s',
    flexShrink: 0,
  },
  collapseBtnLabel: { whiteSpace: 'nowrap', fontSize: 12 },
};
