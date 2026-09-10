import { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  FileWarning,
  Home,
  LogOut,
  MapPinned,
  Menu,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  UserRoundCog,
  X,
} from 'lucide-react';
import BrandLogo from '../components/BrandLogo.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const navItems = [
  { to: '/', label: 'Inicio', icon: Home, permission: 'dashboard.read', end: true },
  { to: '/mapa', label: 'Mapa', icon: MapPinned, permission: 'map.read' },
  { to: '/guardias', label: 'Guardias', icon: Shield, permission: 'guards.read' },
  { to: '/servicios', label: 'Servicios', icon: ShieldCheck, permission: 'services.read' },
  { to: '/hechos', label: 'Hechos', icon: FileWarning, permission: 'incidents.manage', loose: true },
  { to: '/patrullas', label: 'Patrullas', icon: MapPinned, loose: true },
  { to: '/reportes', label: 'Reportes', icon: BarChart3, permission: 'reports.read' },
  { to: '/configuracion', label: 'Configuración', icon: Settings, permission: 'settings.manage' },
  { to: '/usuarios', label: 'Usuarios', icon: UserRoundCog, permission: 'users.manage' },
];

export default function AppShell() {
  const { user, can, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const guard = user?.guard;
  const displayName = guard ? `${guard.firstName} ${guard.lastName}` : user?.username || 'Usuario';
  const detail = guard ? `${guard.code} · ${guard.rank || 'Guardia'}` : user?.role || '';

  const visible = useMemo(
    () => navItems.filter((item) => item.loose || !item.permission || can(item.permission)),
    [user],
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <button className="mobile-menu-button" onClick={() => setOpen(true)}><Menu size={22} /></button>
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <button className="sidebar__close" onClick={() => setOpen(false)}><X size={20} /></button>
        <div className="sidebar__branding">
          <div className="brand-row">
            <BrandLogo src="/branding/logo_alcaldia_cbba.png" alt="Alcaldía de Cochabamba" className="brand-logo brand-logo--alcaldia" />
            <div><b>ALCALDÍA DE</b><strong>COCHABAMBA</strong></div>
          </div>
          <div className="brand-row brand-row--dsc">
            <BrandLogo src="/branding/logo_dsc.png" alt="Dirección de Seguridad Ciudadana" className="brand-logo brand-logo--dsc" />
            <div><strong>SEGURIDAD<br />CIUDADANA</strong><small>CENTRO DE OPERACIONES</small></div>
          </div>
        </div>

        <div className="sidebar__profile">
          <UserAvatar src={user?.photoUrl || guard?.photoUrl} name={displayName} size={62} />
          <div className="sidebar__profile-copy">
            <strong>{displayName}</strong>
            <span>{detail}</span>
            <small><i /> En línea</small>
          </div>
        </div>

        <nav className="sidebar__nav">
          {visible.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`} onClick={() => setOpen(false)}>
              <Icon size={20} /><span>{label}</span>
            </NavLink>
          ))}
          <button className="nav-link nav-link--button" onClick={handleLogout}><LogOut size={20} /><span>Cerrar sesión</span></button>
        </nav>

        <div className="sidebar__footer" aria-hidden="true">
          <div className="sidebar__cityline"><span /><span /><span /><span /><span /></div>
          <em>¡Tu seguridad,<br />nuestro compromiso!</em>
        </div>
      </aside>
      {open ? <button className="sidebar-overlay" onClick={() => setOpen(false)} aria-label="Cerrar menú" /> : null}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar__title"><span /> CENTRO DE OPERACIONES</div>
          <div className="topbar__meta">
            <span>Cochabamba, Bolivia</span>
            <span>{new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium' }).format(new Date())}</span>
          </div>
        </header>
        <div className="page-content"><Outlet /></div>
      </main>
    </div>
  );
}
