const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Document = require('../models/Document');
const aiService = require('../services/aiService');

// @POST /api/analysis/compare
router.post('/compare', protect, asyncHandler(async (req, res) => {
  const { docId1, docId2 } = req.body;
  const [doc1, doc2] = await Promise.all([
    Document.findOne({ _id: docId1, user: req.user.id }),
    Document.findOne({ _id: docId2, user: req.user.id })
  ]);

  if (!doc1 || !doc2) {
    return res.status(404).json({ success: false, message: 'One or both documents not found' });
  }

  const comparison = await aiService.compareDocuments(
    doc1.extractedText || doc1.summary,
    doc2.extractedText || doc2.summary
  );

  res.json({
    success: true,
    comparison,
    documents: [
      { id: doc1._id, title: doc1.title, type: doc1.fileType },
      { id: doc2._id, title: doc2.title, type: doc2.fileType }
    ]
  });
}));

// @POST /api/analysis/summarize/:id
router.post('/summarize/:id', protect, asyncHandler(async (req, res) => {
  const { length = 'medium', language = 'en' } = req.body;
  const doc = await Document.findOne({ _id: req.params.id, user: req.user.id });
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

  const summary = await aiService.summarize(doc.extractedText, { length, language });

  if (length === 'medium') {
    doc.summary = summary;
    await doc.save();
  }

  res.json({ success: true, summary, documentId: doc._id });
}));

// @GET /api/analysis/flashcards/:id
router.get('/flashcards/:id', protect, asyncHandler(async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, user: req.user.id });
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

  let flashcards = doc.flashcards;
  if (!flashcards || flashcards.length === 0) {
    flashcards = await aiService.generateFlashcards(doc.extractedText);
    doc.flashcards = flashcards;
    await doc.save();
  }

  res.json({ success: true, flashcards, documentTitle: doc.title });
}));

// @GET /api/analysis/resume/:id
router.get('/resume/:id', protect, asyncHandler(async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, user: req.user.id });
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

  let resumeScore = doc.resumeScore;
  if (!resumeScore || !resumeScore.overall) {
    resumeScore = await aiService.scoreResume(doc.extractedText);
    doc.resumeScore = resumeScore;
    await doc.save();
  }

  res.json({ success: true, resumeScore, documentTitle: doc.title });
}));

// @GET /api/analysis/fraud/:id
router.get('/fraud/:id', protect, asyncHandler(async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, user: req.user.id });
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

  let fraudAnalysis = doc.fraudAnalysis;
  if (!fraudAnalysis || !fraudAnalysis.riskLevel) {
    fraudAnalysis = await aiService.detectInvoiceFraud(doc.extractedText);
    doc.fraudAnalysis = fraudAnalysis;
    await doc.save();
  }

  res.json({ success: true, fraudAnalysis, documentTitle: doc.title });
}));

// @POST /api/analysis/batch
router.post('/batch', protect, asyncHandler(async (req, res) => {
  const { documentIds, analysisType } = req.body;
  const docs = await Document.find({ _id: { $in: documentIds }, user: req.user.id });

  const results = await Promise.allSettled(
    docs.map(async doc => {
      switch (analysisType) {
        case 'sentiment': return { id: doc._id, result: await aiService.analyzeSentiment(doc.extractedText) };
        case 'entities': return { id: doc._id, result: await aiService.extractEntities(doc.extractedText) };
        case 'topics': return { id: doc._id, result: await aiService.extractTopics(doc.extractedText) };
        default: return { id: doc._id, result: null };
      }
    })
  );

  res.json({
    success: true,
    results: results.map((r, i) => ({
      documentId: docs[i]._id,
      title: docs[i].title,
      status: r.status,
      data: r.status === 'fulfilled' ? r.value.result : null,
      error: r.status === 'rejected' ? r.reason.message : null
    }))
  });
}));

module.exports = router;
