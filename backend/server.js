import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import recommendRoute from './routes/recommend.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/recommend', recommendRoute);

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
