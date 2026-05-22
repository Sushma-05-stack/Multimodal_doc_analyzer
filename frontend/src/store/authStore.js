import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      initAuth: async () => {
        const { token } = get();
        if (!token) return;
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const { data } = await api.get('/auth/me');
          set({ user: data.user, isAuthenticated: true });
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
          delete api.defaults.headers.common['Authorization'];
        }
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, message: error.response?.data?.message || 'Login failed' };
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', { name, email, password });
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, message: error.response?.data?.message || 'Registration failed' };
        }
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (userData) => set({ user: { ...get().user, ...userData } })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated })
    }
  )
);
