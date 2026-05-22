const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Document = require('../models/Document');
const vectorService = require('../services/vectorService');

// @GET /api/search?q=query
router.get('/', protect, asyncHandler(async (req, res) => {
  const { q, type = 'semantic', page = 1, limit = 10 } = req.query;
  if (!q) return res.status(400).json({ success: false, message: 'Query parameter q is required' });

  let results = [];

  if (type === 'semantic') {
    // Semantic vector search
    const vectorResults = await vectorService.semanticSearch(q, req.user.id.toString(), 20);
    const docIds = [...new Set(vectorResults.map(r => r.documentId))];

    const docs = await Document.find({ _id: { $in: docIds }, user: req.user.id })
      .select('title fileType classification summary createdAt');

    results = docs.map(doc => {
      const vectorMatch = vectorResults.find(r => r.documentId === doc._id.toString());
      return {
        document: doc,
        score: vectorMatch?.score || 0,
        excerpt: vectorMatch?.text || doc.summary?.substring(0, 200) || ''
      };
    }).sort((a, b) => b.score - a.score);
  } else {
    // Full-text search
    const docs = await Document.find({
      user: req.user.id,
      $text: { $search: q }
    }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(parseInt(limit))
      .select('title fileType classification summary createdAt extractedText');

    results = docs.map(doc => ({
      document: doc,
      score: 1,
      excerpt: doc.extractedText?.substring(0, 300) || doc.summary?.substring(0, 300) || ''
    }));
  }

  const total = results.length;
  const paginated = results.slice((page - 1) * limit, page * limit);

  res.json({
    success: true,
    query: q,
    type,
    results: paginated,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
  });
}));

// @GET /api/search/suggestions
router.get('/suggestions', protect, asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ success: true, suggestions: [] });

  const docs = await Document.find({
    user: req.user.id,
    title: { $regex: q, $options: 'i' }
  }).limit(5).select('title fileType');

  const keywordDocs = await Document.find({
    user: req.user.id,
    'keywords.word': { $regex: q, $options: 'i' }
  }).limit(5).select('keywords');

  const keywords = keywordDocs.flatMap(d => d.keywords?.map(k => k.word) || [])
    .filter(k => k.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 5);

  res.json({
    success: true,
    suggestions: {
      documents: docs,
      keywords: [...new Set(keywords)]
    }
  });
}));

module.exports = router;
