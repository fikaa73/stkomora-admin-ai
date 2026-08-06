/**
 * Central Axios client for all API requests.
 * Attaches auth token from localStorage and handles 401.
 */
import axios from 'axios';

const API_BASE_URL =
  typeof process.env.REACT_APP_API_URL !== 'undefined'
    ? process.env.REACT_APP_API_URL
    // : 'http://localhost:8000';
    : 'https://api.stomkomcg.me';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    if (error.response?.status === 418) {
      const err = new Error(
        'API je odgovorio sa 418 — to podešava backend (Laravel), ne admin aplikacija. Provjerite rutu i middleware na serveru.'
      );
      err.response = error.response;
      err.config = error.config;
      return Promise.reject(err);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
