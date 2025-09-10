// backend/services/vectorDB.js
// Abstraction for vector database operations.
// Supports Pinecone (cloud) and LocalJson (fallback for dev) drivers.

import path from 'path';
import fs from 'fs';
import { JsonVectorStore } from '../utils/vectorStore.js';

let Pinecone; // lazy import to avoid dependency errors if not installed

export class VectorDB {
	constructor(opts = {}) {
		this.driver = opts.driver || process.env.VECTOR_DB_DRIVER || 'local';
		this.index = null;
		this.nsIndex = null; // namespaced index handle (pinecone v6)
		this.logger = opts.logger || console;
		this.namespace = opts.namespace || process.env.VECTOR_DB_NAMESPACE || 'books';
		this.localPath = opts.localPath || path.join(process.cwd(), 'backend', 'data', `${this.namespace}_vectors.json`);
		this.pineconeIndexName = opts.pineconeIndex || process.env.PINECONE_INDEX || 'hunter-books';
		this.pineconeApiKey = opts.pineconeApiKey || process.env.PINECONE_API_KEY || '';
		this.pineconeHost = opts.pineconeHost || process.env.PINECONE_HOST || '';
		this.targetDim = Number(opts.dim || process.env.PINECONE_DIM) || undefined; // optional normalization
	}

	async init() {
		if (this.driver === 'pinecone') {
			try {
				Pinecone = Pinecone || (await import('@pinecone-database/pinecone')).Pinecone;
				const pc = new Pinecone({ apiKey: this.pineconeApiKey });
				// Pass host as a string (not an options object) to avoid url.trim errors
				this.index = pc.index(this.pineconeIndexName, this.pineconeHost || undefined);
				// create namespaced handle if supported
				this.nsIndex = typeof this.index.namespace === 'function' ? this.index.namespace(this.namespace) : this.index;

				// Auto-detect index dimension (best-effort)
				const indexDim = await this.detectIndexDimension();
				// Probe embedding dimension using current embeddings util
				let embedDim;
				try {
					const { embedText } = await import('../utils/embeddings.js');
					const v = await embedText('__dim_probe__');
					embedDim = Array.isArray(v) ? v.length : undefined;
				} catch {}

				if (indexDim && embedDim && indexDim !== embedDim) {
					this.targetDim = indexDim; // normalize to index dimension to avoid runtime errors
					this.logger.warn(`[VectorDB] Embedding dimension (${embedDim}) does not match Pinecone index dimension (${indexDim}). Normalizing vectors to ${indexDim}. Consider recreating the index at ${embedDim} to avoid padding/truncation.`);
				}

				this.logger.info(`[VectorDB] Pinecone initialized: index=${this.pineconeIndexName}, namespace=${this.namespace}${this.targetDim ? `, dim=${this.targetDim}` : ''}`);
			} catch (e) {
				this.logger.error('[VectorDB] Pinecone init failed, falling back to local', e?.message || e);
				this.driver = 'local';
			}
		}
		if (this.driver === 'local') {
			this.index = new JsonVectorStore(this.localPath).load();
			this.logger.info(`[VectorDB] Local JSON store initialized: ${this.localPath}`);
		}
		return this;
	}

	async detectIndexDimension() {
		try {
			if (!this.index) return undefined;
			const handle = this.nsIndex || this.index;
			// Try a noop query to trigger an informative error containing the index dimension
			await handle.query({ vector: [0], topK: 1 });
		} catch (e) {
			const msg = String(e?.message || '');
			// Extract all numbers; prefer the largest (>1) as the index dimension
			const nums = [...msg.matchAll(/\b(\d+)\b/g)].map(m => Number(m[1])).filter(n => Number.isFinite(n));
			if (nums.length) {
				const best = nums.filter(n => n > 1).sort((a,b)=>b-a)[0] || nums[0];
				return best;
			}
		}
		// Fallback to env override if provided
		return Number(process.env.PINECONE_DIM) || undefined;
	}

	normalizeVector(vec = []) {
		if (!this.targetDim || !Array.isArray(vec)) return vec;
		const out = new Array(this.targetDim);
		for (let i = 0; i < this.targetDim; i++) out[i] = vec[i] ?? 0;
		return out;
	}

	async upsertMany(items = []) {
		if (this.driver === 'pinecone') {
			const vectors = items.map(it => ({ id: String(it.id), values: this.normalizeVector(it.vector), metadata: it.metadata || {} }));
			const handle = this.nsIndex || this.index;
			if (typeof handle.upsert === 'function') {
				await handle.upsert(vectors);
			}
			return { upserted: vectors.length };
		}
		if (this.driver === 'local') {
			this.index.upsertMany(items).save();
			return { upserted: items.length };
		}
	}

	async query({ vector, topK = 5, filter = undefined, metric = 'cosine' }) {
		if (this.driver === 'pinecone') {
			const handle = this.nsIndex || this.index;
			const res = await handle.query({ vector: this.normalizeVector(vector), topK, includeMetadata: true, filter });
			const matches = res.matches || [];
			return matches.map(m => ({ id: m.id, score: m.score, metadata: m.metadata }));
		}
		if (this.driver === 'local') {
			const hits = this.index.search(vector, topK, filter);
			return hits;
		}
	}

	async deleteByIds(ids = []) {
		if (!Array.isArray(ids) || ids.length === 0) return { deleted: 0 };
		if (this.driver === 'pinecone') {
			const handle = this.nsIndex || this.index;
			if (typeof handle.deleteMany === 'function') {
				await handle.deleteMany(ids);
			} else if (typeof handle.delete === 'function') {
				await handle.delete({ ids });
			}
			return { deleted: ids.length };
		}
		if (this.driver === 'local') {
			const remain = (this.index.data.vectors || []).filter(v => !ids.includes(v.id));
			this.index.data.vectors = remain;
			this.index.save();
			return { deleted: ids.length };
		}
	}
}

