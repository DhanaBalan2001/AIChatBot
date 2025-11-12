import { makeAutoObservable, runInAction } from 'mobx';
import api from '../services/api';
import AuthStore from './AuthStore';

class AdminStore {
  faqs = [];
  isLoading = false;
  error = null;
  uploadProgress = 0;
  
  constructor() {
    makeAutoObservable(this);
  }
  
  setLoading(status) {
    this.isLoading = status;
  }
  
  setError(error) {
    this.error = error;
  }
  
  setUploadProgress(progress) {
    this.uploadProgress = progress;
  }
  
  async loadFaqs() {
    if (!AuthStore.isAdmin) return;
    
    this.setLoading(true);
    this.setError(null);
    
    try {
      const response = await api.get('/api/faq');
      
      runInAction(() => {
        this.faqs = response.data;
      });
    } catch (error) {
      this.setError(error.response?.data?.message || 'Failed to load FAQs');
    } finally {
      this.setLoading(false);
    }
  }
  
  async addFaq(question, answer, keywords) {
    if (!AuthStore.isAdmin) return;
    
    this.setLoading(true);
    this.setError(null);
    
    try {
      const response = await api.post('/api/faq', { question, answer, keywords });
      
      runInAction(() => {
        this.faqs.push(response.data);
      });
      
      return response.data;
    } catch (error) {
      this.setError(error.response?.data?.message || 'Failed to add FAQ');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }
  
  async deleteFaq(id) {
    if (!AuthStore.isAdmin) return;
    
    this.setLoading(true);
    this.setError(null);
    
    try {
      await api.delete(`/api/faq/${id}`);
      
      runInAction(() => {
        this.faqs = this.faqs.filter(faq => faq._id !== id);
      });
    } catch (error) {
      this.setError(error.response?.data?.message || 'Failed to delete FAQ');
    } finally {
      this.setLoading(false);
    }
  }
  
  async uploadPdf(file) {
    if (!AuthStore.isAdmin) return;
    
    this.setLoading(true);
    this.setError(null);
    this.setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/api/faq/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          this.setUploadProgress(percentCompleted);
        }
      });
      
      return response.data;
    } catch (error) {
      this.setError(error.response?.data?.message || 'Failed to upload PDF');
      throw error;
    } finally {
      this.setLoading(false);
      // Reset progress after completion
      setTimeout(() => this.setUploadProgress(0), 1000);
    }
  }
  
  async addBulkFaqs(faqs) {
    if (!AuthStore.isAdmin || !Array.isArray(faqs) || faqs.length === 0) return;
    
    this.setLoading(true);
    this.setError(null);
    
    try {
      const response = await api.post('/api/faq/bulk', { faqs });
      
      runInAction(() => {
        this.faqs = [...this.faqs, ...response.data];
      });
      
      return response.data;
    } catch (error) {
      this.setError(error.response?.data?.message || 'Failed to add bulk FAQs');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }
}

export default new AdminStore();
