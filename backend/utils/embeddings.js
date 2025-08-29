// backend/utils/embeddings.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "./config.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

export async function embedTexts(texts = []) {
	if (!Array.isArray(texts)) throw new Error("embedTexts expects an array of strings");
	if (texts.length === 0) return [];
	const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
	// API supports batch embeddings by passing an array of contents
	const result = await model.embedContent({
		contents: texts.map(t => ({ role: "user", parts: [{ text: String(t ?? "") }] }))
	});
	const vectors = result.embeddings?.map(e => e.values) || [];
	return vectors;
}

export async function embedText(text = "") {
	const [vec] = await embedTexts([text]);
	return vec || [];
}
