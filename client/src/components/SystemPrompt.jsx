import React, { useState } from 'react';
import { observer } from 'mobx-react';
import ChatStore from '../stores/ChatStore';
import AuthStore from '../stores/AuthStore';

const SystemPrompt = observer(() => {
  const [prompt, setPrompt] = useState(ChatStore.systemPrompt || "You are a helpful customer support agent. Be polite, concise, and provide accurate information about our products and services.");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await ChatStore.updateSystemPrompt(prompt);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update system prompt:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!AuthStore.isAdmin) return null;

  return (
    <div className="system-prompt-container">
      <h3>System Prompt</h3>
      <p className="system-prompt-description">
        Define the AI assistant's personality and behavior. This will guide how the AI responds to users.
      </p>
      
      {isEditing ? (
        <div className="system-prompt-editor">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder="Enter system prompt..."
          />
          <div className="prompt-actions">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="save-button"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button 
              onClick={() => setIsEditing(false)}
              className="cancel-button"
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="system-prompt-display">
          <div className="prompt-content">
            <span className="prompt-quote">"</span>
            {prompt}
            <span className="prompt-quote">"</span>
          </div>
          <button 
            onClick={() => setIsEditing(true)}
            className="edit-button"
          >
            Edit Prompt
          </button>
        </div>
      )}
    </div>
  );
});

export default SystemPrompt;
