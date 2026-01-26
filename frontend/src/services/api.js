import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api', // Hard-coded for now
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (url.includes('/notifications/user') && url.includes('/unread-count')) {
        return Promise.reject(error);
      }
      const isAuthRequest = url.includes('/login') || url.includes('/register');
      if (!isAuthRequest) {
        const authStore = localStorage.getItem('auth-storage');
        if (authStore) {
          localStorage.removeItem('auth-storage');
        }
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;