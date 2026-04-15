import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { getStoredToken } from '../../lib/api.js';

export function RequireAuth() {
  const navigate = useNavigate();
  const token = getStoredToken();

  useEffect(() => {
    if (!token) navigate('/login', { replace: true });
  }, [token, navigate]);

  if (!token) return null;
  return <Outlet />;
}
