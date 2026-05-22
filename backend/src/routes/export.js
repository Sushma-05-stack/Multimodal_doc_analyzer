const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Document = require('../models/Document');

// @GET /api/export/:id/pdf
router.get('/:id/pdf', protect, asyncHandler(async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, user: req.user.id });
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

  const pdf = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${doc.title}-analysis.pdf"`);
  pdf.pipe(res);

  // Header
  pdf.fontSize(24).fillColor('#6366f1').text('Document Analysis Report', { align: 'center' });
  pdf.moveDown(0.5);
  pdf.fontSize(10).fillColor('#6b7280').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
  pdf.moveDown(1);

  // Document Info
  pdf.fontSize(16).fillColor('#1f2937').text('Document Information');
  pdf.moveTo(50, pdf.y).lineTo(550, pdf.y).stroke('#e5e7eb');
  pdf.moveDown(0.5);
  pdf.fontSize(11).fillColor('#374151');
  pdf.text(`Title: ${doc.title}`);
  pdf.text(`Type: ${doc.fileType?.toUpperCase()}`);
  pdf.text(`Language: ${doc.language || 'English'}`);
  pdf.text(`Words: ${doc.wordCount?.toLocaleString() || 'N/A'}`);
  pdf.text(`Pages: ${doc.pageCount || 'N/A'}`);
  pdf.text(`Status: ${doc.status}`);
  pdf.moveDown(1);

  // Classification
  if (doc.classification?.category) {
    pdf.fontSize(16).fillColor('#1f2937').text('Classification');
    pdf.moveTo(50, pdf.y).lineTo(550, pdf.y).stroke('#e5e7eb');
    pdf.moveDown(0.5);
    pdf.fontSize(11).fillColor('#374151');
    pdf.text(`Category: ${doc.classification.category}`);
    if (doc.classification.subcategory) pdf.text(`Subcategory: ${doc.classification.subcategory}`);
    pdf.text(`Confidence: ${Math.round((doc.classification.confidence || 0) * 100)}%`);
    pdf.moveDown(1);
  }

  // Summary
  if (doc.summary) {
    pdf.fontSize(16).fillColor('#1f2937').text('AI Summary');
    pdf.moveTo(50, pdf.y).lineTo(550, pdf.y).stroke('#e5e7eb');
    pdf.moveDown(0.5);
    pdf.fontSize(11).fillColor('#374151').text(doc.summary, { align: 'justify' });
    pdf.moveDown(1);
  }

  // Sentiment
  if (doc.sentiment?.overall) {
    pdf.fontSize(16).fillColor('#1f2937').text('Sentiment Analysis');
    pdf.moveTo(50, pdf.y).lineTo(550, pdf.y).stroke('#e5e7eb');
    pdf.moveDown(0.5);
    pdf.fontSize(11).fillColor('#374151');
    pdf.text(`Overall: ${doc.sentiment.overall} (Score: ${doc.sentiment.score?.toFixed(2) || 'N/A'})`);
    pdf.moveDown(1);
  }

  // Entities
  if (doc.entities?.length > 0) {
    pdf.fontSize(16).fillColor('#1f2937').text('Key Entities');
    pdf.moveTo(50, pdf.y).lineTo(550, pdf.y).stroke('#e5e7eb');
    pdf.moveDown(0.5);
    pdf.fontSize(11).fillColor('#374151');
    const grouped = doc.entities.reduce((acc, e) => {
      if (!acc[e.type]) acc[e.type] = [];
      acc[e.type].push(e.text);
      return acc;
    }, {});
    Object.entries(grouped).forEach(([type, items]) => {
      pdf.text(`${type}: ${items.slice(0, 10).join(', ')}`);
    });
    pdf.moveDown(1);
  }

  // Keywords
  if (doc.keywords?.length > 0) {
    pdf.fontSize(16).fillColor('#1f2937').text('Keywords');
    pdf.moveTo(50, pdf.y).lineTo(550, pdf.y).stroke('#e5e7eb');
    pdf.moveDown(0.5);
    pdf.fontSize(11).fillColor('#374151');
    pdf.text(doc.keywords.slice(0, 15).map(k => k.word).join(', '));
    pdf.moveDown(1);
  }

  // Extracted Text
  if (doc.extractedText) {
    pdf.addPage();
    pdf.fontSize(16).fillColor('#1f2937').text('Extracted Text');
    pdf.moveTo(50, pdf.y).lineTo(550, pdf.y).stroke('#e5e7eb');
    pdf.moveDown(0.5);
    pdf.fontSize(10).fillColor('#374151').text(doc.extractedText.substring(0, 5000), { align: 'justify' });
  }

  pdf.end();
}));

// @GET /api/export/:id/csv
router.get('/:id/csv', protect, asyncHandler(async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, user: req.user.id });
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Multimodal Document Analyzer';
  workbook.created = new Date();

  // Overview sheet
  const overviewSheet = workbook.addWorksheet('Overview');
  overviewSheet.columns = [
    { header: 'Field', key: 'field', width: 25 },
    { header: 'Value', key: 'value', width: 60 }
  ];
  overviewSheet.addRows([
    { field: 'Title', value: doc.title },
    { field: 'File Type', value: doc.fileType },
    { field: 'Language', value: doc.language },
    { field: 'Word Count', value: doc.wordCount },
    { field: 'Page Count', value: doc.pageCount },
    { field: 'Category', value: doc.classification?.category || '' },
    { field: 'Sentiment', value: doc.sentiment?.overall || '' },
    { field: 'Sentiment Score', value: doc.sentiment?.score || '' },
    { field: 'OCR Confidence', value: `${doc.ocrConfidence}%` },
    { field: 'Processing Time', value: `${doc.processingTime}ms` }
  ]);

  // Entities sheet
  if (doc.entities?.length > 0) {
    const entitiesSheet = workbook.addWorksheet('Entities');
    entitiesSheet.columns = [
      { header: 'Entity', key: 'text', width: 30 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Confidence', key: 'confidence', width: 15 }
    ];
    doc.entities.forEach(e => entitiesSheet.addRow(e));
  }

  // Keywords sheet
  if (doc.keywords?.length > 0) {
    const keywordsSheet = workbook.addWorksheet('Keywords');
    keywordsSheet.columns = [
      { header: 'Keyword', key: 'word', width: 30 },
      { header: 'Frequency', key: 'frequency', width: 15 },
      { header: 'Relevance', key: 'relevance', width: 15 }
    ];
    doc.keywords.forEach(k => keywordsSheet.addRow(k));
  }

  // Topics sheet
  if (doc.topics?.length > 0) {
    const topicsSheet = workbook.addWorksheet('Topics');
    topicsSheet.columns = [
      { header: 'Topic', key: 'name', width: 30 },
      { header: 'Confidence', key: 'confidence', width: 15 },
      { header: 'Keywords', key: 'keywords', width: 50 }
    ];
    doc.topics.forEach(t => topicsSheet.addRow({ ...t, keywords: t.keywords?.join(', ') }));
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${doc.title}-analysis.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}));

// @POST /api/export/batch/pdf
router.post('/batch/pdf', protect, asyncHandler(async (req, res) => {
  const { documentIds } = req.body;
  const docs = await Document.find({ _id: { $in: documentIds }, user: req.user.id })
    .select('title fileType classification summary sentiment keywords');

  const pdf = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="batch-analysis.pdf"');
  pdf.pipe(res);

  pdf.fontSize(24).fillColor('#6366f1').text('Batch Document Analysis Report', { align: 'center' });
  pdf.moveDown(1);

  docs.forEach((doc, i) => {
    if (i > 0) pdf.addPage();
    pdf.fontSize(18).fillColor('#1f2937').text(`${i + 1}. ${doc.title}`);
    pdf.moveDown(0.5);
    if (doc.classification?.category) pdf.fontSize(11).text(`Category: ${doc.classification.category}`);
    if (doc.sentiment?.overall) pdf.text(`Sentiment: ${doc.sentiment.overall}`);
    if (doc.summary) {
      pdf.moveDown(0.5);
      pdf.fontSize(11).fillColor('#374151').text(doc.summary.substring(0, 500));
    }
  });

  pdf.end();
}));

module.exports = router;
