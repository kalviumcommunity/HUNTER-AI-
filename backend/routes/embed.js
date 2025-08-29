import express from 'express';
import { reindexBooks, semanticSearch } from '../controllers/embedController.js';

const router = express.Router();

router.post('/reindex', reindexBooks);
router.post('/search', semanticSearch);

export default router;
