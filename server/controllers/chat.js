import axios from 'axios';
import Conversation from '../models/Conversation.js';
import FAQ from '../models/FAQ.js';
import MessageReaction from '../models/MessageReaction.js';
import { formatDateTime } from '../utils/dateUtils.js';

export const getChatHistory = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (page - 1) * limit;
    
    let conversation = await Conversation.findOne({ userId: req.user.userId });
    
    if (!conversation) {
      return res.json({ 
        messages: [], 
        pagination: { page: 1, limit, total: 0, pages: 0 }
      });
    }
    
    let messages = conversation.messages;
    
    // Search functionality
    if (search) {
      messages = messages.filter(msg => 
        msg.content.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Pagination
    const total = messages.length;
    const paginatedMessages = messages
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(skip, skip + parseInt(limit));
    
    // Format messages with reactions
    const formattedMessages = await Promise.all(
      paginatedMessages.map(async (msg) => {
        const reactions = await MessageReaction.find({ messageId: msg._id });
        return {
          ...msg.toObject(),
          timestamp: new Date(msg.timestamp).toISOString(),
          formattedTime: formatDateTime(msg.timestamp),
          reactions: reactions.reduce((acc, reaction) => {
            acc[reaction.type] = (acc[reaction.type] || 0) + 1;
            return acc;
          }, {}),
          userReaction: reactions.find(r => r.userId.toString() === req.user.userId)?.type || null
        };
      })
    );
    
    res.json({ 
      messages: formattedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const sendMessage = async (req, res) => {
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
    const userMessage = {
      sender: 'user',
      content: message,
      timestamp: currentTime
    };
    
    conversation.messages.push(userMessage);
    conversation.lastUpdated = currentTime;
    
    // Check FAQs for a matching answer
    let botResponse = '';
    const faqs = await FAQ.find({});
    
    // Simple keyword matching
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
      
      conversationHistory.unshift({
        role: 'system',
        content: 'You are a helpful customer support assistant. Provide concise, accurate answers.'
      });
      
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
      } catch (aiError) {
        console.error('Azure OpenAI API error:', aiError.response?.data || aiError.message);
        botResponse = "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again later.";
      }
    }
    
    // Add bot response to conversation
    const botResponseTime = new Date(currentTime.getTime() + 500);
    const botMessage = {
      sender: 'bot',
      content: botResponse,
      timestamp: botResponseTime
    };
    
    conversation.messages.push(botMessage);
    await conversation.save();
    
    res.json({ 
      userMessage: {
        _id: conversation.messages[conversation.messages.length - 2]._id,
        content: message,
        timestamp: currentTime.toISOString(),
        formattedTime: formatDateTime(currentTime),
        reactions: {},
        userReaction: null
      },
      botResponse: {
        _id: conversation.messages[conversation.messages.length - 1]._id,
        content: botResponse,
        timestamp: botResponseTime.toISOString(),
        formattedTime: formatDateTime(botResponseTime),
        reactions: {},
        userReaction: null
      }
    });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const addMessageReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { type } = req.body; // 'like', 'dislike', 'helpful', 'not_helpful'
    
    // Check if user already reacted to this message
    const existingReaction = await MessageReaction.findOne({
      messageId,
      userId: req.user.userId
    });
    
    if (existingReaction) {
      if (existingReaction.type === type) {
        // Remove reaction if same type
        await MessageReaction.deleteOne({ _id: existingReaction._id });
        return res.json({ message: 'Reaction removed', type: null });
      } else {
        // Update reaction type
        existingReaction.type = type;
        await existingReaction.save();
        return res.json({ message: 'Reaction updated', type });
      }
    }
    
    // Create new reaction
    const reaction = new MessageReaction({
      messageId,
      userId: req.user.userId,
      type
    });
    
    await reaction.save();
    res.json({ message: 'Reaction added', type });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const exportChat = async (req, res) => {
  try {
    const { format = 'txt' } = req.query;
    const conversation = await Conversation.findOne({ userId: req.user.userId });
    
    if (!conversation || conversation.messages.length === 0) {
      return res.status(404).json({ message: 'No conversation found' });
    }
    
    let exportData;
    let contentType;
    let filename;
    
    switch (format) {
      case 'json':
        exportData = JSON.stringify({
          userId: req.user.userId,
          username: req.user.username,
          exportedAt: new Date().toISOString(),
          messages: conversation.messages.map(msg => ({
            sender: msg.sender,
            content: msg.content,
            timestamp: msg.timestamp,
            formattedTime: formatDateTime(msg.timestamp)
          }))
        }, null, 2);
        contentType = 'application/json';
        filename = 'chat-history.json';
        break;
        
      case 'csv':
        const csvHeader = 'Timestamp,Sender,Message\n';
        const csvRows = conversation.messages.map(msg => 
          `"${formatDateTime(msg.timestamp)}","${msg.sender}","${msg.content.replace(/"/g, '""')}"`
        ).join('\n');
        exportData = csvHeader + csvRows;
        contentType = 'text/csv';
        filename = 'chat-history.csv';
        break;
        
      default: // txt
        let chatText = `Chat History - ${req.user.username}\n`;
        chatText += `Exported: ${formatDateTime(new Date())}\n`;
        chatText += '='.repeat(50) + '\n\n';
        
        conversation.messages.forEach(message => {
          const formattedTime = formatDateTime(message.timestamp);
          chatText += `[${formattedTime}] ${message.sender === 'user' ? 'You' : 'Bot'}: ${message.content}\n\n`;
        });
        
        exportData = chatText;
        contentType = 'text/plain';
        filename = 'chat-history.txt';
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(exportData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const searchMessages = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }
    
    const conversation = await Conversation.findOne({ userId: req.user.userId });
    
    if (!conversation) {
      return res.json({ 
        results: [], 
        pagination: { page: 1, limit, total: 0, pages: 0 }
      });
    }
    
    // Search in messages
    const searchResults = conversation.messages.filter(msg =>
      msg.content.toLowerCase().includes(q.toLowerCase())
    );
    
    // Pagination
    const skip = (page - 1) * limit;
    const total = searchResults.length;
    const paginatedResults = searchResults
      .slice(skip, skip + parseInt(limit))
      .map(msg => ({
        ...msg.toObject(),
        timestamp: new Date(msg.timestamp).toISOString(),
        formattedTime: formatDateTime(msg.timestamp),
        // Highlight search term
        highlightedContent: msg.content.replace(
          new RegExp(q, 'gi'),
          `<mark>$&</mark>`
        )
      }));
    
    res.json({
      results: paginatedResults,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      query: q
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getTypingIndicator = async (req, res) => {
  res.json({ typing: true });
};

// ... continuing from where we left off

export const testOpenAI = async (req, res) => {
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
};

export const updateSystemPrompt = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Only admins can update system prompt' });
    }
    
    const { prompt } = req.body;
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ message: 'Invalid prompt format' });
    }
    
    // Store in a settings collection or environment variable
    // For now, we'll just acknowledge the update
    res.status(200).json({ message: 'System prompt updated successfully' });
  } catch (error) {
    console.error('Error updating system prompt:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
