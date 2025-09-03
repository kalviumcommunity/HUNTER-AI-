// backend/utils/rateLimiter.js
// Simple in-memory per-IP rate limiter (sliding window)
// Not for multi-instance production; replace with Redis-based in prod.

const buckets = new Map();

export function rateLimiter({ windowMs = 60_000, max = 60 } = {}) {
	return function (req, res, next) {
		const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
		const now = Date.now();
		let bucket = buckets.get(key);
		if (!bucket) {
			bucket = [];
			buckets.set(key, bucket);
		}
		// Remove timestamps outside window
		while (bucket.length && (now - bucket[0]) > windowMs) {
			bucket.shift();
		}
		if (bucket.length >= max) {
			return res.status(429).json({ error: 'Too many requests. Please slow down.' });
		}
		bucket.push(now);
		next();
	};
}
