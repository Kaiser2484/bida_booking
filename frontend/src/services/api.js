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
      // Only redirect on 401 Unauthorized, not on 404 or other errors
      const authStore = localStorage.getItem('auth-storage');
      if (authStore) {
        localStorage.removeItem('auth-storage');
      }
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;