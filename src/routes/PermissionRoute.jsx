import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function PermissionRoute({ permission }) {
  const { can } = useAuth();
  return can(permission) ? <Outlet /> : <Navigate to="/" replace />;
}
