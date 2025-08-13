// backend/controllers/recommendController.js
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { systemPrompt, userPrompt } from "../utils/prompt.js";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const handleGeminiRecommendation = async (req, res) => {
  try {
    const { mood, personality, temperature } = req.body; // temperature comes from frontend

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", 
    });

    const prompt = `${systemPrompt}\n\n${userPrompt(mood, personality)}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: temperature ?? 0.7, // default if not provided
      }
    });

    res.json({ recommendations: result.response.text() });
  } catch (error) {
    console.error("Error generating book recommendations:", error);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
};
