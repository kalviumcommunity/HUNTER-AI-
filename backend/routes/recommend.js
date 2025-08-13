import express from 'express';
import { handleGeminiRecommendation } from '../controllers/recommendController.js';

const router = express.Router();
router.post('/', handleGeminiRecommendation);
export default router;
