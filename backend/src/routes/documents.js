const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const { upload, getFileType } = require('../middleware/upload');
const { asyncHandler } = require('../middleware/errorHandler');
const Document = require('../models/Document');
const ocrService = require('../services/ocrService');
const aiService = require('../services/aiService');
const vectorService = require('../services/vectorService');
const logger = require('../utils/logger');

// @GET /api/documents
router.get('/', protect, asyncHandler(async (req, res) => {
  const { page = 1, limit = 12, category, search, fileType, sortBy = 'createdAt', order = 'desc' } = req.query;
  const query = { user: req.user.id };

  if (category) query['classification.category'] = category;
  if (fileType) query.fileType = fileType;
  if (search) query.$text = { $search: search };

  const total = await Document.countDocuments(query);
  const documents = await Document.find(query)
    .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .select('-extractedText -annotations');

  res.json({
    success: true,
    documents,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
  });
}));

// @POST /api/documents/upload
router.post('/upload', protect, upload.array('files', 10), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'No files uploaded' });
  }

  const documents = [];
  for (const file of req.files) {
    const fileType = getFileType(file.mimetype);
    const doc = await Document.create({
      user: req.user.id,
      title: req.body.title || path.parse(file.originalname).name,
      originalName: file.originalname,
      fileName: file.filename,
      filePath: file.path,
      fileType,
      mimeType: file.mimetype,
      fileSize: file.size,
      status: 'processing'
    });
    documents.push(doc);

    // Process asynchronously
    processDocument(doc._id, file.path, fileType, req.user.id, req.app.get('io'));
  }

  res.status(201).json({ success: true, documents, message: `${documents.length} file(s) uploaded and processing started` });
}));

// @GET /api/documents/:id
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, user: req.user.id });
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
  res.json({ success: true, document: doc });
}));

// @DELETE /api/documents/:id
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, user: req.user.id });
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

  // Delete file
  if (fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);

  // Delete vectors
  await vectorService.deleteDocumentVectors(doc._id.toString());

  await doc.deleteOne();
  res.json({ success: true, message: 'Document deleted successfully' });
}));

// @POST /api/documents/:id/reanalyze
router.post('/:id/reanalyze', protect, asyncHandler(async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, user: req.user.id });
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

  doc.status = 'processing';
  await doc.save();

  processDocument(doc._id, doc.filePath, doc.fileType, req.user.id, req.app.get('io'));
  res.json({ success: true, message: 'Reanalysis started' });
}));

// @POST /api/documents/:id/annotate
router.post('/:id/annotate', protect, asyncHandler(async (req, res) => {
  const { text, position } = req.body;
  const doc = await Document.findOne({ _id: req.params.id, user: req.user.id });
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

  doc.annotations.push({ user: req.user.id, text, position });
  await doc.save();
  res.json({ success: true, document: doc });
}));

// @GET /api/documents/stats/overview
router.get('/stats/overview', protect, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const [total, byType, byCategory, recent] = await Promise.all([
    Document.countDocuments({ user: userId }),
    Document.aggregate([
      { $match: { user: require('mongoose').Types.ObjectId.createFromHexString(userId) } },
      { $group: { _id: '$fileType', count: { $sum: 1 } } }
    ]),
    Document.aggregate([
      { $match: { user: require('mongoose').Types.ObjectId.createFromHexString(userId), 'classification.category': { $ne: '' } } },
      { $group: { _id: '$classification.category', count: { $sum: 1 } } }
    ]),
    Document.find({ user: userId }).sort({ createdAt: -1 }).limit(5).select('title fileType status createdAt')
  ]);

  res.json({ success: true, stats: { total, byType, byCategory, recent } });
}));

async function processDocument(docId, filePath, fileType, userId, io) {
  const startTime = Date.now();
  try {
    const doc = await Document.findById(docId);
    if (!doc) return;

    // Emit processing start
    io?.to(userId.toString()).emit('document:processing', { docId, stage: 'ocr', progress: 10 });

    // OCR / Text extraction
    const ocrResult = await ocrService.extractText(filePath, fileType);
    doc.extractedText = ocrResult.text;
    doc.ocrConfidence = ocrResult.confidence;
    doc.pageCount = ocrResult.pageCount || 1;
    doc.wordCount = ocrResult.wordCount || 0;

    // Detect language
    if (ocrResult.text) {
      doc.language = ocrService.detectLanguage(ocrResult.text);
    }

    io?.to(userId.toString()).emit('document:processing', { docId, stage: 'ai', progress: 40 });

    if (ocrResult.text && ocrResult.text.length > 50) {
      // Run AI analysis in parallel
      const [summary, entities, classification, sentiment, topics, keywords] = await Promise.allSettled([
        aiService.summarize(ocrResult.text, { length: 'medium' }),
        aiService.extractEntities(ocrResult.text),
        aiService.classifyDocument(ocrResult.text, doc.title),
        aiService.analyzeSentiment(ocrResult.text),
        aiService.extractTopics(ocrResult.text),
        aiService.extractKeywords(ocrResult.text)
      ]);

      doc.summary = summary.status === 'fulfilled' ? summary.value : '';
      doc.entities = entities.status === 'fulfilled' ? entities.value : [];
      doc.classification = classification.status === 'fulfilled' ? classification.value : {};
      doc.sentiment = sentiment.status === 'fulfilled' ? sentiment.value : {};
      doc.topics = topics.status === 'fulfilled' ? topics.value : [];
      doc.keywords = keywords.status === 'fulfilled' ? keywords.value : [];

      io?.to(userId.toString()).emit('document:processing', { docId, stage: 'specialized', progress: 70 });

      // Specialized analysis based on document type
      const category = doc.classification?.category?.toLowerCase() || '';
      if (category.includes('resume') || category.includes('cv')) {
        const resumeScore = await aiService.scoreResume(ocrResult.text).catch(() => null);
        if (resumeScore) doc.resumeScore = resumeScore;
      }
      if (category.includes('invoice') || category.includes('receipt')) {
        const fraudAnalysis = await aiService.detectInvoiceFraud(ocrResult.text).catch(() => null);
        if (fraudAnalysis) doc.fraudAnalysis = fraudAnalysis;
      }

      // Generate flashcards for educational content
      if (category.includes('research') || category.includes('academic') || category.includes('notes')) {
        const flashcards = await aiService.generateFlashcards(ocrResult.text).catch(() => []);
        doc.flashcards = flashcards;
      }

      io?.to(userId.toString()).emit('document:processing', { docId, stage: 'vectorizing', progress: 85 });

      // Vector indexing — skip gracefully if it fails
      try {
        await vectorService.indexDocument(docId.toString(), ocrResult.text, {
          userId: userId.toString(),
          title: doc.title,
          category: doc.classification?.category || ''
        });
        doc.vectorized = true;
      } catch (vecErr) {
        logger.warn(`Vector indexing skipped for ${docId}: ${vecErr.message}`);
        doc.vectorized = false;
      }
    }

    doc.status = 'completed';
    doc.processingTime = Date.now() - startTime;
    await doc.save();

    io?.to(userId.toString()).emit('document:completed', { docId, document: doc });
    logger.info(`Document ${docId} processed in ${doc.processingTime}ms`);
  } catch (error) {
    logger.error(`Document processing error for ${docId}:`, error);
    await Document.findByIdAndUpdate(docId, {
      status: 'failed',
      errorMessage: error.message,
      processingTime: Date.now() - startTime
    });
    io?.to(userId.toString()).emit('document:failed', { docId, error: error.message });
  }
}

module.exports = router;
