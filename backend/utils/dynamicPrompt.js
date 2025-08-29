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
 * Enhanced multishot examples library with conversational style
 * Multiple examples per category to improve AI learning and response quality
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
          },
          {
            title: "The Bridge Kingdom",
            author: "Danielle L. Jensen",
            genre: "Fantasy Romance",
            reason: "A fierce heroine infiltrates the enemy king's court through marriage—only to find her mission challenged by real feelings. Perfect for readers who loved the political intrigue and slow-burn romance in Fourth Wing.",
            summary: "A princess trained as an assassin must marry the enemy king to spy on his kingdom, but unexpected feelings complicate her mission."
          }
        ]
      }
    },
    {
      user: "I'm looking for books like The Alchemist - something spiritual and inspiring",
      assistant: {
        recommendations: [
          {
            title: "Siddhartha",
            author: "Hermann Hesse",
            genre: "Philosophical Fiction",
            reason: "A spiritual journey of self-discovery that mirrors The Alchemist's themes of finding one's path and inner wisdom. It's more introspective and philosophical, perfect for readers seeking deeper spiritual insights.",
            summary: "A young Brahmin's quest for enlightenment takes him from his sheltered life to encounters with the Buddha, worldly pleasures, and ultimately profound wisdom."
          },
          {
            title: "The Prophet",
            author: "Kahlil Gibran",
            genre: "Poetry/Philosophy",
            reason: "Beautiful, poetic wisdom that touches on life's deepest questions. Like The Alchemist, it offers gentle guidance and inspiration, but in a more poetic and contemplative style.",
            summary: "A prophet shares profound insights on love, marriage, work, and other fundamental aspects of human existence before departing his adopted city."
          }
        ]
      }
    },
    {
      user: "I want something similar to The Hunger Games but for adults",
      assistant: {
        recommendations: [
          {
            title: "Red Rising",
            author: "Pierce Brown",
            genre: "Science Fiction",
            reason: "A brutal, high-stakes competition in a dystopian society with political intrigue and survival elements. It's more mature and complex than The Hunger Games, with deeper world-building and adult themes.",
            summary: "A low-born miner infiltrates the ruling class through a deadly competition, fighting for survival and revolution in a color-coded caste system."
          },
          {
            title: "The Running Man",
            author: "Stephen King (as Richard Bachman)",
            genre: "Dystopian Thriller",
            reason: "A deadly game show where contestants must survive being hunted. It's darker and more cynical than The Hunger Games, perfect for readers who want the survival elements with adult complexity.",
            summary: "A desperate man enters a deadly reality show where he must evade professional hunters while the entire nation watches and bets on his survival."
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
          },
          {
            title: "Annihilation",
            author: "Jeff VanderMeer",
            genre: "Cosmic Horror/Science Fiction",
            reason: "A mysterious, otherworldly zone that defies understanding. It's cosmic horror through atmosphere and psychological tension rather than gore, perfect for readers who want to feel the vastness of the unknown.",
            summary: "A biologist joins an expedition into Area X, a mysterious zone where nature has been transformed by something beyond human comprehension."
          }
        ]
      }
    },
    {
      user: "I want psychological horror that messes with your mind",
      assistant: {
        recommendations: [
          {
            title: "House of Leaves",
            author: "Mark Z. Danielewski",
            genre: "Psychological Horror",
            reason: "A labyrinthine narrative that literally and figuratively messes with your mind. The story itself becomes a maze, perfect for readers who want horror that challenges their perception of reality.",
            summary: "A family moves into a house that's larger on the inside than the outside, leading to a documentary that becomes increasingly disturbing and impossible to navigate."
          },
          {
            title: "The Silent Patient",
            author: "Alex Michaelides",
            genre: "Psychological Thriller",
            reason: "A woman who shoots her husband and then never speaks again. It's psychological horror through mystery and unreliable narration, perfect for readers who want to question everything they think they know.",
            summary: "A criminal psychotherapist becomes obsessed with a woman who murdered her husband and then stopped speaking, leading to a shocking revelation."
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
          },
          {
            title: "A Man Called Ove",
            author: "Fredrik Backman",
            genre: "Contemporary Fiction",
            reason: "A grumpy old man whose life is changed by his new neighbors. It's uplifting through human connection and finding purpose, perfect for readers who need to see that it's never too late to find joy.",
            summary: "A curmudgeonly widower's life is turned upside down when a boisterous family moves in next door, leading to unexpected friendships and healing."
          }
        ]
      }
    },
    {
      user: "I'm stressed and need something light and funny",
      assistant: {
        recommendations: [
          {
            title: "Good Omens",
            author: "Terry Pratchett & Neil Gaiman",
            genre: "Fantasy Comedy",
            reason: "A hilarious take on the apocalypse with an angel and demon trying to prevent it. It's witty, clever, and laugh-out-loud funny - perfect for when you need to escape stress with humor.",
            summary: "An angel and demon, who have become friends over millennia, try to prevent the apocalypse while dealing with a misplaced Antichrist and heavenly bureaucracy."
          },
          {
            title: "The Rosie Project",
            author: "Graeme Simsion",
            genre: "Romantic Comedy",
            reason: "A socially awkward genetics professor's quest to find love through a scientific questionnaire. It's charming, funny, and heartwarming - perfect for readers who need something light and uplifting.",
            summary: "A brilliant but socially inept professor creates a questionnaire to find the perfect wife, but love has other plans when he meets the unpredictable Rosie."
          }
        ]
      }
    }
  ],
  romance: [
    {
      user: "I want enemies-to-lovers romance with lots of tension",
      assistant: {
        recommendations: [
          {
            title: "The Hating Game",
            author: "Sally Thorne",
            genre: "Contemporary Romance",
            reason: "Two coworkers who absolutely despise each other are forced to compete for the same promotion. The tension is electric and the banter is sharp - perfect for readers who love the slow burn of enemies becoming lovers.",
            summary: "Lucy and Joshua are office rivals who compete for the same promotion, but their intense dislike for each other might be masking deeper feelings."
          },
          {
            title: "Red, White & Royal Blue",
            author: "Casey McQuiston",
            genre: "Contemporary Romance",
            reason: "The First Son of the United States and the Prince of Wales start as rivals but fall in love. It's enemies-to-lovers with political intrigue and lots of delicious tension.",
            summary: "When a public altercation between the First Son and Prince of Wales threatens international relations, they're forced to fake a friendship that becomes something much more."
          }
        ]
      }
    }
  ],
  fantasy: [
    {
      user: "I want epic fantasy with complex world-building like Game of Thrones",
      assistant: {
        recommendations: [
          {
            title: "The Way of Kings",
            author: "Brandon Sanderson",
            genre: "Epic Fantasy",
            reason: "A massive, intricately crafted world with multiple cultures, magic systems, and political factions. It's as complex as Game of Thrones but with a more optimistic tone and unique magic system.",
            summary: "In a world of storms and magic, a disgraced soldier, a young scholar, and a slave all become entangled in a war that could change everything."
          },
          {
            title: "The Name of the Wind",
            author: "Patrick Rothfuss",
            genre: "Epic Fantasy",
            reason: "Beautiful prose and a meticulously crafted world with deep magic systems. It's more focused on one character's journey than Game of Thrones but with equally rich world-building and storytelling.",
            summary: "The story of Kvothe, from his childhood in a troupe of traveling players to his years as a near-mythical wizard, told in his own voice."
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

/**
 * Compose the final prompt with multishot examples.
 *  - system: persona+safety+style
 *  - instructions: task + schema
 *  - context: mood/personality + recent history + avoid list + user preferences
 *  - examples: multiple diverse examples for better AI learning
 */
export function buildPrompt({
  input,
  mood,
  personality,
  avoidList = [],
  recentTurns = [],
  wantBuyLinks = false,
  userPreferences = {}
}) {
  const { lang, persona, callToolsHint, avoidRepeat } = runtimePolicy({
    input,
    mood,
    personality,
    wantBuyLinks
  });

  // Select multiple relevant examples for better learning
  const selectedExamples = selectRelevantExamples(input, mood, personality);

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
- Learn from the examples provided to understand the style and depth expected
- Consider the user's reading history and preferences when making recommendations
`.trim();

  const historyText = recentTurns
    .slice(-6)
    .map(t => `${t.role.toUpperCase()}: ${t.text}`)
    .join("\n");

  const examplesText = selectedExamples
    .map(ex => `USER: ${ex.user}\nASSISTANT(JSON): ${JSON.stringify(ex.assistant)}`)
    .join("\n\n");

  // Enhanced user context with preferences
  const userContext = `
User context:
- Mood: ${mood || "Not specified"}
- Personality: ${personality || "Not specified"}
- Reading Preferences: ${userPreferences.genres?.length ? `Genres: ${userPreferences.genres.join(", ")}` : "Not specified"}
- Favorite Themes: ${userPreferences.themes?.length ? userPreferences.themes.join(", ") : "Not specified"}
- Preferred Authors: ${userPreferences.authors?.length ? userPreferences.authors.join(", ") : "Not specified"}
- avoidList: ${avoidList.length ? avoidList.join("; ") : "[]"}
`.trim();

  const task = `
The user said: "${input || "No input"}"

${userContext}

Your task: Provide 3-5 personalized book recommendations that feel like you're having a conversation with a friend who loves books. Each recommendation should include a detailed explanation of why it's perfect for this user, plus a brief plot summary to help them decide.

Consider the user's reading history, preferred genres, and themes when making recommendations. If they've shown preferences for certain types of books, try to include some that align with those preferences while also introducing them to new possibilities.

Study the examples above to understand the expected style, depth, and structure of responses.

${OUTPUT_SCHEMA}
`.trim();

  // the whole thing the model sees
  const finalPrompt = [system, historyText && `\nHistory:\n${historyText}`, examplesText && `\nExamples:\n${examplesText}`, task]
    .filter(Boolean)
    .join("\n\n");

  return finalPrompt;
}
