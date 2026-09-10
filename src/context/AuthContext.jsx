import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/endpoints.js';
import { disconnectSocket } from '../api/socket.js';
import { tokenStorage } from '../lib/storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    const access = tokenStorage.getAccess();
    if (!access) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const current = await authApi.me();
      setUser(current);
    } catch {
      tokenStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
    const onExpired = () => {
      disconnectSocket();
      setUser(null);
      setLoading(false);
    };
    window.addEventListener('sc-cbba-auth-expired', onExpired);
    return () => window.removeEventListener('sc-cbba-auth-expired', onExpired);
  }, [bootstrap]);

  const login = async (loginValue, password) => {
    const payload = await authApi.login(loginValue, password);
    tokenStorage.set(payload);
    setUser(payload.user);
    return payload.user;
  };

  const logout = async () => {
    const refreshToken = tokenStorage.getRefresh();
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // El token local se elimina igualmente.
    }
    disconnectSocket();
    tokenStorage.clear();
    setUser(null);
  };

  const refreshMe = async () => {
    const current = await authApi.me();
    setUser(current);
    return current;
  };

  const can = (permission) => {
    if (!user) return false;
    return user.role === 'ADMINISTRADOR' || user.permissions?.includes(permission);
  };

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshMe, can }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return value;
}
