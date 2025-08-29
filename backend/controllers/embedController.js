// backend/controllers/embedController.js
import fs from 'fs';
import path from 'path';
import { embedTexts, embedText } from '../utils/embeddings.js';
import { JsonVectorStore } from '../utils/vectorStore.js';

const STORE_PATH = path.join(process.cwd(), 'backend', 'data', 'book_vectors.json');
const SEED_PATH = path.join(process.cwd(), 'backend', 'tools', 'seedBooks.json');

export async function reindexBooks(req, res) {
	try {
		const seedRaw = fs.readFileSync(SEED_PATH, 'utf8');
		const books = JSON.parse(seedRaw || '[]');
		if (!books.length) return res.status(400).json({ error: 'No books to index' });

		const texts = books.map(b => `${b.title} by ${b.author}. ${b.genre}. ${b.summary}`);
		const vectors = await embedTexts(texts);

		const store = new JsonVectorStore(STORE_PATH).load().clear();
		store.upsertMany(books.map((b, i) => ({ id: b.id, vector: vectors[i], metadata: b }))).save();

		return res.json({ ok: true, indexed: books.length });
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
		const store = new JsonVectorStore(STORE_PATH).load();
		const hits = store.search(qVec, Number(topK) || 5);
		return res.json({ ok: true, results: hits });
	} catch (e) {
		console.error('Search error', e);
		return res.status(500).json({ error: 'Failed to search' });
	}
}
