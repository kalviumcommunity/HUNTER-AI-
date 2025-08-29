import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import recommendRoute from './routes/recommend.js';
import embedRoute from './routes/embed.js';
import { config } from './utils/config.js';

dotenv.config();
const app = express();

app.use(cors({
	origin: config.frontendOrigin,
	credentials: true
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
	res.json({ ok: true, service: 'hunter-backend', time: new Date().toISOString() });
});

app.use('/api/recommend', recommendRoute);
app.use('/api/embed', embedRoute);

app.listen(config.port, () => {
	console.log(`Server running on port ${config.port}`);
});
