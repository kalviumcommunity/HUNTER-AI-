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
		this.logger = opts.logger || console;
		this.namespace = opts.namespace || process.env.VECTOR_DB_NAMESPACE || 'books';
		this.localPath = opts.localPath || path.join(process.cwd(), 'backend', 'data', `${this.namespace}_vectors.json`);
		this.pineconeIndexName = opts.pineconeIndex || process.env.PINECONE_INDEX || 'hunter-books';
		this.pineconeApiKey = opts.pineconeApiKey || process.env.PINECONE_API_KEY || '';
		this.pineconeHost = opts.pineconeHost || process.env.PINECONE_HOST || '';
	}

	async init() {
		if (this.driver === 'pinecone') {
			try {
				Pinecone = Pinecone || (await import('@pinecone-database/pinecone')).Pinecone;
				const pc = new Pinecone({ apiKey: this.pineconeApiKey });
				this.index = pc.index(this.pineconeIndexName, this.pineconeHost ? { host: this.pineconeHost } : undefined);
				this.logger.info(`[VectorDB] Pinecone initialized: index=${this.pineconeIndexName}`);
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

	async upsertMany(items = []) {
		if (this.driver === 'pinecone') {
			const vectors = items.map(it => ({ id: String(it.id), values: it.vector, metadata: it.metadata || {} }));
			await this.index.upsert(vectors);
			return { upserted: vectors.length };
		}
		if (this.driver === 'local') {
			this.index.upsertMany(items).save();
			return { upserted: items.length };
		}
	}

	async query({ vector, topK = 5, filter = undefined, metric = 'cosine' }) {
		if (this.driver === 'pinecone') {
			const res = await this.index.query({ vector, topK, includeMetadata: true, namespace: this.namespace });
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
			await this.index.deleteMany(ids);
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

