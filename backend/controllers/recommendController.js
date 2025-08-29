// backend/controllers/recommendController.js
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildPrompt } from "../utils/dynamicPrompt.js"; // NEW
import { systemPrompt } from "../utils/prompt.js"; // keep if you want legacy text

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// In-memory "session" state for demo (replace with Redis/db later)
const sessionState = { avoidList: [], recentTurns: [] };

// Optional: function calling — declare tools only if you added them earlier
const functionDeclarations = [
  {
    name: "searchBookMetadata",
    description: "Get real book metadata from Google Books by title/author.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        author: { type: "string" }
      },
      required: ["title"]
    }
  },
  {
    name: "findBuyLinks",
    description: "Find buy links for a book on Amazon/Flipkart (India).",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        author: { type: "string" }
      },
      required: ["title"]
    }
  }
];

export const handleGeminiRecommendation = async (req, res) => {
  try {
    const {
      userPrompt: input,
      mood,
      personality,
      wantBuyLinks = true,
      temperature = 0.7
    } = req.body || {};

    // 1) Build the dynamic prompt
    const prompt = buildPrompt({
      input,
      mood,
      personality,
      avoidList: sessionState.avoidList,
      recentTurns: sessionState.recentTurns,
      wantBuyLinks
    });

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      tools: { functionDeclarations } // safe even if you don't use them
    });

    // 2) First pass — model may emit function calls or final JSON
    let result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        responseMimeType: "application/json"
      }
    });

    // 3) (Optional) minimal tool loop — skip if you haven’t implemented tools
    const cands = result.response.candidates || [];
    const pendingCall = cands
      .flatMap(c => (c.content?.parts || []))
      .find(p => p.functionCall)?.functionCall;

    if (pendingCall) {
      // You'd run your tool here and send functionResponse back.
      // To keep focus on dynamic prompting, you can omit tool execution for now.
      // Or wire it if you already added bookTools.js earlier.
    }

    // 4) Strict JSON parse + tiny repair fallback
    let outText = result.response.text();
    let data;
    try {
      data = JSON.parse(outText);
    } catch {
      // minimal repair: trim junk before first { and after last }
      const start = outText.indexOf("{");
      const end = outText.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        const sliced = outText.slice(start, end + 1);
        data = JSON.parse(sliced);
      } else {
        throw new Error("Invalid JSON from model");
      }
    }

    // 5) Update avoidList/recentTurns for next call (dynamic memory)
    const newTitles = (data.recommendations || []).map(r => r.title).filter(Boolean);
    sessionState.avoidList.push(...newTitles);
    sessionState.avoidList = Array.from(new Set(sessionState.avoidList)).slice(-30);
    sessionState.recentTurns.push({ role: "user", text: input || "" });
    sessionState.recentTurns.push({ role: "assistant", text: JSON.stringify(data) });
    sessionState.recentTurns = sessionState.recentTurns.slice(-12);

    res.json(data);
  } catch (error) {
    console.error("Error generating recommendations:", error);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
};
