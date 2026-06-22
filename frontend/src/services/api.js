import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Matches your backend
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the Token in every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // We will store token here later
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;