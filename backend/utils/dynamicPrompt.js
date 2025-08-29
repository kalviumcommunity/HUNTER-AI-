// backend/utils/dynamicPrompt.js
import { systemPrompt as baseSystem } from "./prompt.js";

/**
 * Lightweight language detector (no deps). Returns 'en' by default.
 */
function detectLang(text = "") {
  // super basic: if Devanagari chars present → 'hi', else 'en'
  return /[\u0900-\u097F]/.test(text) ? "hi" : "en";
}

/**
 * Enhanced few-shot examples library with conversational style
 */
const EXAMPLES = {
  default: [
    {
      user: "I loved Fourth Wing by Rebecca Yarros and want more dragon romance",
      assistant: {
        recommendations: [
          { 
            title: "Fireborne", 
            author: "Rosaria Munda", 
            genre: "Fantasy Romance",
            reason: "Two dragon-riding cadets compete for leadership in a post-revolutionary society. Expect political intrigue, dragon battles, and a sizzling, complicated bond. A hit with fans of Fourth Wing's training-school and dragon dynamics.",
            summary: "A thrilling fantasy where dragon riders navigate power, politics, and forbidden romance in a world rebuilding after revolution."
          }
        ]
      }
    }
  ],
  horror: [
    {
      user: "something cosmic horror, not too gory",
      assistant: {
        recommendations: [
          { 
            title: "The Ballad of Black Tom", 
            author: "Victor LaValle", 
            genre: "Cosmic Horror",
            reason: "Lovecraftian dread with modern heart - perfect for readers who want cosmic horror without excessive gore. It's atmospheric, intelligent, and deeply unsettling.",
            summary: "A jazz musician in 1920s Harlem becomes entangled with cosmic forces beyond human comprehension."
          }
        ]
      }
    }
  ],
  mood_based: [
    {
      user: "I'm feeling sad and need something uplifting",
      assistant: {
        recommendations: [
          { 
            title: "The House in the Cerulean Sea", 
            author: "TJ Klune", 
            genre: "Fantasy",
            reason: "A heartwarming story about finding family and acceptance. It's like a warm hug in book form - perfect for when you need comfort and hope.",
            summary: "A caseworker visits an orphanage for magical children and discovers love, acceptance, and the true meaning of home."
          }
        ]
      }
    }
  ]
};

/**
 * Enhanced JSON schema with more detailed fields
 */
export const OUTPUT_SCHEMA = `
Return ONLY JSON with this shape:
{
  "recommendations": [
    {
      "title": string,
      "author": string,
      "genre": string,
      "reason": string (detailed explanation why this book matches the user's request),
      "summary": string (brief plot summary),
      "metadata"?: {
        "isbn10"?: string,
        "isbn13"?: string,
        "categories"?: string[],
        "thumbnail"?: string,
        "description"?: string
      },
      "buyLinks"?: [
        { "marketplace": "amazon"|"flipkart", "link": string }
      ]
    }
  ]
}

IMPORTANT: Make the "reason" field conversational and detailed, explaining specifically why this book matches what the user asked for. Include context about themes, writing style, or similar books they might have enjoyed.
`;

/**
 * Rules that vary with runtime signals.
 */
function runtimePolicy({ input, mood, personality, wantBuyLinks }) {
  const lang = detectLang(input);
  const persona =
    personality?.toLowerCase().includes("warm") || mood?.toLowerCase().includes("comfort")
      ? "warm, encouraging, clear"
      : "gruff, witty, concise";

  const callToolsHint = wantBuyLinks
    ? `If helpful, call tools to fetch metadata and buy links before answering.`
    : `Call tools only if necessary (e.g., metadata missing).`;

  const avoidRepeat = `Do not repeat books already suggested in this session if 'avoidList' is provided.`;

  return { lang, persona, callToolsHint, avoidRepeat };
}

/**
 * Compose the final prompt.
 *  - system: persona+safety+style
 *  - instructions: task + schema
 *  - context: mood/personality + recent history + avoid list
 *  - examples: chosen dynamically by mood/persona
 */
export function buildPrompt({
  input,
  mood,
  personality,
  avoidList = [],
  recentTurns = [],
  wantBuyLinks = false
}) {
  const { lang, persona, callToolsHint, avoidRepeat } = runtimePolicy({
    input,
    mood,
    personality,
    wantBuyLinks
  });

  // choose examples based on input content
  let exKey = "default";
  if ((mood || "").toLowerCase().includes("horror") || (input || "").toLowerCase().includes("horror")) {
    exKey = "horror";
  } else if ((input || "").toLowerCase().includes("sad") || (input || "").toLowerCase().includes("uplifting")) {
    exKey = "mood_based";
  }
  const examples = EXAMPLES[exKey];

  const system = `
You are Hunter, a ${persona} book recommendation AI who loves helping readers discover their next favorite book.

${baseSystem.replace("gruff, sarcastic, and a bit cynical, but ultimately helpful and knowledgeable.", "").trim()}

Your personality: You're enthusiastic about books and love making connections between what readers enjoy and what they might discover next. You're conversational, warm, and genuinely excited to share book recommendations.

General rules:
- Write in language: ${lang}.
- Be culturally relevant to India when suggesting marketplaces.
- Keep recommendations engaging and conversational.
- ${callToolsHint}
- ${avoidRepeat}
- Always explain WHY each book is perfect for the user's request
- Include brief plot summaries to help users understand what they're getting into
- Make the "reason" field detailed and personal - explain the connection between the user's request and the book
`.trim();

  const historyText = recentTurns
    .slice(-6)
    .map(t => `${t.role.toUpperCase()}: ${t.text}`)
    .join("\n");

  const examplesText = examples
    .map(ex => `USER: ${ex.user}\nASSISTANT(JSON): ${JSON.stringify(ex.assistant)}`)
    .join("\n\n");

  const task = `
The user said: "${input || "No input"}"

User context:
- Mood: ${mood || "Not specified"}
- Personality: ${personality || "Not specified"}
- avoidList: ${avoidList.length ? avoidList.join("; ") : "[]"}

Your task: Provide 3-5 personalized book recommendations that feel like you're having a conversation with a friend who loves books. Each recommendation should include a detailed explanation of why it's perfect for this user, plus a brief plot summary to help them decide.

${OUTPUT_SCHEMA}
`.trim();

  // the whole thing the model sees
  const finalPrompt = [system, historyText && `\nHistory:\n${historyText}`, examplesText && `\nExamples:\n${examplesText}`, task]
    .filter(Boolean)
    .join("\n\n");

  return finalPrompt;
}
