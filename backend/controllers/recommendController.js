// backend/controllers/recommendController.js
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { systemPrompt, userPrompt } from "../utils/prompt.js";

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const handleGeminiRecommendation = async (req, res) => {
  try {
    const { mood, personality, temperature, userPrompt: customUserPrompt } = req.body;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = `
      ${systemPrompt}
      ${userPrompt(mood, personality)}
      User request: ${customUserPrompt}
      Respond ONLY in valid JSON format:
      {
        "recommendations": [
          {
            "title": "Book title",
            "author": "Author name",
            "genre": "Book genre",
            "description": "Short engaging description"
          }
        ]
      }
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: temperature ?? 0.7,
        responseMimeType: "application/json", // forces JSON output
      }
    });

    const parsed = JSON.parse(result.response.text());
    res.json(parsed);
  } catch (error) {
    console.error("Error generating book recommendations:", error);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
};
