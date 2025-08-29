// backend/utils/similarity.js

/**
 * Compute cosine similarity between two numeric vectors.
 * Returns a number in [-1, 1]. If a vector is all zeros, returns 0.
 */
export function cosineSimilarity(a = [], b = []) {
	let dot = 0, aMag = 0, bMag = 0;
	const len = Math.min(a.length, b.length);
	for (let i = 0; i < len; i++) {
		const av = a[i] || 0;
		const bv = b[i] || 0;
		dot += av * bv;
		aMag += av * av;
		bMag += bv * bv;
	}
	const denom = Math.sqrt(aMag) * Math.sqrt(bMag);
	if (!denom || !isFinite(denom)) return 0;
	return dot / denom;
}
