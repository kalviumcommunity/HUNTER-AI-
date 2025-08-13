// backend/controllers/recommendController.js
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { systemPrompt, userPrompt as userPromptTpl } from "../utils/prompt.js";
import { searchBookMetadata, findBuyLinks, saveToReadingList } from "../tools/bookTools.js";

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Tool schemas Gemini uses to decide when/how to call your functions
const functionDeclarations = [
  {
    name: "searchBookMetadata",
    description: "Get real book metadata from Google Books by title/author.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Book title" },
        author: { type: "string", description: "Author name (optional)" },
      },
      required: ["title"],
    },
  },
  {
    name: "findBuyLinks",
    description: "Find buy links for a book on Amazon/Flipkart (India).",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        author: { type: "string" },
        marketplaces: {
          type: "array",
          items: { type: "string", enum: ["amazon", "flipkart"] },
          description: "Defaults to both if not set.",
        },
        maxResults: { type: "integer", minimum: 1, maximum: 10, default: 3 },
      },
      required: ["title"],
    },
  },
  {
    name: "saveToReadingList",
    description: "Save a recommended book to the user's reading list.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        author: { type: "string" },
        reason: { type: "string" },
      },
      required: ["title"],
    },
  },
];

// Small helper to run the tool the model asks for
async function runTool(name, args) {
  const argObj = typeof args === "string" ? JSON.parse(args) : args;
  switch (name) {
    case "searchBookMetadata":
      return await searchBookMetadata(argObj);
    case "findBuyLinks":
      return await findBuyLinks(argObj);
    case "saveToReadingList":
      return await saveToReadingList(argObj);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export const handleGeminiRecommendation = async (req, res) => {
  try {
    const { mood, personality, temperature = 0.7, userPrompt: customUserPrompt } = req.body;
    const prompt = [
      systemPrompt.trim(),
      userPromptTpl({ mood, personality, customUserPrompt }).trim(),
      // Tell the model *how* to use tools and the JSON we expect back:
      `You may call tools to enrich recommendations with real metadata and buy links.
Return JSON:
{
  "recommendations": [
    {
      "title": string,
      "author": string,
      "reason": string,
      "metadata"?: {
        "isbn10"?: string,
        "isbn13"?: string,
        "categories"?: string[],
        "thumbnail"?: string,
        "description"?: string
      },
      "buyLinks"?: [
        { "marketplace": "amazon"|"flipkart", "link": string, "title"?: string, "snippet"?: string }
      ]
    }
  ]
}
If needed, first call searchBookMetadata, then optionally findBuyLinks.`,
    ].join("\n\n");

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // you can try "gemini-2.0-flash" if enabled for your account
      tools: { functionDeclarations },
    });

    // We’ll do a lightweight tool loop: ask → maybe call tool(s) → reply
    const history = [];

    // 1) Send user prompt
    let result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        responseMimeType: "application/json",
      },
    });

    // 2) While the model asks for tools, handle them
    //    (We check every candidate/part for functionCall)
    let guard = 0;
    while (guard++ < 4) {
      const cands = result.response.candidates || [];
      const calls = [];
      for (const c of cands) {
        const parts = c.content?.parts || [];
        for (const p of parts) {
          if (p.functionCall) calls.push(p.functionCall);
        }
      }
      if (!calls.length) break;

      // For simplicity, run the *last* function call (common pattern)
      const call = calls[calls.length - 1];
      const toolResponse = await runTool(call.name, call.args || {});

      // 3) Feed the functionResponse back so the model can finish
      result = await model.generateContent({
        contents: [
          { role: "user", parts: [{ text: prompt }] },
          // echo the tool call so the model has grounding
          { role: "model", parts: [{ functionCall: call }] },
          { role: "user", parts: [{ functionResponse: { name: call.name, response: toolResponse } }] },
        ],
        generationConfig: {
          temperature,
          responseMimeType: "application/json",
        },
      });
    }

    // 4) Final JSON
    const text = result.response.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text }; // fallback
    }
    res.json(parsed);
  } catch (error) {
    console.error("Error generating book recommendations:", error);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
};
