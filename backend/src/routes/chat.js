const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const ChatSession = require('../models/ChatSession');
const Document = require('../models/Document');
const aiService = require('../services/aiService');
const vectorService = require('../services/vectorService');

// @GET /api/chat/sessions
router.get('/sessions', protect, asyncHandler(async (req, res) => {
  const sessions = await ChatSession.find({ user: req.user.id, isActive: true })
    .sort({ updatedAt: -1 })
    .limit(20)
    .populate('documents', 'title fileType');
  res.json({ success: true, sessions });
}));

// @POST /api/chat/sessions
router.post('/sessions', protect, asyncHandler(async (req, res) => {
  const { documentIds, title } = req.body;
  const session = await ChatSession.create({
    user: req.user.id,
    documents: documentIds || [],
    title: title || 'New Chat'
  });
  res.status(201).json({ success: true, session });
}));

// @GET /api/chat/sessions/:id
router.get('/sessions/:id', protect, asyncHandler(async (req, res) => {
  const session = await ChatSession.findOne({ _id: req.params.id, user: req.user.id })
    .populate('documents', 'title fileType summary');
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  res.json({ success: true, session });
}));

// @POST /api/chat/sessions/:id/message
router.post('/sessions/:id/message', protect, asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }

  const session = await ChatSession.findOne({ _id: req.params.id, user: req.user.id });
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

  // Add user message
  session.messages.push({ role: 'user', content: message });

  // Get document context via semantic search
  let context = '';
  let sources = [];

  if (session.documents.length > 0) {
    const searchResults = await vectorService.semanticSearch(message, req.user.id.toString(), 5);
    const relevantDocs = searchResults.filter(r =>
      session.documents.map(d => d.toString()).includes(r.documentId)
    );

    if (relevantDocs.length > 0) {
      context = relevantDocs.map(r => r.text).join('\n\n');
      sources = relevantDocs.map(r => ({
        documentId: r.documentId,
        excerpt: r.text.substring(0, 200),
        confidence: r.score
      }));
    } else {
      // Fallback: use document summaries
      const docs = await Document.find({ _id: { $in: session.documents } }).select('summary extractedText title');
      context = docs.map(d => `[${d.title}]\n${d.summary || d.extractedText?.substring(0, 2000)}`).join('\n\n---\n\n');
    }
  }

  // Get AI response
  const chatHistory = session.messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
  const { answer, tokens } = await aiService.answerQuestion(message, context, chatHistory);

  // Add assistant message
  session.messages.push({ role: 'assistant', content: answer, sources });
  session.totalTokens += tokens;

  // Auto-update title from first message
  if (session.messages.length === 2) {
    session.title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
  }

  await session.save();

  res.json({
    success: true,
    message: { role: 'assistant', content: answer, sources, timestamp: new Date() },
    session: { id: session._id, title: session.title }
  });
}));

// @DELETE /api/chat/sessions/:id
router.delete('/sessions/:id', protect, asyncHandler(async (req, res) => {
  await ChatSession.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { isActive: false }
  );
  res.json({ success: true, message: 'Session deleted' });
}));

// @POST /api/chat/quick-ask
router.post('/quick-ask', protect, asyncHandler(async (req, res) => {
  const { question, documentId } = req.body;
  if (!question || !documentId) {
    return res.status(400).json({ success: false, message: 'Question and documentId required' });
  }

  const doc = await Document.findOne({ _id: documentId, user: req.user.id });
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

  const context = doc.extractedText || doc.summary || '';
  const { answer } = await aiService.answerQuestion(question, context);

  res.json({ success: true, answer, documentTitle: doc.title });
}));

module.exports = router;
