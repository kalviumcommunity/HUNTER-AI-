import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { systemPrompt } from "../utils/prompt.js"; // ✅ import system prompt
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const handleGeminiRecommendation = async (req, res) => {
  const { userPrompt } = req.body;

  if (!userPrompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // ✅ Combine system and user prompts
    const fullPrompt = `${systemPrompt}\n\nUser: ${userPrompt}`;

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = await response.text();

    res.status(200).json({ result: text });
  } catch (error) {
    console.error("Gemini Error:", error.message);
    res.status(500).json({ error: "Gemini API call failed" });
  }
};
