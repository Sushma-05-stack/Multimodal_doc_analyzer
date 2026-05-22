const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class OCRService {
  async extractText(filePath, fileType, language = 'eng') {
    const startTime = Date.now();
    try {
      let result = { text: '', confidence: 0, pageCount: 1, wordCount: 0 };

      switch (fileType) {
        case 'pdf':
          result = await this.extractFromPDF(filePath);
          break;
        case 'docx':
          result = await this.extractFromDOCX(filePath);
          break;
        case 'txt':
          result = await this.extractFromTXT(filePath);
          break;
        case 'image':
          result = await this.extractFromImage(filePath, language);
          break;
        case 'csv':
          result = await this.extractFromTXT(filePath);
          break;
        default:
          result = await this.extractFromTXT(filePath);
      }

      result.wordCount = result.text.split(/\s+/).filter(w => w.length > 0).length;
      result.processingTime = Date.now() - startTime;
      return result;
    } catch (error) {
      logger.error('OCR extraction error:', error);
      throw new Error(`Text extraction failed: ${error.message}`);
    }
  }

  async extractFromPDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return {
      text: data.text || '',
      confidence: 95,
      pageCount: data.numpages || 1,
      metadata: data.info
    };
  }

  async extractFromDOCX(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return {
      text: result.value || '',
      confidence: 98,
      pageCount: 1
    };
  }

  async extractFromTXT(filePath) {
    const text = fs.readFileSync(filePath, 'utf8');
    return { text, confidence: 100, pageCount: 1 };
  }

  async extractFromImage(filePath, language = 'eng') {
    const langMap = {
      'en': 'eng', 'fr': 'fra', 'de': 'deu', 'es': 'spa',
      'it': 'ita', 'pt': 'por', 'ar': 'ara', 'zh': 'chi_sim',
      'ja': 'jpn', 'ko': 'kor', 'ru': 'rus', 'hi': 'hin'
    };
    const tessLang = langMap[language] || 'eng';

    const { data } = await Tesseract.recognize(filePath, tessLang, {
      logger: m => logger.debug(`Tesseract: ${m.status} ${Math.round((m.progress || 0) * 100)}%`)
    });

    return {
      text: data.text || '',
      confidence: data.confidence || 0,
      pageCount: 1,
      words: data.words?.map(w => ({ text: w.text, confidence: w.confidence, bbox: w.bbox }))
    };
  }

  async extractFromAudio(filePath) {
    // Placeholder - integrate with Whisper API or Google Speech-to-Text
    return {
      text: '[Audio transcription requires Whisper API integration]',
      confidence: 0,
      pageCount: 1
    };
  }

  detectLanguage(text) {
    try {
      const franc = require('franc');
      const langCode = franc(text.substring(0, 1000));
      const langMap = {
        'eng': 'en', 'fra': 'fr', 'deu': 'de', 'spa': 'es',
        'ita': 'it', 'por': 'pt', 'ara': 'ar', 'cmn': 'zh',
        'jpn': 'ja', 'kor': 'ko', 'rus': 'ru', 'hin': 'hi'
      };
      return langMap[langCode] || 'en';
    } catch {
      return 'en';
    }
  }
}

module.exports = new OCRService();
