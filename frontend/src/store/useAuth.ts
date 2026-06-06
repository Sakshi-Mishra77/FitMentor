// src/store/useAuth.ts
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
    localStorage.setItem('token', token);
    set({ token, isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  
  fetchUser: async () => {
    try {
      // We will build this /users/me endpoint on the backend shortly!
      const response = await api.get('/auth/users/me'); 
      set({ user: response.data });
    } catch (error) {
      console.error("Failed to fetch user", error);
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },
}));