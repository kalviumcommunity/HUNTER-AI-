// backend/controllers/embedController.js
import fs from 'fs';
import path from 'path';
import { embedTexts, embedText } from '../utils/embeddings.js';
import { VectorDB } from '../services/vectorDB.js';

const SEED_PATH = path.join(process.cwd(), 'backend', 'tools', 'seedBooks.json');

export async function reindexBooks(req, res) {
	try {
		const seedRaw = fs.readFileSync(SEED_PATH, 'utf8');
		const books = JSON.parse(seedRaw || '[]');
		if (!books.length) return res.status(400).json({ error: 'No books to index' });

		const texts = books.map(b => `${b.title} by ${b.author}. ${b.genre}. ${b.summary}`);
		const vectors = await embedTexts(texts);

		const db = await new VectorDB().init();
		await db.deleteByIds(books.map(b => b.id));
		await db.upsertMany(books.map((b, i) => ({ id: b.id, vector: vectors[i], metadata: b })));

		return res.json({ ok: true, indexed: books.length, driver: db.driver });
	} catch (e) {
		console.error('Reindex error', e);
		return res.status(500).json({ error: 'Failed to reindex' });
	}
}

export async function semanticSearch(req, res) {
	try {
		const { query, topK = 5 } = req.body || {};
		if (!query || typeof query !== 'string') {
			return res.status(400).json({ error: 'query (string) is required' });
		}
		const qVec = await embedText(query);
		const db = await new VectorDB().init();
		const hits = await db.query({ vector: qVec, topK: Number(topK) || 5 });
		return res.json({ ok: true, results: hits, driver: db.driver });
	} catch (e) {
		console.error('Search error', e);
		return res.status(500).json({ error: 'Failed to search' });
	}
}
