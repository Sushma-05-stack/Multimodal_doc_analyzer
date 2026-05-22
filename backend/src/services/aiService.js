const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const fs = require('fs');
const logger = require('../utils/logger');

// ── Key detection ─────────────────────────────────────────────────────────────
const hasGemini = !!(process.env.GEMINI_API_KEY &&
  !process.env.GEMINI_API_KEY.startsWith('your_') &&
  process.env.GEMINI_API_KEY.length > 10);

const hasOpenAI = !!(process.env.OPENAI_API_KEY &&
  !process.env.OPENAI_API_KEY.startsWith('your_') &&
  process.env.OPENAI_API_KEY.startsWith('sk-'));

logger.info(`AI Service: Gemini=${hasGemini}, OpenAI=${hasOpenAI}`);

// ── Local fallbacks (no API needed) ──────────────────────────────────────────
function localKeywords(text) {
  const stop = new Set(['the','a','an','and','or','but','in','on','at','to','for','of',
    'with','by','from','is','are','was','were','be','been','have','has','had','do',
    'does','did','will','would','could','should','this','that','it','we','you','they',
    'he','she','as','if','so','not','no','all','each','more','some','just','than',
    'then','when','where','which','who','what','how','into','about','through','while']);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/)
    .filter(w => w.length > 3 && !stop.has(w));
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w]||0)+1; });
  return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,15)
    .map(([word,frequency]) => ({ word, frequency, relevance: Math.min(frequency/10,1) }));
}

function localSummary(text) {
  const sents = text.replace(/\n+/g,' ').split(/[.!?]+/).map(s=>s.trim()).filter(s=>s.length>40);
  if (!sents.length) return 'Document uploaded. Add a Gemini API key for AI summaries.';
  const pick = sents.length<=3 ? sents : [sents[0], sents[Math.floor(sents.length/2)], sents[sents.length-1]];
  return pick.join('. ')+'.';
}

function localClassify(text, title='') {
  const t = (title+' '+text).toLowerCase();
  if (/invoice|receipt|payment|amount due|bill to|total|subtotal/.test(t))
    return { category:'Invoice', subcategory:'Financial Document', confidence:0.75 };
  if (/resume|curriculum vitae|\bcv\b|work experience|education|skills|objective/.test(t))
    return { category:'Resume/CV', subcategory:'Professional Profile', confidence:0.75 };
  if (/contract|agreement|terms|party|whereas|hereinafter|clause/.test(t))
    return { category:'Legal Contract', subcategory:'Legal Document', confidence:0.75 };
  if (/abstract|introduction|methodology|conclusion|references|journal/.test(t))
    return { category:'Research Paper', subcategory:'Academic', confidence:0.75 };
  if (/patient|diagnosis|prescription|doctor|hospital|medical/.test(t))
    return { category:'Medical Record', subcategory:'Healthcare', confidence:0.75 };
  if (/revenue|profit|loss|balance sheet|financial statement|quarterly/.test(t))
    return { category:'Financial Report', subcategory:'Business Finance', confidence:0.75 };
  return { category:'Other', subcategory:'General Document', confidence:0.5 };
}

function localSentiment(text) {
  const pos = (text.match(/good|great|excellent|positive|success|happy|best|improve|benefit|advantage/gi)||[]).length;
  const neg = (text.match(/bad|poor|fail|negative|problem|issue|error|wrong|loss|risk/gi)||[]).length;
  const total = pos+neg||1;
  if (pos > neg*1.5) return { overall:'positive', score:0.5, breakdown:{positive:pos/total,negative:neg/total,neutral:0.2} };
  if (neg > pos*1.5) return { overall:'negative', score:-0.5, breakdown:{positive:pos/total,negative:neg/total,neutral:0.2} };
  return { overall:'neutral', score:0, breakdown:{positive:0.33,negative:0.33,neutral:0.34} };
}

function localEntities(text) {
  const entities = [];
  const patterns = [
    { re:/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, type:'EMAIL' },
    { re:/\b(\+?\d[\d\s\-().]{7,}\d)\b/g, type:'PHONE' },
    { re:/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+ \d{1,2},? \d{4})\b/g, type:'DATE' },
    { re:/\$[\d,]+(\.\d{2})?|\b\d+(\.\d{2})?\s*(USD|EUR|GBP|INR)\b/g, type:'MONEY' },
    { re:/https?:\/\/[^\s]+/g, type:'URL' },
  ];
  for (const {re,type} of patterns)
    for (const m of (text.match(re)||[])) entities.push({ text:m.trim(), type, confidence:0.9 });
  return entities.slice(0,30);
}

// Simple local embedding (384-dim, works with in-memory store)
function localEmbedding(text) {
  const dim = 384;
  const vec = new Array(dim).fill(0);
  const s = text.toLowerCase().substring(0,2000);
  for (let i=0; i<s.length-2; i++) {
    let h=0;
    for (let j=0; j<3; j++) h=(h*31+s.charCodeAt(i+j))&0x7fffffff;
    vec[h%dim]+=1;
  }
  const norm = Math.sqrt(vec.reduce((s,v)=>s+v*v,0))||1;
  return vec.map(v=>v/norm);
}

// ── AIService ─────────────────────────────────────────────────────────────────
class AIService {
  constructor() {
    if (hasGemini) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      // Model fallback chain — tries each in order if rate limited
      this.modelNames = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-flash-latest',
      ];
      this.embedModel = this.genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
      logger.info(`Gemini ready — models: ${this.modelNames.join(', ')}`);
    }
    if (hasOpenAI) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      logger.info('OpenAI ready');
    }
    if (!hasGemini && !hasOpenAI) {
      logger.warn('No AI keys — running in offline mode');
    }
  }

  // ── Core caller with model fallback + retry ────────────────────────────────
  async callAI(prompt, jsonMode = false) {
    // Try Gemini models in order
    if (hasGemini) {
      const modelNames = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-flash-latest',
      ];
      for (const modelName of modelNames) {
        try {
          const model = this.genAI.getGenerativeModel({ model: modelName });
          const fullPrompt = jsonMode
            ? `${prompt}\n\nIMPORTANT: Respond with ONLY valid JSON, no markdown fences, no explanation.`
            : prompt;
          const result = await model.generateContent(fullPrompt);
          const text = result.response.text().trim();
          if (jsonMode) {
            return text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
          }
          return text;
        } catch (e) {
          const isRateLimit = e.message?.includes('429') || e.message?.includes('quota') || e.message?.includes('RESOURCE_EXHAUSTED');
          const isNotFound  = e.message?.includes('404') || e.message?.includes('not found');
          if (isRateLimit || isNotFound) {
            logger.warn(`Gemini ${modelName} unavailable (${isRateLimit?'rate limit':'not found'}), trying next...`);
            await new Promise(r => setTimeout(r, 600));
            continue;
          }
          logger.error(`Gemini ${modelName} error:`, e.message);
          throw e;
        }
      }
      if (!hasOpenAI) {
        throw new Error('All Gemini models rate limited. Please wait a minute and try again.');
      }
    }
    // OpenAI fallback
    if (hasOpenAI) {
      try {
        const res = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role:'user', content: prompt }],
          max_tokens: 2000,
          temperature: jsonMode ? 0.1 : 0.7,
          ...(jsonMode && { response_format:{ type:'json_object' } })
        });
        return res.choices[0].message.content;
      } catch (e) {
        logger.error('OpenAI error:', e.message);
        throw e;
      }
    }
    throw new Error('No AI provider available');
  }

  // ── Public methods ──────────────────────────────────────────────────────────
  async summarize(text, options = {}) {
    const { length='medium', language='en' } = options;
    const lengthMap = { short:'2-3 sentences', medium:'1-2 paragraphs', long:'3-5 paragraphs' };
    if (!hasGemini && !hasOpenAI) return localSummary(text);
    const prompt = `Summarize the following document in ${lengthMap[length]}.${language!=='en'?` Respond in ${language}.`:''} Focus on key points, main arguments, and important findings.\n\nDocument:\n${text.substring(0,12000)}`;
    try { return await this.callAI(prompt); }
    catch { return localSummary(text); }
  }

  async extractEntities(text) {
    if (!hasGemini && !hasOpenAI) return localEntities(text);
    const prompt = `Extract named entities from this text. Return a JSON array of objects with fields: text, type, confidence (0-1). Types allowed: PERSON, ORGANIZATION, LOCATION, DATE, MONEY, EMAIL, PHONE, URL, PRODUCT, EVENT.\n\nText: ${text.substring(0,8000)}`;
    try {
      const r = await this.callAI(prompt, true);
      const parsed = JSON.parse(r);
      return Array.isArray(parsed) ? parsed : (parsed.entities || localEntities(text));
    } catch { return localEntities(text); }
  }

  async classifyDocument(text, title='') {
    if (!hasGemini && !hasOpenAI) return localClassify(text, title);
    const prompt = `Classify this document. Return JSON with fields: category (string), subcategory (string), confidence (0-1), reasoning (string). Categories: Invoice, Resume/CV, Legal Contract, Research Paper, Medical Record, Financial Report, News Article, Academic Paper, Technical Manual, Business Letter, Email, Form, Receipt, Other.\n\nTitle: ${title}\nContent: ${text.substring(0,4000)}`;
    try {
      const r = await this.callAI(prompt, true);
      return JSON.parse(r);
    } catch { return localClassify(text, title); }
  }

  async analyzeSentiment(text) {
    if (!hasGemini && !hasOpenAI) return localSentiment(text);
    const prompt = `Analyze the sentiment of this text. Return JSON with fields: overall (positive|negative|neutral|mixed), score (-1 to 1), breakdown (object with positive/negative/neutral as 0-1 values), tone (formal|informal|technical|conversational).\n\nText: ${text.substring(0,6000)}`;
    try {
      const r = await this.callAI(prompt, true);
      return JSON.parse(r);
    } catch { return localSentiment(text); }
  }

  async extractTopics(text) {
    if (!hasGemini && !hasOpenAI) return localKeywords(text).slice(0,5).map(k=>({ name:k.word, confidence:k.relevance, keywords:[k.word] }));
    const prompt = `Extract the top 5 main topics from this document. Return a JSON array where each item has: name (string), confidence (0-1), keywords (array of strings).\n\nText: ${text.substring(0,8000)}`;
    try {
      const r = await this.callAI(prompt, true);
      const parsed = JSON.parse(r);
      return Array.isArray(parsed) ? parsed : (parsed.topics || []);
    } catch { return []; }
  }

  async extractKeywords(text) {
    if (!hasGemini && !hasOpenAI) return localKeywords(text);
    const prompt = `Extract the top 15 keywords or keyphrases from this text. Return a JSON array where each item has: word (string), frequency (number), relevance (0-1).\n\nText: ${text.substring(0,8000)}`;
    try {
      const r = await this.callAI(prompt, true);
      const parsed = JSON.parse(r);
      return Array.isArray(parsed) ? parsed : (parsed.keywords || localKeywords(text));
    } catch { return localKeywords(text); }
  }

  async scoreResume(text) {
    if (!hasGemini && !hasOpenAI) return { overall:65, sections:{ experience:{score:70,feedback:'Add AI key for detailed scoring'}, skills:{score:60,feedback:'Add AI key for detailed scoring'} }, suggestions:['Add a Gemini API key for full resume scoring'], strengths:['Document uploaded successfully'], atsScore:60, experienceLevel:'mid' };
    const prompt = `Score this resume comprehensively. Return JSON with: overall (0-100), sections (object with contact/summary/experience/education/skills/formatting each having score 0-100 and feedback string), suggestions (array of strings), strengths (array of strings), atsScore (0-100), experienceLevel (entry|mid|senior|executive).\n\nResume: ${text.substring(0,8000)}`;
    try {
      const r = await this.callAI(prompt, true);
      return JSON.parse(r);
    } catch { return { overall:0, sections:{}, suggestions:[] }; }
  }

  async detectInvoiceFraud(text) {
    if (!hasGemini && !hasOpenAI) return { riskLevel:'low', confidence:0.5, flags:[], analysis:{}, recommendation:'Add AI key for fraud detection.' };
    const prompt = `Analyze this invoice for fraud indicators. Return JSON with: riskLevel (low|medium|high|critical), confidence (0-1), flags (array of strings describing issues), analysis (object with boolean fields: duplicateIndicators, amountAnomalies, vendorVerification, dateInconsistencies, formatIrregularities), recommendation (string).\n\nInvoice: ${text.substring(0,6000)}`;
    try {
      const r = await this.callAI(prompt, true);
      return JSON.parse(r);
    } catch { return { riskLevel:'low', confidence:0.5, flags:[] }; }
  }

  async generateFlashcards(text) {
    if (!hasGemini && !hasOpenAI) return [{ question:'What is the main topic of this document?', answer:localSummary(text).substring(0,200) }];
    const prompt = `Generate 10 educational flashcards from this content. Return a JSON array where each item has: question (string), answer (string). Make questions clear and answers concise.\n\nContent: ${text.substring(0,8000)}`;
    try {
      const r = await this.callAI(prompt, true);
      const parsed = JSON.parse(r);
      return Array.isArray(parsed) ? parsed : (parsed.flashcards || []);
    } catch { return []; }
  }

  async answerQuestion(question, context, chatHistory = []) {
    if (!hasGemini && !hasOpenAI) {
      return {
        answer: `I need an AI API key to answer questions.\n\n**To enable chat:**\n1. Get a free Gemini key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)\n2. Add to \`backend/.env\`: \`GEMINI_API_KEY=AIza...\`\n3. Restart the backend`,
        tokens: 0
      };
    }

    const history = chatHistory.slice(-6)
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `You are an intelligent document assistant. Answer questions based ONLY on the provided document context. Be accurate, concise, and cite specific parts when relevant. If the answer is not in the document, say so clearly.

${context ? `Document Context:\n${context.substring(0, 10000)}\n\n` : ''}${history ? `Conversation History:\n${history}\n\n` : ''}User Question: ${question}`;

    // Use callAI which has full model fallback chain
    const answer = await this.callAI(prompt);
    return { answer, tokens: 0 };
  }

  async compareDocuments(text1, text2) {
    if (!hasGemini && !hasOpenAI) {
      const kw1 = new Set(localKeywords(text1).map(k=>k.word));
      const kw2 = new Set(localKeywords(text2).map(k=>k.word));
      const common = [...kw1].filter(k=>kw2.has(k));
      const sim = Math.round((common.length/Math.max(kw1.size,kw2.size,1))*100);
      return { similarity:sim, commonThemes:common.slice(0,5), differences:['Add AI key for detailed comparison'], uniqueToDoc1:[], uniqueToDoc2:[], recommendation:'Add a Gemini API key for AI-powered comparison.' };
    }
    const prompt = `Compare these two documents in detail. Return JSON with: similarity (0-100 integer), commonThemes (array of strings), differences (array of strings), uniqueToDoc1 (array of strings), uniqueToDoc2 (array of strings), recommendation (string summary).\n\nDocument 1:\n${text1.substring(0,4000)}\n\nDocument 2:\n${text2.substring(0,4000)}`;
    try {
      const r = await this.callAI(prompt, true);
      return JSON.parse(r);
    } catch { return { similarity:0, commonThemes:[], differences:[] }; }
  }

  async analyzeImage(imagePath, prompt='Describe this image in detail and extract any visible text.') {
    if (!hasGemini && !hasOpenAI) throw new Error('AI key required for image analysis');
    if (hasGemini) {
      const imageData = fs.readFileSync(imagePath);
      const base64 = imageData.toString('base64');
      const ext = imagePath.split('.').pop().toLowerCase();
      const mimeType = ext==='png'?'image/png':ext==='gif'?'image/gif':'image/jpeg';
      const visionModel = this.genAI.getGenerativeModel({ model:'gemini-1.5-flash' });
      const result = await visionModel.generateContent([
        prompt,
        { inlineData:{ data:base64, mimeType } }
      ]);
      return result.response.text();
    }
    // OpenAI fallback
    const imageData = fs.readFileSync(imagePath);
    const base64 = imageData.toString('base64');
    const ext = imagePath.split('.').pop().toLowerCase();
    const mimeType = ext==='png'?'image/png':ext==='gif'?'image/gif':'image/jpeg';
    const res = await this.openai.chat.completions.create({
      model:'gpt-4o',
      messages:[{ role:'user', content:[{ type:'text', text:prompt },{ type:'image_url', image_url:{ url:`data:${mimeType};base64,${base64}` } }] }],
      max_tokens:1500
    });
    return res.choices[0].message.content;
  }

  // ── Embeddings ──────────────────────────────────────────────────────────────
  async generateEmbedding(text) {
    // Gemini embedding
    if (hasGemini) {
      try {
        const result = await this.embedModel.embedContent(text.substring(0,8000));
        return result.embedding.values;
      } catch (e) {
        logger.warn('Gemini embedding failed, using local:', e.message);
        return localEmbedding(text);
      }
    }
    // OpenAI embedding
    if (hasOpenAI) {
      const res = await this.openai.embeddings.create({ model:'text-embedding-3-small', input:text.substring(0,8000) });
      return res.data[0].embedding;
    }
    return localEmbedding(text);
  }
}

module.exports = new AIService();
