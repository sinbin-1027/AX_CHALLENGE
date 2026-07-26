import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import kosmeLogo from '../assets/kosme_logo.png';

const NAV = [
  {
    key: 'dashboard',
    icon: '종',
    label: '종합현황',
    path: '/',
  },
  {
    key: 'budget',
    icon: '예',
    label: '예산관리',
    children: [
      { key: 'budget-alloc',  label: '예산 배정 현황', path: '/budget/allocation' },
      { key: 'budget-trend',  label: '집행 추이 분석', path: '/budget/trend'      },
    ],
  },
  {
    key: 'procurement',
    icon: '공',
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
    icon: '규',
    label: '규정/가이드',
    path: '/regulations',
  },
  {
    key: 'data',
    icon: '데',
    label: '데이터 관리',
    children: [
      { key: 'data-uploads',  label: '업로드 기록',       path: '/data/uploads'  },
      { key: 'data-vendors',  label: '인증 보유 업체 관리', path: '/data/vendors'  },
    ],
  },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [logoHover, setLogoHover] = useState(false);

  const isChildActive = item => item.children?.some(c => c.path === pathname);

  return (
    <div style={{ ...S.sidebar, width: collapsed ? 60 : 230 }}>

      {/* 로고 */}
      <Link to="/" style={{ textDecoration: 'none' }}>
        <div
          style={{ ...S.logo, ...(logoHover ? S.logoHover : {}) }}
          onMouseEnter={() => setLogoHover(true)}
          onMouseLeave={() => setLogoHover(false)}
        >
          <img src={kosmeLogo} alt="KOSME" style={collapsed ? S.logoImgCollapsed : S.logoImg} />
          {!collapsed && <span style={S.logoSubText}>예산관리시스템</span>}
        </div>
      </Link>

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

          return (
            <div key={item.key}>
              <div
                style={{ ...S.item, ...S.itemSection, ...(parentActive ? S.itemParentActive : {}) }}
                title={collapsed ? item.label : ''}
              >
                <span style={S.icon}>{item.icon}</span>
                {!collapsed && <span style={S.itemLabel}>{item.label}</span>}
              </div>

              {!collapsed && (
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
    background: '#013693',
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
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '20px 14px 18px',
    borderBottom: '1px solid rgba(255,255,255,0.12)',
    minHeight: 64,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  logoHover: { opacity: 0.85 },
  logoImg:          { width: '100%', maxWidth: 160, height: 'auto', display: 'block', margin: '0 auto' },
  logoImgCollapsed: { width: 32, height: 'auto', display: 'block', margin: '0 auto' },
  logoSubText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '0.2px',
    whiteSpace: 'nowrap',
    textAlign: 'center',
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
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
    transition: 'background 0.12s',
    minHeight: 38,
  },
  itemSection:      { cursor: 'default' },
  itemActive:       { background: 'rgba(255,255,255,0.16)', color: '#fff' },
  itemParentActive: { color: '#fff' },
  icon:      { fontSize: 13, fontWeight: 700, flexShrink: 0, width: 20, textAlign: 'center' },
  itemLabel: { fontSize: 13, fontWeight: 500, flex: 1, whiteSpace: 'nowrap' },
  subMenu:   { paddingLeft: 4, marginBottom: 4 },
  subItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 10px 7px 30px',
    borderRadius: 6,
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 1,
    transition: 'background 0.12s, color 0.12s',
    whiteSpace: 'nowrap',
  },
  subItemActive: { background: 'rgba(255,255,255,0.16)', color: '#fff' },
  subDot: {
    width: 4, height: 4, borderRadius: '50%',
    background: 'currentColor', flexShrink: 0,
  },
  collapseBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 14px',
    borderTop: '1px solid rgba(255,255,255,0.12)',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    transition: 'color 0.12s',
    flexShrink: 0,
  },
  collapseBtnLabel: { whiteSpace: 'nowrap', fontSize: 12 },
};
