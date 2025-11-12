import { makeAutoObservable, runInAction } from 'mobx';
import api from '../services/api';
import AuthStore from './AuthStore';

class ChatStore {
  messages = [];  // Initialize as empty array
  isLoading = false;
  isTyping = false;
  error = null;
  lastMessageTime = null;
  systemPrompt = "You are a helpful customer support agent. Be polite, concise, and provide accurate information about our products and services.";
  
  constructor() {
    makeAutoObservable(this);
    
    // Load system prompt from localStorage if available
    const savedPrompt = localStorage.getItem('systemPrompt');
    if (savedPrompt) {
      this.systemPrompt = savedPrompt;
    }
  }
  
  setLoading(status) {
    this.isLoading = status;
  }
  
  setTyping(status) {
    this.isTyping = status;
  }
  
  setError(error) {
    this.error = error;
  }
  
  async loadChatHistory() {
    if (!AuthStore.isAuthenticated) return;
    
    this.setLoading(true);
    this.setError(null);
    
    try {
      const response = await api.get('/api/chat/history');
      
      runInAction(() => {
        // Ensure messages is always an array
        this.messages = response.data.messages || [];
        
        // Set lastMessageTime to the most recent message
        if (this.messages.length > 0) {
          this.lastMessageTime = this.messages[this.messages.length - 1].timestamp;
        }
      });
    } catch (error) {
      console.error("Error loading chat history:", error);
      this.setError(error.response?.data?.message || 'Failed to load chat history');
      // Ensure messages is an empty array on error
      runInAction(() => {
        this.messages = [];
      });
    } finally {
      this.setLoading(false);
    }
  }
  
  async sendMessage(content) {
    if (!AuthStore.isAuthenticated || !content.trim()) return;
    
    this.setTyping(true);
    this.setError(null);
    
    try {
      const response = await api.post('/api/chat/message', { 
        message: content,
        systemPrompt: this.systemPrompt // Send the system prompt with each message
      });
      
      runInAction(() => {
        // Add user message
        this.messages.push({
          _id: Date.now().toString(), // Temporary ID until we get the real one
          sender: 'user',
          content: response.data.userMessage.content,
          timestamp: response.data.userMessage.timestamp,
          formattedTime: response.data.userMessage.formattedTime
        });
        
        // Add bot response if it exists
        if (response.data.botResponse) {
          this.messages.push({
            _id: (Date.now() + 1).toString(), // Temporary ID
            sender: 'bot',
            content: response.data.botResponse.content,
            timestamp: response.data.botResponse.timestamp,
            formattedTime: response.data.botResponse.formattedTime
          });
          
          // Update lastMessageTime
          this.lastMessageTime = response.data.botResponse.timestamp;
        }
      });
    } catch (error) {
      console.error("Error sending message:", error);
      this.setError(error.response?.data?.message || 'Failed to send message');
    } finally {
      this.setTyping(false);
    }
  }
  
  async updateSystemPrompt(newPrompt) {
    if (!AuthStore.isAdmin) return;
    
    try {
      // Save to backend (you'll need to implement this API endpoint)
      await api.post('/api/chat/system-prompt', { prompt: newPrompt });
      
      // Update local state
      runInAction(() => {
        this.systemPrompt = newPrompt;
        // Save to localStorage for persistence
        localStorage.setItem('systemPrompt', newPrompt);
      });
      
      return true;
    } catch (error) {
      console.error("Error updating system prompt:", error);
      this.setError(error.response?.data?.message || 'Failed to update system prompt');
      throw error;
    }
  }
  
  async downloadChatHistory() {
    if (!AuthStore.isAuthenticated) return;
    
    try {
      const response = await api.get('/api/chat/download', {
        responseType: 'blob'
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'chat-history.txt');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error downloading chat history:", error);
      this.setError(error.response?.data?.message || 'Failed to download chat history');
    }
  }
  
  clearMessages() {
    this.messages = [];
    this.lastMessageTime = null;
  }
}

export default new ChatStore();
