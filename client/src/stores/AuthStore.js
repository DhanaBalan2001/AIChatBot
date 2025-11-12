import { makeAutoObservable } from 'mobx';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';

class AuthStore {
  user = null;
  token = null;
  isLoading = false;
  error = null;
  
  constructor() {
    makeAutoObservable(this);
    
    // Load token from localStorage
    const storedToken = localStorage.getItem('token');
    
    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);
        // Check if token is expired
        if (decoded.exp * 1000 < Date.now()) {
          this.clearStorage();
        } else {
          this.token = storedToken;
          this.user = {
            id: decoded.userId,
            username: decoded.username,
            isAdmin: decoded.isAdmin
          };
        }
      } catch (error) {
        console.error("Token validation error:", error);
        this.clearStorage();
      }
    }
  }
  
  clearStorage() {
    localStorage.removeItem('token');
    this.token = null;
    this.user = null;
  }
  
  // Safe storage helper methods
  safeSetItem(key, value) {
    if (typeof value === 'object') {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      localStorage.setItem(key, value);
    }
  }
  
  safeGetItem(key) {
    const item = localStorage.getItem(key);
    if (!item) return null;
    
    try {
      return JSON.parse(item);
    } catch (e) {
      // If it's not valid JSON, return the raw value
      return item;
    }
  }
  
  setLoading(status) {
    this.isLoading = status;
  }
  
  setError(error) {
    this.error = error;
  }
  
  async login(username, password) {
    this.setLoading(true);
    this.setError(null);
    
    try {
      const response = await api.post('/api/auth/login', { username, password });
      const { token, user } = response.data;
      
      // Store token as string
      this.safeSetItem('token', token);
      
      this.token = token;
      this.user = user;
      return true;
    } catch (error) {
      this.setError(error.response?.data?.message || 'Login failed');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }
  
  async register(username, password, isAdmin = false) {
    this.setLoading(true);
    this.setError(null);
    
    try {
      const response = await api.post('/api/auth/register', { username, password, isAdmin });
      const { token, user } = response.data;
      
      // Store token as string
      this.safeSetItem('token', token);
      
      this.token = token;
      this.user = user;
      return true;
    } catch (error) {
      this.setError(error.response?.data?.message || 'Registration failed');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }
  
  logout() {
    this.clearStorage();
  }
  
  get isAuthenticated() {
    return !!this.token && !!this.user;
  }
  
  get isAdmin() {
    return this.user?.isAdmin || false;
  }
}

export default new AuthStore();
