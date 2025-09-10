// backend/controllers/recommendController.js
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildPrompt } from "../utils/dynamicPrompt.js"; // NEW
import { systemPrompt } from "../utils/prompt.js"; // keep if you want legacy text
import { estimateTokens } from "../utils/tokenizer.js";
import { VectorDB } from "../services/vectorDB.js";

import path from 'path';

const STORE_PATH = path.join(process.cwd(), 'backend', 'data', 'book_vectors.json');

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Enhanced session state with better context tracking
const sessionState = { 
  avoidList: [], 
  recentTurns: [],
  userPreferences: {
    genres: [],
    authors: [],
    themes: [],
    readingMood: null
  },
  conversationContext: []
};

// Enhanced function declarations for better tool integration
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
  },
  {
    name: "getSimilarBooks",
    description: "Find books similar to a given title or author.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        author: { type: "string" },
        genre: { type: "string" }
      },
      required: ["title"]
    }
  }
];

/**
 * Extract user preferences from input for better context
 */
function extractUserPreferences(input, mood, personality) {
  const inputLower = input.toLowerCase();
  const preferences = {
    genres: [],
    authors: [],
    themes: [],
    readingMood: mood || null
  };

  // Genre detection
  const genreKeywords = {
    fantasy: ['fantasy', 'magic', 'dragon', 'wizard', 'epic'],
    romance: ['romance', 'love', 'relationship', 'dating'],
    horror: ['horror', 'scary', 'thriller', 'suspense'],
    scifi: ['science fiction', 'sci-fi', 'space', 'future', 'technology'],
    mystery: ['mystery', 'detective', 'crime', 'investigation'],
    historical: ['historical', 'period', 'ancient', 'medieval'],
    contemporary: ['contemporary', 'modern', 'realistic', 'current']
  };

  Object.entries(genreKeywords).forEach(([genre, keywords]) => {
    if (keywords.some(keyword => inputLower.includes(keyword))) {
      preferences.genres.push(genre);
    }
  });

  // Theme detection
  const themeKeywords = {
    'coming-of-age': ['coming of age', 'growing up', 'adolescence', 'teen'],
    'family': ['family', 'parent', 'child', 'sibling'],
    'friendship': ['friend', 'friendship', 'companionship'],
    'adventure': ['adventure', 'journey', 'quest', 'exploration'],
    'political': ['political', 'government', 'power', 'leadership'],
    'philosophical': ['philosophy', 'meaning', 'purpose', 'existence']
  };

  Object.entries(themeKeywords).forEach(([theme, keywords]) => {
    if (keywords.some(keyword => inputLower.includes(keyword))) {
      preferences.themes.push(theme);
    }
  });

  // Author detection (basic)
  const authorPattern = /by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i;
  const authorMatch = input.match(authorPattern);
  if (authorMatch) {
    preferences.authors.push(authorMatch[1]);
  }

  return preferences;
}

/**
 * Update session state with new information
 */
function updateSessionState(input, mood, personality, recommendations) {
  const newPreferences = extractUserPreferences(input, mood, personality);
  
  // Update user preferences
  sessionState.userPreferences.genres = [...new Set([...sessionState.userPreferences.genres, ...newPreferences.genres])];
  sessionState.userPreferences.themes = [...new Set([...sessionState.userPreferences.themes, ...newPreferences.themes])];
  sessionState.userPreferences.authors = [...new Set([...sessionState.userPreferences.authors, ...newPreferences.authors])];
  if (newPreferences.readingMood) {
    sessionState.userPreferences.readingMood = newPreferences.readingMood;
  }

  // Update avoid list with new recommendations
  const newTitles = (recommendations || []).map(r => r.title).filter(Boolean);
  sessionState.avoidList.push(...newTitles);
  sessionState.avoidList = Array.from(new Set(sessionState.avoidList)).slice(-30);

  // Update conversation context
  sessionState.conversationContext.push({
    userInput: input,
    mood: mood,
    personality: personality,
    recommendations: recommendations,
    timestamp: new Date()
  });

  // Keep only recent context (last 10 interactions)
  sessionState.conversationContext = sessionState.conversationContext.slice(-10);

  // Update recent turns for prompt building
  sessionState.recentTurns.push({ role: "user", text: input || "" });
  sessionState.recentTurns.push({ role: "assistant", text: JSON.stringify(recommendations) });
  sessionState.recentTurns = sessionState.recentTurns.slice(-12);
}

export const handleGeminiRecommendation = async (req, res) => {
  try {
    const {
      userPrompt: input,
      mood,
      personality,
      wantBuyLinks = true,
      temperature = 0.7,
      useRAG = false,
      topK = 5,
      topP = 0.9,
      modelTopK = 40
    } = req.body || {};

    // Optional retrieval
    let retrieved = [];
    if (useRAG) {
      try {
        const db = await new VectorDB().init();
        // Only query if store has data; local driver exposes data length
        let canQuery = true;
        if (db.driver === 'local') {
          canQuery = (db.index?.data?.vectors || []).length > 0;
        }
        if (canQuery) {
          const { embedText } = await import('../utils/embeddings.js');
          const qVec = await embedText(input || `${mood || ''} ${personality || ''}`.trim());
          retrieved = await db.query({ vector: qVec, topK: Math.min(Number(topK) || 5, 10) });
        }
      } catch (e) {
        console.warn('RAG retrieval failed:', e?.message || e);
      }
    }

    // 1) Build the enhanced dynamic prompt with multishot examples
    const prompt = buildPrompt({
      input,
      mood,
      personality,
      avoidList: sessionState.avoidList,
      recentTurns: sessionState.recentTurns,
      wantBuyLinks,
      userPreferences: sessionState.userPreferences,
      retrieved
    });

    const estimatedPromptTokens = estimateTokens(prompt);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      tools: { functionDeclarations }
    });

    // 2) Generate content with enhanced context
    let result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        responseMimeType: 'application/json',
        topP,
        topK: modelTopK
      }
    });

    // 3) Handle function calls if they occur
    const cands = result.response.candidates || [];
    const pendingCall = cands
      .flatMap(c => (c.content?.parts || []))
      .find(p => p.functionCall)?.functionCall;

    if (pendingCall) {
      console.log("Function call detected:", pendingCall.name);
    }

    // 4) Expect JSON per mode-based schema; repair if needed
    let outText = result.response.text();
    const estimatedResponseTokens = estimateTokens(outText);
    let data;
    try {
      data = JSON.parse(outText);
    } catch {
      const start = outText.indexOf("{");
      const end = outText.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        const sliced = outText.slice(start, end + 1);
        try { data = JSON.parse(sliced); } catch {}
      }
    }

    // Fallback: if parsing still failed, treat as chat message
    if (!data || typeof data !== 'object') {
      data = { mode: 'chat', message: outText };
    }

    // Normalize recommendation array shape
    if (data.mode === 'recommendation') {
      const books = Array.isArray(data.books) ? data.books : [];
      updateSessionState(input, mood, personality, books);
    } else if (data.mode === 'chat+recommend') {
      const parts = Array.isArray(data.parts) ? data.parts : [];
      const books = parts
        .filter(p => p && p.type === 'recommendation' && p.book)
        .map(p => p.book);
      updateSessionState(input, mood, personality, books);
    } else {
      updateSessionState(input, mood, personality, []);
    }

    res.json(data);
  } catch (error) {
    console.error("Error generating recommendations:", error);
    const errorResponse = {
      error: "Failed to generate recommendations",
      message: error.message,
      context: {
        sessionState: {
          conversationLength: sessionState.conversationContext.length,
          lastInput: sessionState.recentTurns[sessionState.recentTurns.length - 1]?.text || "None"
        }
      }
    };
    res.status(500).json(errorResponse);
  }
};
