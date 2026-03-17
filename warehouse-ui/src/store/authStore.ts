import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse } from '../types';

interface AuthState {
  user: AuthResponse | null;
  isAuthenticated: boolean;
  setAuth: (auth: AuthResponse) => void;
  logout: () => void;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  isUser: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      setAuth: (auth: AuthResponse) => {
        localStorage.setItem('accessToken', auth.accessToken);
        set({ user: auth, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        set({ user: null, isAuthenticated: false });
      },

      isAdmin: () => {
        const role = get().user?.role;
        return role === 'ADMIN' || role === 'SUPER_ADMIN';
      },

      isSuperAdmin: () => get().user?.role === 'SUPER_ADMIN',

      isUser: () => get().user?.role === 'USER',
    }),
    { name: 'auth-storage', partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }) }
  )
);
