#  Hunter – Generative AI Book Recommendation System

##  Overview

**Hunter** is an intelligent, conversational Book Recommendation System powered by Generative AI. Users can interact with the AI to receive personalized book suggestions based on their mood, past preferences, or specific genres. The system integrates modern GenAI capabilities such as Prompting, Retrieval-Augmented Generation (RAG), Structured Output, and Function Calling to ensure accurate, efficient, and scalable recommendations.

---

## Vector Database (RAG)

Hunter supports a production-ready vector DB via a clean abstraction. You can run locally with a JSON-backed store, or use Pinecone in the cloud.

### Configure

Create a `.env` with:

```
# required for AI
GEMINI_API_KEY=your_gemini_key

# optional, retrieval
VECTOR_DB_DRIVER=local            # 'pinecone' or 'local'
VECTOR_DB_NAMESPACE=books
PINECONE_API_KEY=your_pinecone_key   # required if VECTOR_DB_DRIVER=pinecone
PINECONE_INDEX=hunter-books          # your index name
PINECONE_HOST=                       # optional, set if needed by region/deployment
FRONTEND_ORIGIN=http://localhost:5173
PORT=5000
```

### Index seed data

```
curl -X POST http://localhost:5000/api/embed/reindex
```

### Semantic search

```
curl -X POST http://localhost:5000/api/embed/search \
  -H "Content-Type: application/json" \
  -d '{"query":"dragon romance with politics","topK":5}'
```

### Use RAG in recommendations

POST to `/api/recommend` with `useRAG: true`:

```
{
  "userPrompt": "books like Fourth Wing",
  "useRAG": true,
  "topK": 5,
  "temperature": 0.7,
  "topP": 0.9,
  "modelTopK": 40
}
```

---

## Key Features

- Mood and personality-based book suggestions
- Real-time retrieval using vector search (RAG)
- Clean, JSON-based structured outputs
- Interactive function calling (e.g., save to reading list)

---

## Core Concepts and Implementation

### 1. Prompting

**Description:**  
Prompting is used to guide the LLM (e.g., Gemini, GPT, or Mistral) to behave like a helpful, book-loving assistant. Prompts are carefully crafted to ensure tone, structure, and personalization.

**Implementation:**
- Prompts ask the LLM to generate 3 personalized book recommendations
- Inputs include user’s mood, genre, or past reading behavior
- Augmented with retrieved knowledge (via RAG) for context

**Example Prompt:**
```
You are Hunter, a cozy book-loving assistant. Based on the user’s mood or genre, recommend 3 books. Include title, author, summary, and a reason why the user would enjoy it.
```

---

### 2. 📦 Structured Output

**Description:**  
The LLM is instructed to return a clean, structured JSON output that can be directly used by the frontend or backend logic.

**Implementation:**
- Prompt includes format instructions for JSON output
- Output is validated using tools like Pydantic
- Ensures seamless UI integration and action triggering

**Example Output:**
```json
{
  "recommendations": [
    {
      "title": "The Midnight Library",
      "author": "Matt Haig",
      "genre": "Fiction",
      "summary": "A woman explores alternate lives through a magical library.",
      "reason": "You mentioned you enjoy introspective and feel-good stories."
    }
  ]
}

```
---
### 3. Function Calling
**Description:**
Function calling allows the LLM to interact with backend logic such as saving a book to a wishlist, finding similar books, or fetching purchase links.

**Implementation:**

- Define callable functions (e.g., addToReadingList, getSimilarBooks)

- LLM selects and populates the correct function schema

- Backend routes handle the function logic

---

### 4. Retrieval-Augmented Generation (RAG)

**Description:**
RAG improves the quality of recommendations by retrieving relevant book entries from a vector database based on the user’s input.

**Implementation:**

- Book metadata is embedded using Google `text-embedding-004`

- Stored in a vector database (Pinecone or local JSON dev store)

- The top-k relevant books are retrieved and injected into the LLM prompt
