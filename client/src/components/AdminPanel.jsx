import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { useNavigate } from 'react-router-dom';
import AdminStore from '../stores/AdminStore.js';
import AuthStore from '../stores/AuthStore.js';
import DragDropUploader from './DragDropUploader.jsx';

const AdminPanel = observer(() => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [keywords, setKeywords] = useState('');
  const [file, setFile] = useState(null);
  const [extractedFaqs, setExtractedFaqs] = useState([]);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!AuthStore.isAdmin) {
      navigate('/login');
      return;
    }
    
    AdminStore.loadFaqs();
  }, [navigate]);
  
  const handleAddFaq = async (e) => {
    e.preventDefault();
    
    try {
      const keywordsArray = keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
      
      await AdminStore.addFaq(question, answer, keywordsArray);
      
      // Clear form
      setQuestion('');
      setAnswer('');
      setKeywords('');
    } catch (error) {
      console.error('Failed to add FAQ:', error);
    }
  };
  
  const handleDeleteFaq = async (id) => {
    if (window.confirm('Are you sure you want to delete this FAQ?')) {
      await AdminStore.deleteFaq(id);
    }
  };
  
  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
  };
  
  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    if (!file) return;
    
    try {
      const result = await AdminStore.uploadPdf(file);
      setExtractedFaqs(result.faqs || []);
    } catch (error) {
      console.error('Failed to upload PDF:', error);
    }
  };
  
  const handleAddExtractedFaq = async (faq) => {
    try {
      await AdminStore.addFaq(faq.question, faq.answer, faq.keywords);
      
      // Remove from extracted list
      setExtractedFaqs(extractedFaqs.filter(f => f !== faq));
    } catch (error) {
      console.error('Failed to add extracted FAQ:', error);
    }
  };
  
  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>Admin Panel - FAQ Management</h2>
        <button onClick={() => navigate('/chat')}>Go to Chat</button>
        <button onClick={() => AuthStore.logout()}>Logout</button>
      </div>
      
      <div className="admin-content">
        <div className="add-faq-section">
          <h3>Add New FAQ</h3>
          {AdminStore.error && <div className="error-message">{AdminStore.error}</div>}
          
          <form onSubmit={handleAddFaq}>
            <div className="form-group">
              <label htmlFor="question">Question</label>
              <input
                type="text"
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="answer">Answer</label>
              <textarea
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                required
                rows={4}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="keywords">Keywords (comma separated)</label>
              <input
                type="text"
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., hours, business, open"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={AdminStore.isLoading}
            >
              {AdminStore.isLoading ? 'Adding...' : 'Add FAQ'}
            </button>
          </form>
        </div>
        
        <div className="upload-pdf-section">
          <h3>Upload PDF</h3>
          
          <form onSubmit={handleFileUpload}>
            <DragDropUploader 
              onFileSelect={handleFileSelect} 
              isLoading={AdminStore.isLoading} 
            />
            
            {file && (
              <button 
                type="submit" 
                className="submit-upload"
                disabled={AdminStore.isLoading}
              >
                {AdminStore.isLoading ? 'Processing...' : 'Process PDF'}
              </button>
            )}
          </form>
          
          {extractedFaqs.length > 0 && (
            <div className="extracted-faqs">
              <h4>Extracted FAQs ({extractedFaqs.length})</h4>
              
              {extractedFaqs.map((faq, index) => (
                <div key={index} className="extracted-faq">
                  <div className="faq-question">{faq.question}</div>
                  <div className="faq-answer">{faq.answer}</div>
                  <div className="faq-keywords">
                    Keywords: {faq.keywords.join(', ')}
                  </div>
                  <button onClick={() => handleAddExtractedFaq(faq)}>
                    Add to FAQs
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="faq-list-section">
          <h3>Existing FAQs ({AdminStore.faqs.length})</h3>
          
          {AdminStore.isLoading && AdminStore.faqs.length === 0 && (
            <div className="loading-faqs">Loading FAQs...</div>
          )}
          
          {AdminStore.faqs.length === 0 && !AdminStore.isLoading && (
            <div className="no-faqs">No FAQs added yet.</div>
          )}
          
          {AdminStore.faqs.map((faq) => (
            <div key={faq._id} className="faq-item">
              <div className="faq-header">
                <div className="faq-question">{faq.question}</div>
                <button 
                  className="delete-faq" 
                  onClick={() => handleDeleteFaq(faq._id)}
                >
                  Delete
                </button>
              </div>
              <div className="faq-answer">{faq.answer}</div>
              <div className="faq-meta">
                <div className="faq-keywords">
                  Keywords: {faq.keywords.join(', ')}
                </div>
                <div className="faq-date">
                  Added: {faq.formattedCreatedAt}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default AdminPanel;
