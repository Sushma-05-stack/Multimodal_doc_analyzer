import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again.');
    }
    return Promise.reject({ ...error, message });
  }
);

export default api;
