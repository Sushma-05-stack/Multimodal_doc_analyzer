const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  sources: [{
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    excerpt: String,
    page: Number,
    confidence: Number
  }],
  timestamp: { type: Date, default: Date.now }
});

const chatSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
  title: { type: String, default: 'New Chat' },
  messages: [messageSchema],
  isActive: { type: Boolean, default: true },
  model: { type: String, default: 'gpt-4o' },
  totalTokens: { type: Number, default: 0 }
}, { timestamps: true });

chatSessionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
