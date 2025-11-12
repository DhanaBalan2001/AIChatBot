import axios from 'axios';

// Create a base axios instance with the correct base URL
const api = axios.create({
  baseURL: 'https://ai-chatbot-backend-baxi.onrender.com', // Your backend server URL
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
