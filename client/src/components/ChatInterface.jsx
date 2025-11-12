import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react';
import ChatStore from '../stores/ChatStore';
import AuthStore from '../stores/AuthStore';
import SystemPrompt from './SystemPrompt';

const ChatInterface = observer(() => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  
  useEffect(() => {
    // Load chat history when component mounts
    ChatStore.loadChatHistory();
    
    // Cleanup function
    return () => {
      // Optional: Clear messages when component unmounts
      // ChatStore.clearMessages();
    };
  }, []);
  
  useEffect(() => {
    // Scroll to bottom whenever messages change
    scrollToBottom();
  }, [ChatStore.messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    await ChatStore.sendMessage(message);
    setMessage('');
  };
  
  const handleDownload = () => {
    ChatStore.downloadChatHistory();
  };
  
  // Safely check if messages array exists and has length
  const hasMessages = Array.isArray(ChatStore.messages) && ChatStore.messages.length > 0;
  
  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>AI Customer Support</h2>
        <div className="chat-actions">
          <button onClick={handleDownload} disabled={!hasMessages}>
            Download Chat
          </button>
          {AuthStore.isAdmin && (
            <button onClick={() => window.location.href = '/admin'}>
              Admin Panel
            </button>
          )}
          <button onClick={() => AuthStore.logout()}>Logout</button>
        </div>
      </div>
      
      {AuthStore.isAdmin && <SystemPrompt />}
      
      <div className="messages-container">
        {!hasMessages && !ChatStore.isLoading && (
          <div className="empty-chat">
            <p>No messages yet. Start a conversation!</p>
          </div>
        )}
        
        {ChatStore.isLoading && !hasMessages && (
          <div className="loading-messages">
            <p>Loading conversation history...</p>
          </div>
        )}
        
        {hasMessages && ChatStore.messages.map((msg) => (
          <div 
            key={msg._id || `${msg.sender}-${msg.timestamp}`}
            className={`message ${msg.sender === 'user' ? 'user-message' : 'bot-message'}`}
          >
            <div className="message-content">{msg.content}</div>
            <div className="message-time">{msg.formattedTime}</div>
          </div>
        ))}
        
        {ChatStore.isTyping && (
          <div className="message bot-message typing">
            <div className="typing-indicator">
              <div className="typing-text">Agent is typing</div>
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form className="message-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
          disabled={ChatStore.isTyping}
        />
        <button 
          type="submit" 
          disabled={!message.trim() || ChatStore.isTyping}
        >
          Send
        </button>
      </form>
    </div>
  );
});

export default ChatInterface;
