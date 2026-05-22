const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  originalName: { type: String, required: true },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileType: {
    type: String,
    enum: ['pdf', 'docx', 'txt', 'image', 'audio', 'csv', 'xlsx', 'other'],
    required: true
  },
  mimeType: { type: String },
  fileSize: { type: Number },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'completed', 'failed'],
    default: 'uploading'
  },
  language: { type: String, default: 'en' },
  pageCount: { type: Number, default: 0 },
  wordCount: { type: Number, default: 0 },

  // Extracted content
  extractedText: { type: String, default: '' },
  ocrConfidence: { type: Number, default: 0 },

  // AI Analysis
  summary: { type: String, default: '' },
  shortSummary: { type: String, default: '' },
  classification: {
    category: { type: String, default: '' },
    subcategory: { type: String, default: '' },
    confidence: { type: Number, default: 0 }
  },
  entities: [{
    text: String,
    type: String,
    confidence: Number,
    startIndex: Number,
    endIndex: Number
  }],
  keywords: [{ word: String, frequency: Number, relevance: Number }],
  sentiment: {
    overall: { type: String, enum: ['positive', 'negative', 'neutral', 'mixed'], default: 'neutral' },
    score: { type: Number, default: 0 },
    breakdown: {
      positive: Number,
      negative: Number,
      neutral: Number
    }
  },
  topics: [{ name: String, confidence: Number, keywords: [String] }],

  // Special analysis
  resumeScore: {
    overall: Number,
    sections: mongoose.Schema.Types.Mixed,
    suggestions: [String]
  },
  fraudAnalysis: {
    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    flags: [String],
    confidence: Number
  },
  flashcards: [{ question: String, answer: String }],

  // Vector embedding reference
  embeddingId: { type: String },
  vectorized: { type: Boolean, default: false },

  // Metadata
  tags: [String],
  isPublic: { type: Boolean, default: false },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  annotations: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    position: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now }
  }],
  processingTime: { type: Number },
  errorMessage: { type: String }
}, { timestamps: true });

documentSchema.index({ user: 1, createdAt: -1 });
documentSchema.index({ title: 'text', extractedText: 'text' });
documentSchema.index({ 'classification.category': 1 });
documentSchema.index({ tags: 1 });

module.exports = mongoose.model('Document', documentSchema);
