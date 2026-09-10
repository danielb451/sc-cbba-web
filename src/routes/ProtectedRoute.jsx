import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingState from '../components/LoadingState.jsx';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState fullscreen label="Validando sesión..." />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
