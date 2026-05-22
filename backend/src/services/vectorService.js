const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// ── In-memory fallback store ──────────────────────────────────────────────────
class InMemoryVectorStore {
  constructor() {
    this.vectors = new Map();
    this.storePath = path.join(__dirname, '../../data/vectors.json');
    this.load();
  }

  load() {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(this.storePath)) {
        const data = JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
        this.vectors = new Map(Object.entries(data));
      }
    } catch { this.vectors = new Map(); }
  }

  save() {
    try {
      fs.writeFileSync(this.storePath, JSON.stringify(Object.fromEntries(this.vectors)));
    } catch (e) { logger.error('Vector store save error:', e.message); }
  }

  cosineSimilarity(a, b) {
    let dot = 0, nA = 0, nB = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; nA += a[i]*a[i]; nB += b[i]*b[i]; }
    return dot / (Math.sqrt(nA) * Math.sqrt(nB) || 1);
  }

  async upsert(id, vector, metadata = {}) {
    this.vectors.set(id, { vector, metadata, timestamp: Date.now() });
    this.save();
  }

  async query(queryVector, topK = 5, filter = {}) {
    const results = [];
    for (const [id, { vector, metadata }] of this.vectors) {
      if (filter.userId && metadata.userId !== filter.userId) continue;
      results.push({ id, score: this.cosineSimilarity(queryVector, vector), metadata });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  async delete(id) { this.vectors.delete(id); this.save(); }

  deleteByPrefix(prefix) {
    for (const id of this.vectors.keys()) {
      if (id.startsWith(prefix)) this.vectors.delete(id);
    }
    this.save();
  }
}

// ── VectorService ─────────────────────────────────────────────────────────────
class VectorService {
  constructor() {
    this.store = new InMemoryVectorStore();
    this.pineconeIndex = null;
    this.useIntegratedEmbedding = false; // Pinecone handles embeddings itself
    this.initPinecone();
  }

  async initPinecone() {
    if (!process.env.PINECONE_API_KEY) {
      logger.info('Pinecone: no key — using in-memory store');
      return;
    }
    try {
      const { Pinecone } = require('@pinecone-database/pinecone');
      const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
      const indexName = process.env.PINECONE_INDEX || 'document-analyzer';

      // Check if index uses integrated embedding (has embed config)
      const list = await pc.listIndexes();
      const indexInfo = list.indexes?.find(i => i.name === indexName);

      if (indexInfo?.embed?.model) {
        // Index uses Pinecone's built-in embedding model — use inference API
        this.pineconeIndex = pc.index(indexName);
        this.useIntegratedEmbedding = true;
        logger.info(`Pinecone ready — integrated embedding: ${indexInfo.embed.model} (${indexInfo.dimension}-dim)`);
      } else {
        // Standard index — we supply vectors
        this.pineconeIndex = pc.index(indexName);
        this.useIntegratedEmbedding = false;
        logger.info(`Pinecone ready — standard index (${indexInfo?.dimension}-dim)`);
      }
    } catch (e) {
      logger.warn('Pinecone init failed, using in-memory store:', e.message);
      this.pineconeIndex = null;
    }
  }

  // ── Index a document ────────────────────────────────────────────────────────
  async indexDocument(documentId, text, metadata = {}) {
    try {
      const chunks = this.chunkText(text, 500);
      if (chunks.length === 0) return { success: true, chunks: 0 };

      if (this.pineconeIndex && this.useIntegratedEmbedding) {
        // Pinecone generates embeddings — just send text records
        const records = chunks.map((chunk, i) => ({
          id: `${documentId}_chunk_${i}`,
          text: chunk,                          // Pinecone embeds this field
          documentId,
          userId: metadata.userId || '',
          title: metadata.title || '',
          category: metadata.category || '',
          chunkIndex: i,
          excerpt: chunk.substring(0, 300)
        }));

        // Upsert in batches of 50
        for (let i = 0; i < records.length; i += 50) {
          await this.pineconeIndex.upsertRecords(records.slice(i, i + 50));
        }
        logger.info(`Pinecone: indexed ${chunks.length} chunks for doc ${documentId}`);
        return { success: true, chunks: chunks.length };
      }

      if (this.pineconeIndex && !this.useIntegratedEmbedding) {
        // Standard Pinecone — generate embeddings via AI service
        const aiService = require('./aiService');
        const embeddings = await Promise.all(chunks.map(c => aiService.generateEmbedding(c)));
        const vectors = chunks.map((chunk, i) => ({
          id: `${documentId}_chunk_${i}`,
          values: embeddings[i],
          metadata: { ...metadata, documentId, chunkIndex: i, text: chunk.substring(0, 500) }
        }));
        for (let i = 0; i < vectors.length; i += 50) {
          await this.pineconeIndex.upsert(vectors.slice(i, i + 50));
        }
        logger.info(`Pinecone: indexed ${chunks.length} chunks (standard) for doc ${documentId}`);
        return { success: true, chunks: chunks.length };
      }

      // In-memory fallback
      const aiService = require('./aiService');
      for (let i = 0; i < chunks.length; i++) {
        const vec = await aiService.generateEmbedding(chunks[i]);
        await this.store.upsert(`${documentId}_chunk_${i}`, vec, {
          ...metadata, documentId, chunkIndex: i, text: chunks[i].substring(0, 500)
        });
      }
      logger.info(`In-memory: indexed ${chunks.length} chunks for doc ${documentId}`);
      return { success: true, chunks: chunks.length };

    } catch (error) {
      logger.error('Vector indexing error:', error.message);
      throw error;
    }
  }

  // ── Semantic search ─────────────────────────────────────────────────────────
  async semanticSearch(query, userId, topK = 5) {
    try {
      if (this.pineconeIndex && this.useIntegratedEmbedding) {
        // Pinecone integrated search — just send the query text
        const results = await this.pineconeIndex.searchRecords({
          query: { inputs: { text: query }, topK },
          fields: ['documentId', 'excerpt', 'chunkIndex', 'userId']
        });
        return (results.result?.hits || [])
          .filter(h => !userId || h.fields?.userId === userId)
          .map(h => ({
            documentId: h.fields?.documentId,
            score: h._score || 0,
            text: h.fields?.excerpt || '',
            chunkIndex: h.fields?.chunkIndex || 0
          }));
      }

      if (this.pineconeIndex && !this.useIntegratedEmbedding) {
        const aiService = require('./aiService');
        const qVec = await aiService.generateEmbedding(query);
        const results = await this.pineconeIndex.query({
          vector: qVec, topK,
          filter: { userId },
          includeMetadata: true
        });
        return (results.matches || []).map(m => ({
          documentId: m.metadata?.documentId,
          score: m.score || 0,
          text: m.metadata?.text || '',
          chunkIndex: m.metadata?.chunkIndex || 0
        }));
      }

      // In-memory fallback
      const aiService = require('./aiService');
      const qVec = await aiService.generateEmbedding(query);
      const results = await this.store.query(qVec, topK, { userId });
      return results.map(r => ({
        documentId: r.metadata?.documentId,
        score: r.score,
        text: r.metadata?.text || '',
        chunkIndex: r.metadata?.chunkIndex || 0
      }));

    } catch (error) {
      logger.error('Semantic search error:', error.message);
      return [];
    }
  }

  // ── Delete document vectors ─────────────────────────────────────────────────
  async deleteDocumentVectors(documentId) {
    try {
      if (this.pineconeIndex) {
        // Delete by ID prefix
        const ids = Array.from({ length: 100 }, (_, i) => `${documentId}_chunk_${i}`);
        await this.pineconeIndex.deleteMany(ids).catch(() => {});
      } else {
        this.store.deleteByPrefix(documentId);
      }
    } catch (e) {
      logger.warn('Vector deletion error:', e.message);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  chunkText(text, chunkSize = 500, overlap = 100) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const chunks = [];
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 50) chunks.push(chunk);
      if (i + chunkSize >= words.length) break;
    }
    return chunks;
  }
}

module.exports = new VectorService();
