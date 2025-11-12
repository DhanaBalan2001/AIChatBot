import express from 'express';
import axios from 'axios';
import { auth } from '../middleware/auth.js';
import Conversation from '../models/Conversation.js';
import FAQ from '../models/FAQ.js';

const router = express.Router();

// Get conversation history
router.get('/history', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ userId: req.user.userId });
    
    if (!conversation) {
      return res.json({ messages: [] });
    }
    
    // Format dates for client-side display
    const formattedMessages = conversation.messages.map(msg => ({
      ...msg.toObject(),
      timestamp: new Date(msg.timestamp).toISOString(),
      formattedTime: formatDateTime(msg.timestamp) // Add a human-readable format
    }));
    
    res.json({ 
      messages: formattedMessages,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add typing indicator endpoint
router.post('/typing', auth, (req, res) => {
  // This endpoint just acknowledges that the bot is "typing"
  // The frontend will use this to show a typing indicator
  res.json({ typing: true });
});

// Send message and get AI response
router.post('/message', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const currentTime = new Date();
    
    // Find or create conversation
    let conversation = await Conversation.findOne({ userId: req.user.userId });
    
    if (!conversation) {
      conversation = new Conversation({
        userId: req.user.userId,
        messages: [],
        lastUpdated: currentTime
      });
    }
    
    // Add user message to conversation
    conversation.messages.push({
      sender: 'user',
      content: message,
      timestamp: currentTime
    });
    
    // Update the lastUpdated field
    conversation.lastUpdated = currentTime;
    
    // Check FAQs for a matching answer
    let botResponse = '';
    const faqs = await FAQ.find({});
    
    // Simple keyword matching (could be improved with embeddings)
    const matchingFaq = faqs.find(faq => {
      const keywords = faq.keywords.map(k => k.toLowerCase());
      return keywords.some(keyword => message.toLowerCase().includes(keyword));
    });
    
    if (matchingFaq) {
      console.log('FAQ match found:', matchingFaq.question);
      botResponse = matchingFaq.answer;
    } else {
      console.log('No FAQ match found, using Azure OpenAI');
      
      // If no FAQ match, use Azure OpenAI
      const conversationHistory = conversation.messages.slice(-10).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      
      // Add system message
      conversationHistory.unshift({
        role: 'system',
        content: 'You are a helpful customer support assistant. Provide concise, accurate answers.'
      });
      
      console.log('Sending request to Azure OpenAI with endpoint:', process.env.AZURE_OPENAI_ENDPOINT);
      
      try {
        const response = await axios.post(
          `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2023-05-15`,
          {
            messages: conversationHistory,
            max_tokens: 800,
            temperature: 0.7
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'api-key': process.env.AZURE_OPENAI_API_KEY
            }
          }
        );
        
        botResponse = response.data.choices[0].message.content;
        console.log('Received response from Azure OpenAI');
      } catch (aiError) {
        console.error('Azure OpenAI API error:', aiError.response?.data || aiError.message);
        botResponse = "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again later.";
      }
    }
    
    // Add bot response to conversation with the current time plus a small delay
    const botResponseTime = new Date(currentTime.getTime() + 500); // Add 500ms to simulate typing delay
    
    conversation.messages.push({
      sender: 'bot',
      content: botResponse,
      timestamp: botResponseTime
    });
    
    await conversation.save();
    
    res.json({ 
      userMessage: {
        content: message,
        timestamp: currentTime.toISOString(),
        formattedTime: formatDateTime(currentTime)
      },
      botResponse: {
        content: botResponse,
        timestamp: botResponseTime.toISOString(),
        formattedTime: formatDateTime(botResponseTime)
      }
    });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add endpoint for the client to check for new messages
router.get('/updates', auth, async (req, res) => {
  try {
    const { lastMessageTime } = req.query;
    const conversation = await Conversation.findOne({ userId: req.user.userId });
    
    if (!conversation) {
      return res.json({ messages: [] });
    }
    
    // Get messages newer than the lastMessageTime
    const newMessages = conversation.messages.filter(msg => {
      return new Date(msg.timestamp) > new Date(lastMessageTime);
    });
    
    // Format the new messages
    const formattedMessages = newMessages.map(msg => ({
      ...msg.toObject(),
      timestamp: new Date(msg.timestamp).toISOString(),
      formattedTime: formatDateTime(msg.timestamp)
    }));
    
    res.json({ messages: formattedMessages });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Test Azure OpenAI connection
router.get('/test-openai', auth, async (req, res) => {
  try {
    const testMessage = "Hello, this is a test message to verify the Azure OpenAI connection.";
    
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful assistant. Respond with "Connection successful!" and the current date and time.'
      },
      {
        role: 'user',
        content: testMessage
      }
    ];
    
    console.log('Testing Azure OpenAI connection with endpoint:', process.env.AZURE_OPENAI_ENDPOINT);
    
    const response = await axios.post(
      `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2023-05-15`,
      {
        messages,
        max_tokens: 100,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.AZURE_OPENAI_API_KEY
        }
      }
    );
    
    const aiResponse = response.data.choices[0].message.content;
    
    res.json({
      success: true,
      message: 'Azure OpenAI connection successful',
      response: aiResponse,
      config: {
        endpoint: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions`,
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
        apiVersion: '2023-05-15'
      }
    });
  } catch (error) {
    console.error('Azure OpenAI test error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Azure OpenAI connection failed',
      error: error.response?.data || error.message,
      config: {
        endpoint: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions`,
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
        apiVersion: '2023-05-15'
      }
    });
  }
});

// Download chat history
router.get('/download', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ userId: req.user.userId });
    
    if (!conversation || conversation.messages.length === 0) {
      return res.status(404).json({ message: 'No conversation found' });
    }
    
    let chatText = 'Chat History\n\n';
    
    conversation.messages.forEach(message => {
      const formattedTime = formatDateTime(message.timestamp);
      chatText += `[${formattedTime}] ${message.sender === 'user' ? 'You' : 'Bot'}: ${message.content}\n\n`;
    });
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename=chat-history.txt');
    res.send(chatText);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update system prompt (admin only)
router.post('/system-prompt', auth, async (req, res) => {
  try {
    // Verify user is an admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Only admins can update system prompt' });
    }
    
    const { prompt } = req.body;
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ message: 'Invalid prompt format' });
    }
    
    // You might want to store this in your database
    // For example, in a Settings collection
    const result = await db.collection('settings').updateOne(
      { key: 'systemPrompt' },
      { $set: { value: prompt } },
      { upsert: true }
    );
    
    res.status(200).json({ message: 'System prompt updated successfully' });
  } catch (error) {
    console.error('Error updating system prompt:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to format date and time in a human-readable format
function formatDateTime(date) {
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  
  return new Date(date).toLocaleString('en-US', options);
}

export default router;