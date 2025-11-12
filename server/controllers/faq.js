import FAQ from '../models/FAQ.js';
import { formatDateTime } from '../utils/dateUtils.js';

export const getAllFaqs = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { question: { $regex: search, $options: 'i' } },
        { answer: { $regex: search, $options: 'i' } },
        { keywords: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    const total = await FAQ.countDocuments(query);
    const faqs = await FAQ.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Format dates for client-side display
    const formattedFaqs = faqs.map(faq => ({
      ...faq.toObject(),
      createdAt: new Date(faq.createdAt).toISOString(),
      updatedAt: new Date(faq.updatedAt).toISOString(),
      formattedCreatedAt: formatDateTime(faq.createdAt),
      formattedUpdatedAt: formatDateTime(faq.updatedAt)
    }));
    
    res.json({
      faqs: formattedFaqs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createFaq = async (req, res) => {
  try {
    const { question, answer, keywords, category } = req.body;
    const currentTime = new Date();
    
    const faq = new FAQ({
      question,
      answer,
      keywords: keywords || [],
      category: category || 'general',
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
};

export const updateFaq = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, keywords, category } = req.body;
    
    const faq = await FAQ.findByIdAndUpdate(
      id,
      {
        question,
        answer,
        keywords: keywords || [],
        category: category || 'general',
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }
    
    const formattedFaq = {
      ...faq.toObject(),
      createdAt: new Date(faq.createdAt).toISOString(),
      updatedAt: new Date(faq.updatedAt).toISOString(),
      formattedCreatedAt: formatDateTime(faq.createdAt),
      formattedUpdatedAt: formatDateTime(faq.updatedAt)
    };
    
    res.json(formattedFaq);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteFaq = async (req, res) => {
  try {
    const { id } = req.params;
    const faq = await FAQ.findByIdAndDelete(id);
    
    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }
    
    res.json({ message: 'FAQ deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const uploadPdf = async (req, res) => {
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
};

export const getFaqAnalytics = async (req, res) => {
  try {
    const totalFaqs = await FAQ.countDocuments();
    const recentFaqs = await FAQ.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    
    // Get FAQ categories
    const categories = await FAQ.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get most common keywords
    const keywordStats = await FAQ.aggregate([
      { $unwind: '$keywords' },
      { $group: { _id: '$keywords', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      totalFaqs,
      recentFaqs,
      categories,
      topKeywords: keywordStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
