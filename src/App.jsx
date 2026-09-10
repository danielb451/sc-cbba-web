import { Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LiveMapPage from './pages/LiveMapPage.jsx';
import GuardsPage from './pages/GuardsPage.jsx';
import GuardDetailPage from './pages/GuardDetailPage.jsx';
import ServicesPage from './pages/ServicesPage.jsx';
import GuardServicesPage from './pages/GuardServicesPage.jsx';
import IncidentsPage from './pages/IncidentsPage.jsx';
import IncidentDetailPage from './pages/IncidentDetailPage.jsx';
import PatrolsPage from './pages/PatrolsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import AppShell from './layout/AppShell.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import PermissionRoute from './routes/PermissionRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route element={<PermissionRoute permission="dashboard.read" />}><Route index element={<DashboardPage />} /></Route>
          <Route element={<PermissionRoute permission="map.read" />}><Route path="mapa" element={<LiveMapPage />} /></Route>
          <Route element={<PermissionRoute permission="guards.read" />}><Route path="guardias" element={<GuardsPage />} /><Route path="guardias/:id" element={<GuardDetailPage />} /></Route>
          <Route element={<PermissionRoute permission="services.read" />}><Route path="servicios" element={<ServicesPage />} /><Route path="servicios/:guardId" element={<GuardServicesPage />} /></Route>
          <Route path="hechos" element={<IncidentsPage />} /><Route path="hechos/:id" element={<IncidentDetailPage />} />
          <Route path="patrullas" element={<PatrolsPage />} />
          <Route element={<PermissionRoute permission="reports.read" />}><Route path="reportes" element={<ReportsPage />} /></Route>
          <Route element={<PermissionRoute permission="settings.manage" />}><Route path="configuracion" element={<SettingsPage />} /></Route>
          <Route element={<PermissionRoute permission="users.manage" />}><Route path="usuarios" element={<UsersPage />} /></Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
