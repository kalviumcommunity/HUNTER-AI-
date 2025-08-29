// backend/test-multishot.js
// Test script to demonstrate multishot prompting capabilities

import { buildPrompt } from './utils/dynamicPrompt.js';

// Test different scenarios to show multishot prompting in action
const testScenarios = [
  {
    name: "Dragon Romance Request",
    input: "I loved Fourth Wing by Rebecca Yarros and want more dragon romance",
    mood: "excited",
    personality: "adventurous"
  },
  {
    name: "Horror Request",
    input: "I want something cosmic horror, not too gory",
    mood: "mysterious",
    personality: "curious"
  },
  {
    name: "Mood-Based Request",
    input: "I'm feeling sad and need something uplifting",
    mood: "sad",
    personality: "sensitive"
  },
  {
    name: "Romance Request",
    input: "I want enemies-to-lovers romance with lots of tension",
    mood: "romantic",
    personality: "passionate"
  },
  {
    name: "Fantasy Request",
    input: "I want epic fantasy with complex world-building like Game of Thrones",
    mood: "adventurous",
    personality: "imaginative"
  }
];

// Mock session state for testing
const mockSessionState = {
  avoidList: ["Fourth Wing", "The Alchemist"],
  recentTurns: [
    { role: "user", text: "I like fantasy books" },
    { role: "assistant", text: '{"recommendations": [{"title": "The Name of the Wind", "author": "Patrick Rothfuss"}]}' }
  ],
  userPreferences: {
    genres: ["fantasy", "romance"],
    themes: ["adventure", "coming-of-age"],
    authors: ["Patrick Rothfuss"],
    readingMood: "adventurous"
  }
};

console.log("🧪 Testing Multishot Prompting System\n");
console.log("=" .repeat(60));

testScenarios.forEach((scenario, index) => {
  console.log(`\n📚 Test ${index + 1}: ${scenario.name}`);
  console.log("-".repeat(40));
  console.log(`User Input: "${scenario.input}"`);
  console.log(`Mood: ${scenario.mood}`);
  console.log(`Personality: ${scenario.personality}`);
  
  try {
    const prompt = buildPrompt({
      input: scenario.input,
      mood: scenario.mood,
      personality: scenario.personality,
      avoidList: mockSessionState.avoidList,
      recentTurns: mockSessionState.recentTurns,
      wantBuyLinks: true,
      userPreferences: mockSessionState.userPreferences
    });
    
    console.log(`\n✅ Prompt generated successfully`);
    console.log(`📏 Prompt length: ${prompt.length} characters`);
    
    // Show a snippet of the prompt
    const promptSnippet = prompt.substring(0, 300) + "...";
    console.log(`\n📝 Prompt snippet:\n${promptSnippet}`);
    
    // Count examples in the prompt
    const exampleCount = (prompt.match(/USER:/g) || []).length;
    console.log(`\n🎯 Examples included: ${exampleCount}`);
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
});

console.log("\n" + "=".repeat(60));
console.log("🎉 Multishot Prompting Test Complete!");
console.log("\nKey Benefits Demonstrated:");
console.log("• Multiple examples per category for better AI learning");
console.log("• Dynamic example selection based on user input");
console.log("• Context-aware prompting with user preferences");
console.log("• Enhanced conversation flow with session memory");
console.log("• Improved recommendation quality through diverse examples");
