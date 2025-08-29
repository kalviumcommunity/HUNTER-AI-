import express from 'express';
import { handleGeminiRecommendation } from '../controllers/recommendController.js';

const router = express.Router();

function validateRecommendPayload(req, res, next) {
	const { userPrompt, mood, personality, wantBuyLinks, temperature } = req.body || {};
	if (typeof userPrompt !== 'string' || userPrompt.trim().length === 0) {
		return res.status(400).json({ error: 'userPrompt (string) is required' });
	}
	if (temperature !== undefined && (typeof temperature !== 'number' || temperature < 0 || temperature > 1)) {
		return res.status(400).json({ error: 'temperature must be a number between 0 and 1' });
	}
	if (wantBuyLinks !== undefined && typeof wantBuyLinks !== 'boolean') {
		return res.status(400).json({ error: 'wantBuyLinks must be a boolean' });
	}
	if (mood !== undefined && typeof mood !== 'string') {
		return res.status(400).json({ error: 'mood must be a string' });
	}
	if (personality !== undefined && typeof personality !== 'string') {
		return res.status(400).json({ error: 'personality must be a string' });
	}
	return next();
}

router.post('/', validateRecommendPayload, handleGeminiRecommendation);
export default router;
