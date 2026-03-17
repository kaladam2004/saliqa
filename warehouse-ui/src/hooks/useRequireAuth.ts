import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const useRequireAuth = (requiredRole?: 'admin' | 'user') => {
  const { isAuthenticated, isAdmin, isUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (requiredRole === 'admin' && !isAdmin()) {
      navigate('/user');
    }
    if (requiredRole === 'user' && !isUser()) {
      navigate('/admin');
    }
  }, [isAuthenticated, requiredRole, navigate, isAdmin, isUser]);

  return { isAuthenticated };
};
