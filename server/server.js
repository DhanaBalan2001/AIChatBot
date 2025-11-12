import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import faqRoutes from './routes/faq.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['https://ai-chatbot-dhanabalan.netlify.app'],
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true
  }))
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/faq', faqRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('AI Customer Support API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
