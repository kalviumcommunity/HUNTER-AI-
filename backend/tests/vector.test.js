// backend/tests/vector.test.js
import { cosineSimilarity } from '../utils/similarity.js';
import { JsonVectorStore } from '../utils/vectorStore.js';
import path from 'path';
import fs from 'fs';

function assert(cond, msg) {
	if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

(async function run() {
	console.log('Running vector and similarity tests...');

	// Cosine similarity basics
	assert(Math.abs(cosineSimilarity([1,0], [1,0]) - 1) < 1e-9, 'cosine(identical) ~ 1');
	assert(Math.abs(cosineSimilarity([1,0], [-1,0]) + 1) < 1e-9, 'cosine(opposite) ~ -1');
	assert(cosineSimilarity([0,0], [1,2]) === 0, 'cosine(zero vector) = 0');

	// Local vector store
	const tmp = path.join(process.cwd(), 'backend', 'data', 'test_vectors.json');
	try { fs.unlinkSync(tmp); } catch {}
	const store = new JsonVectorStore(tmp).load();
	store.upsertMany([
		{ id: 'a', vector: [1,0], metadata: { title: 'A' } },
		{ id: 'b', vector: [0,1], metadata: { title: 'B' } },
		{ id: 'c', vector: [1,1], metadata: { title: 'C' } }
	]).save();

	const q = [0.9, 0.1];
	const hits = store.search(q, 2);
	assert(hits.length === 2, 'topK length');
	assert(hits[0].id === 'a', 'nearest is a');
	console.log('All tests passed.');
})().catch(e => {
	console.error(e);
	process.exit(1);
});
