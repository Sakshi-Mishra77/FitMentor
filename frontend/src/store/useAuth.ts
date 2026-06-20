// frontend/src/store/useAuth.ts
import { create } from 'zustand';
import api from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('token') : false,
  
  login: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
    set({ token, isAuthenticated: true });
  },
  
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    set({ user: null, token: null, isAuthenticated: false });
  },
  
  fetchUser: async () => {
    // Safety Check: Do not ping the backend if no token exists in storage
    const currentToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!currentToken) {
      set({ user: null, isAuthenticated: false });
      return;
    }

    try {
      const response = await api.get('/auth/users/me'); 
      set({ user: response.data, isAuthenticated: true });
    } catch (error) {
      console.error("Failed to fetch user", error);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
      set({ user: null, token: null, isAuthenticated: false });
    }
  },
}));