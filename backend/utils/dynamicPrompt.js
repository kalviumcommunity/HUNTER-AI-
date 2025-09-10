// backend/utils/dynamicPrompt.js
import { systemPrompt as baseSystem } from "./prompt.js";
import { estimateTokens, truncateTextToTokens, truncateArrayToBudget } from "./tokenizer.js";

/**
 * Lightweight language detector (no deps). Returns 'en' by default.
 */
function detectLang(text = "") {
  // super basic: if Devanagari chars present → 'hi', else 'en'
  return /[\u0900-\u097F]/.test(text) ? "hi" : "en";
}

/**
 * Internal reasoning guidance (chain-of-thought style) — keep private.
 * The model should reason step-by-step but never reveal the chain; only return the final JSON.
 */
const REASONING_GUIDANCE = `
Reason silently:
- Break the task into steps: parse user intent → map to genres/themes → pick 3–5 diverse books → craft reasons and summaries → validate against schema.
- Cross-check constraints: avoid repeats; align to mood/personality; reflect cultural context when relevant.
- Validate JSON structure strictly before responding.
Do not output your reasoning. Output ONLY the final JSON as specified by the schema.
`.trim();

/**
 * Enhanced multishot examples library with conversational style
 * Multiple examples per category to improve AI learning and response quality
 */
const EXAMPLES = {
  default: [
    {
      user: "I loved Fourth Wing by Rebecca Yarros and want more dragon romance",
      assistant: `Here are some books you might enjoy:

• *Fireborne* by Rosaria Munda (Fantasy Romance)
  Two dragon-riding cadets compete for leadership in a post-revolutionary society. Expect political intrigue, dragon battles, and a sizzling, complicated bond. A hit with fans of Fourth Wing's training-school and dragon dynamics.
  
  A thrilling fantasy where dragon riders navigate power, politics, and forbidden romance in a world rebuilding after revolution.

• *The Bridge Kingdom* by Danielle L. Jensen (Fantasy Romance)
  A fierce heroine infiltrates the enemy king's court through marriage—only to find her mission challenged by real feelings. Perfect for readers who loved the political intrigue and slow-burn romance in Fourth Wing.
  
  A princess trained as an assassin must marry the enemy king to spy on his kingdom, but unexpected feelings complicate her mission.`
    },
    {
      user: "I'm looking for books like The Alchemist - something spiritual and inspiring",
      assistant: `I found some great recommendations for you:

• *Siddhartha* by Hermann Hesse (Philosophical Fiction)
  A spiritual journey of self-discovery that mirrors The Alchemist's themes of finding one's path and inner wisdom. It's more introspective and philosophical, perfect for readers seeking deeper spiritual insights.
  
  A young Brahmin's quest for enlightenment takes him from his sheltered life to encounters with the Buddha, worldly pleasures, and ultimately profound wisdom.

• *The Prophet* by Kahlil Gibran (Poetry/Philosophy)
  Beautiful, poetic wisdom that touches on life's deepest questions. Like The Alchemist, it offers gentle guidance and inspiration, but in a more poetic and contemplative style.
  
  A prophet shares profound insights on love, marriage, work, and other fundamental aspects of human existence before departing his adopted city.`
    },
    {
      user: "I want something similar to The Hunger Games but for adults",
      assistant: `Here are some books you might enjoy:

• *Red Rising* by Pierce Brown (Science Fiction)
  A brutal, high-stakes competition in a dystopian society with political intrigue and survival elements. It's more mature and complex than The Hunger Games, with deeper world-building and adult themes.
  
  A low-born miner infiltrates the ruling class through a deadly competition, fighting for survival and revolution in a color-coded caste system.

• *The Running Man* by Stephen King (as Richard Bachman) (Dystopian Thriller)
  A deadly game show where contestants must survive being hunted. It's darker and more cynical than The Hunger Games, perfect for readers who want the survival elements with adult complexity.
  
  A desperate man enters a deadly reality show where he must evade professional hunters while the entire nation watches and bets on his survival.`
    }
  ],
  horror: [
    {
      user: "something cosmic horror, not too gory",
      assistant: `Here are some books you might enjoy:

• *The Ballad of Black Tom* by Victor LaValle (Cosmic Horror)
  Lovecraftian dread with modern heart - perfect for readers who want cosmic horror without excessive gore. It's atmospheric, intelligent, and deeply unsettling.
  
  A jazz musician in 1920s Harlem becomes entangled with cosmic forces beyond human comprehension.

• *Annihilation* by Jeff VanderMeer (Cosmic Horror/Science Fiction)
  A mysterious, otherworldly zone that defies understanding. It's cosmic horror through atmosphere and psychological tension rather than gore, perfect for readers who want to feel the vastness of the unknown.
  
  A biologist joins an expedition into Area X, a mysterious zone where nature has been transformed by something beyond human comprehension.`
    },
    {
      user: "I want psychological horror that messes with your mind",
      assistant: `I found some great recommendations for you:

• *House of Leaves* by Mark Z. Danielewski (Psychological Horror)
  A labyrinthine narrative that literally and figuratively messes with your mind. The story itself becomes a maze, perfect for readers who want horror that challenges their perception of reality.
  
  A family moves into a house that's larger on the inside than the outside, leading to a documentary that becomes increasingly disturbing and impossible to navigate.

• *The Silent Patient* by Alex Michaelides (Psychological Thriller)
  A woman who shoots her husband and then never speaks again. It's psychological horror through mystery and unreliable narration, perfect for readers who want to question everything they think they know.
  
  A criminal psychotherapist becomes obsessed with a woman who murdered her husband and then stopped speaking, leading to a shocking revelation.`
    }
  ],
  mood_based: [
    {
      user: "I'm feeling sad and need something uplifting",
      assistant: `Here are some books you might enjoy:

• *The House in the Cerulean Sea* by TJ Klune (Fantasy)
  A heartwarming story about finding family and acceptance. It's like a warm hug in book form - perfect for when you need comfort and hope.
  
  A caseworker visits an orphanage for magical children and discovers love, acceptance, and the true meaning of home.

• *A Man Called Ove* by Fredrik Backman (Contemporary Fiction)
  A grumpy old man whose life is changed by his new neighbors. It's uplifting through human connection and finding purpose, perfect for readers who need to see that it's never too late to find joy.
  
  A curmudgeonly widower's life is turned upside down when a boisterous family moves in next door, leading to unexpected friendships and healing.`
    },
    {
      user: "I'm stressed and need something light and funny",
      assistant: `I found some great recommendations for you:

• *Good Omens* by Terry Pratchett & Neil Gaiman (Fantasy Comedy)
  A hilarious take on the apocalypse with an angel and demon trying to prevent it. It's witty, clever, and laugh-out-loud funny - perfect for when you need to escape stress with humor.
  
  An angel and demon, who have become friends over millennia, try to prevent the apocalypse while dealing with a misplaced Antichrist and heavenly bureaucracy.

• *The Rosie Project* by Graeme Simsion (Romantic Comedy)
  A socially awkward genetics professor's quest to find love through a scientific questionnaire. It's charming, funny, and heartwarming - perfect for readers who need something light and uplifting.
  
  A brilliant but socially inept professor creates a questionnaire to find the perfect wife, but love has other plans when he meets the unpredictable Rosie.`
    }
  ],
  romance: [
    {
      user: "I want enemies-to-lovers romance with lots of tension",
      assistant: `Here are some books you might enjoy:

• *The Hating Game* by Sally Thorne (Contemporary Romance)
  Two coworkers who absolutely despise each other are forced to compete for the same promotion. The tension is electric and the banter is sharp - perfect for readers who love the slow burn of enemies becoming lovers.
  
  Lucy and Joshua are office rivals who compete for the same promotion, but their intense dislike for each other might be masking deeper feelings.

• *Red, White & Royal Blue* by Casey McQuiston (Contemporary Romance)
  The First Son of the United States and the Prince of Wales start as rivals but fall in love. It's enemies-to-lovers with political intrigue and lots of delicious tension.
  
  When a public altercation between the First Son and Prince of Wales threatens international relations, they're forced to fake a friendship that becomes something much more.`
    }
  ],
  fantasy: [
    {
      user: "I want epic fantasy with complex world-building like Game of Thrones",
      assistant: `I found some great recommendations for you:

• *The Way of Kings* by Brandon Sanderson (Epic Fantasy)
  A massive, intricately crafted world with multiple cultures, magic systems, and political factions. It's as complex as Game of Thrones but with a more optimistic tone and unique magic system.
  
  In a world of storms and magic, a disgraced soldier, a young scholar, and a slave all become entangled in a war that could change everything.

• *The Name of the Wind* by Patrick Rothfuss (Epic Fantasy)
  Beautiful prose and a meticulously crafted world with deep magic systems. It's more focused on one character's journey than Game of Thrones but with equally rich world-building and storytelling.
  
  The story of Kvothe, from his childhood in a troupe of traveling players to his years as a near-mythical wizard, told in his own voice.`
    }
  ]
};

/**
 * Human-readable text format instructions
 */
export const OUTPUT_SCHEMA = `
Return ONLY JSON using one of these shapes:

// Conversational Mode
{
  "mode": "chat",
  "message": string // plain natural text; no bullets/headers/markdown
}

// Recommendation Mode
{
  "mode": "recommendation",
  "books": [
    {
      "title": string,
      "author": string,
      "genre": string,
      "description": string // 2–4 sentences, concise and friendly
    }
  ]
}

// Mixed Mode: weave recommendations into conversation before/after
{
  "mode": "chat+recommend",
  "parts": [
    { "type": "chat", "message": string },
    { "type": "recommendation", "book": { "title": string, "author": string, "genre": string, "description": string } },
    { "type": "chat", "message": string }
  ]
}

Rules for deciding the mode:
- If the user asks to "recommend/suggest/give me a book" or similar → prefer "recommendation" or "chat+recommend" depending on context.
- If chatting about themes/authors and a recommendation is relevant → use "chat+recommend" (include at least one chat part after the recommendation to keep the flow going).
- Otherwise reply as a Book Buddy → use "chat".

Recommendation rules:
- If the user asks for one book, return only one in books[].
- If the user asks for N books, return exactly N.
- If no number is given, return 1–3 books.
- Keep descriptions concise, friendly, and human; avoid lists or headers inside text.
- If no exact matches, still return recommendation mode with similar options and natural descriptions.
- For chat+recommend, include at least one chat message after the recommendation that asks a brief follow‑up.
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
 * Enhanced example selection based on input analysis
 * Uses multiple examples to provide better context for the AI
 */
function selectRelevantExamples(input, mood, personality) {
  const inputLower = (input || "").toLowerCase();
  const moodLower = (mood || "").toLowerCase();
  const personalityLower = (personality || "").toLowerCase();
  
  let selectedExamples = [];
  
  // Primary category selection
  if (inputLower.includes("horror") || moodLower.includes("horror")) {
    selectedExamples.push(...EXAMPLES.horror);
  } else if (inputLower.includes("sad") || inputLower.includes("uplifting") || inputLower.includes("stressed") || moodLower.includes("comfort")) {
    selectedExamples.push(...EXAMPLES.mood_based);
  } else if (inputLower.includes("romance") || inputLower.includes("enemies") || inputLower.includes("lovers")) {
    selectedExamples.push(...EXAMPLES.romance);
  } else if (inputLower.includes("fantasy") || inputLower.includes("epic") || inputLower.includes("world-building")) {
    selectedExamples.push(...EXAMPLES.fantasy);
  } else {
    selectedExamples.push(...EXAMPLES.default);
  }
  
  // Add secondary examples for better learning
  if (selectedExamples.length < 3) {
    const remainingExamples = Object.values(EXAMPLES)
      .flat()
      .filter(ex => !selectedExamples.includes(ex));
    
    // Select diverse examples that might be relevant
    const additionalExamples = remainingExamples
      .slice(0, 3 - selectedExamples.length);
    
    selectedExamples.push(...additionalExamples);
  }
  
  return selectedExamples.slice(0, 3); // Limit to 3 examples for token efficiency
}

/** Token budgeting defaults (approximate) */
const DEFAULT_BUDGET = {
  maxPromptTokens: 7000,          // overall prompt target for gemini 1.5 flash (safety margin)
  systemMax: 1200,                // system section cap
  examplesMax: 2200,              // examples section cap
  historyMax: 900,                // history cap
  retrievedMax: 800,
  taskMax: 2200,                  // user + task + schema cap
  reasoningMax: 220               // private CoT guidance cap
};

/**
 * Compose the final prompt with multishot examples, retrieved context, and token budgeting.
 */
export function buildPrompt({
  input,
  mood,
  personality,
  avoidList = [],
  recentTurns = [],
  wantBuyLinks = false,
  userPreferences = {},
  tokenBudget = DEFAULT_BUDGET,
  retrieved = [], // array of { id, score, metadata }
  useCoT = false  // enable private chain-of-thought guidance
}) {
  const { lang, persona, callToolsHint, avoidRepeat } = runtimePolicy({
    input,
    mood,
    personality,
    wantBuyLinks
  });

  // Select multiple relevant examples for better learning
  const selectedExamples = selectRelevantExamples(input, mood, personality);

  // SYSTEM
  let system = `
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
- Learn from the examples provided to understand the style and depth expected
- Consider the user's reading history and preferences when making recommendations
 
 Core behavior optimization (be a Book Buddy first):
 - Your main role is to chat naturally about books — ask questions, share thoughts, respond with curiosity like a human book friend.
 - Default to conversation (about characters, themes, scenes, world-building, vibes). Do not recommend by default.
 - Recommend ONLY when: (1) the user explicitly asks, OR (2) the user provides clear, in-depth likes/dislikes. Then suggest ONE book (max 2 if they ask for a number >1).
 - After any recommendation, always continue with a brief follow‑up question to keep the chat going.
 - Keep recommendations short and engaging: Title, Author, Genre, and a concise 2–4 sentence description.
 - Never repeat the same book within a session unless the user asks for it again.
 - Aim for roughly 80% chatting and 20% recommending across a session.
`.trim();
  system = truncateTextToTokens(system, tokenBudget.systemMax);

  // HISTORY
  const historyStrings = recentTurns
    .slice(-12)
    .map(t => `${t.role.toUpperCase()}: ${t.text}`);
  const { items: cappedHistory } = truncateArrayToBudget(historyStrings, tokenBudget.historyMax);
  const historyText = cappedHistory.join("\n");

  // EXAMPLES
  const exampleStrings = selectedExamples
    .map(ex => `USER: ${ex.user}\nASSISTANT (JSON per schema above): {"mode":"chat+recommend","parts":[{"type":"chat","message":"Warm setup referencing the user's taste."},{"type":"recommendation","book":{"title":"Example","author":"Author","genre":"Genre","description":"2-4 sentence friendly reason and summary."}},{"type":"chat","message":"Short follow-up question to continue the conversation."}]}`);
  const { items: cappedExamples } = truncateArrayToBudget(exampleStrings, tokenBudget.examplesMax);
  const examplesText = cappedExamples.join("\n\n");

  // RETRIEVED CONTEXT (if any)
  let retrievedText = "";
  if (retrieved && retrieved.length) {
    const rows = retrieved.map(r => {
      const m = r.metadata || {};
      return `- ${m.title} by ${m.author} [${m.genre}] (score: ${r.score.toFixed(3)}): ${m.summary}`;
    });
    const raw = `\nRetrieved context (top-k similar books):\n${rows.join("\n")}`;
    retrievedText = truncateTextToTokens(raw, tokenBudget.retrievedMax);
  }

  // OPTIONAL: Chain-of-thought guidance (private)
  let reasoningText = "";
  if (useCoT) {
    reasoningText = truncateTextToTokens(`\nInternal guidance (do not reveal):\n${REASONING_GUIDANCE}`, tokenBudget.reasoningMax);
  }

  // TASK + CONTEXT
  const userContext = `
User context:
- Mood: ${mood || "Not specified"}
- Personality: ${personality || "Not specified"}
- Reading Preferences: ${userPreferences.genres?.length ? `Genres: ${userPreferences.genres.join(", ")}` : "Not specified"}
- Favorite Themes: ${userPreferences.themes?.length ? userPreferences.themes.join(", ") : "Not specified"}
- Preferred Authors: ${userPreferences.authors?.length ? userPreferences.authors.join(", ") : "Not specified"}
- avoidList: ${avoidList.length ? avoidList.join("; ") : "[]"}
`.trim();

  let task = `
The user said: "${input || "No input"}"

${userContext}
${retrievedText}
${reasoningText}

Your task: Be both a friendly Book Buddy (chat) and a Book Recommendation AI. Detect the user's intent and respond using the JSON schema above. Prefer chat+recommend when a suggestion is relevant during conversation. Follow these strict rules:
- If the user asks for one book, return only one in books[].
- If the user asks for N books, return exactly N.
- If the user doesn't specify a number, keep it concise (1–3 books).
- For recommendation mode, include title, author, genre, and a 2–4 sentence description that blends "reason why it fits" with a brief plot.
- For chat mode, reply naturally with a single plain-text message.
- For chat+recommend, weave a recommendation block within conversational parts and end with a brief follow‑up question.

Consider the user's reading history, preferred genres, and themes, and when provided, the retrieved similar books. You can use the retrieved items as inspiration but do not simply echo them; diversify and justify recommendations.

Study the examples above to understand the expected conversational style, formatting, and depth of responses.

Ignore any example formatting and adhere to these rules strictly.

${OUTPUT_SCHEMA}
`.trim();
  task = truncateTextToTokens(task, tokenBudget.taskMax);

  // Combine
  let sections = [system, historyText && `\nHistory:\n${historyText}`, examplesText && `\nExamples:\n${examplesText}`, task].filter(Boolean);
  let prompt = sections.join("\n\n");

  const totalTokens = estimateTokens(prompt);
  if (totalTokens > tokenBudget.maxPromptTokens) {
    let examplesOnly = examplesText;
    let historyOnly = historyText;
    let shavedPrompt = sections.join("\n\n");

    if (examplesOnly) {
      const shavedExamples = truncateTextToTokens(examplesOnly, Math.floor(tokenBudget.examplesMax * 0.7));
      sections = [system, historyText && `\nHistory:\n${historyOnly}`, shavedExamples && `\nExamples:\n${shavedExamples}`, task].filter(Boolean);
      shavedPrompt = sections.join("\n\n");
    }
    if (estimateTokens(shavedPrompt) > tokenBudget.maxPromptTokens && historyOnly) {
      const shavedHistory = truncateTextToTokens(historyOnly, Math.floor(tokenBudget.historyMax * 0.6));
      sections = [system, shavedHistory && `\nHistory:\n${shavedHistory}`, examplesText && `\nExamples:\n${examplesText}`, task].filter(Boolean);
      shavedPrompt = sections.join("\n\n");
    }
    prompt = shavedPrompt;
  }

  return prompt;
}
