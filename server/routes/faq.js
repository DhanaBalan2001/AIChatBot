import express from 'express';
import multer from 'multer';
import { adminAuth } from '../middleware/auth.js';
import FAQ from '../models/FAQ.js';

const router = express.Router();

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Get all FAQs
router.get('/', adminAuth, async (req, res) => {
  try {
    const faqs = await FAQ.find({}).sort({ createdAt: -1 });
    
    // Format dates for client-side display
    const formattedFaqs = faqs.map(faq => ({
      ...faq.toObject(),
      createdAt: new Date(faq.createdAt).toISOString(),
      updatedAt: new Date(faq.updatedAt).toISOString(),
      formattedCreatedAt: formatDateTime(faq.createdAt),
      formattedUpdatedAt: formatDateTime(faq.updatedAt)
    }));
    
    res.json(formattedFaqs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add a new FAQ
router.post('/', adminAuth, async (req, res) => {
  try {
    const { question, answer, keywords } = req.body;
    const currentTime = new Date();
    
    const faq = new FAQ({
      question,
      answer,
      keywords: keywords || [],
      createdAt: currentTime,
      updatedAt: currentTime
    });
    
    await faq.save();
    
    // Format the response
    const formattedFaq = {
      ...faq.toObject(),
      createdAt: currentTime.toISOString(),
      updatedAt: currentTime.toISOString(),
      formattedCreatedAt: formatDateTime(currentTime),
      formattedUpdatedAt: formatDateTime(currentTime)
    };
    
    res.status(201).json(formattedFaq);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload PDF and extract FAQs - simplified version
router.post('/upload', adminAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // For now, just return a message that PDF parsing is not implemented
    res.status(200).json({ 
      message: 'PDF parsing is temporarily disabled. Please add FAQs manually.',
      faqs: []
    });
    
    // TODO: Implement PDF parsing when the library issues are resolved
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ message: 'Error processing file', error: error.message });
  }
});

// Delete an FAQ
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await FAQ.findByIdAndDelete(req.params.id);
    res.json({ message: 'FAQ deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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
    hour12: true
  };
  
  return new Date(date).toLocaleString('en-US', options);
}

export default router;
