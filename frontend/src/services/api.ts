// frontend/src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

// Request Interceptor: Attach token to outbound requests
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Catch global authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Prevent the infinite reload bug: Do NOT hard-redirect if the failed request was the login attempt itself
      const isAuthEndpoint = error.config.url?.includes('/auth/login') || error.config.url?.includes('/auth/register');
      
      if (!isAuthEndpoint && typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;