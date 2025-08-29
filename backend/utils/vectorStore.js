// backend/utils/vectorStore.js
import fs from 'fs';
import path from 'path';
import { cosineSimilarity } from './similarity.js';

export class JsonVectorStore {
	constructor(filePath) {
		this.filePath = filePath;
		this.data = { vectors: [] }; // { id, vector:number[], metadata:any }
	}

	load() {
		if (fs.existsSync(this.filePath)) {
			const raw = fs.readFileSync(this.filePath, 'utf8');
			this.data = JSON.parse(raw || '{"vectors":[]}');
		}
		return this;
	}

	save() {
		fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
		fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
		return this;
	}

	clear() {
		this.data = { vectors: [] };
		return this;
	}

	upsertMany(items = []) {
		// items: [{ id, vector, metadata }]
		const idToIndex = new Map(this.data.vectors.map((v, i) => [v.id, i]));
		for (const it of items) {
			if (!it || !it.id) continue;
			if (idToIndex.has(it.id)) {
				this.data.vectors[idToIndex.get(it.id)] = it;
			} else {
				this.data.vectors.push(it);
			}
		}
		return this;
	}

	search(vector = [], topK = 5, filterFn = null) {
		const scored = [];
		for (const v of this.data.vectors) {
			if (filterFn && !filterFn(v)) continue;
			scored.push({
				id: v.id,
				score: cosineSimilarity(vector, v.vector || []),
				metadata: v.metadata
			});
		}
		scored.sort((a, b) => b.score - a.score);
		return scored.slice(0, topK);
	}
}
