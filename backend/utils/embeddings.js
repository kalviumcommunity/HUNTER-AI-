// backend/utils/embeddings.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "./config.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

export async function embedTexts(texts = []) {
	if (!Array.isArray(texts)) throw new Error("embedTexts expects an array of strings");
	if (texts.length === 0) return [];
	const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
	// Use batchEmbedContents with requests array
	const result = await model.batchEmbedContents({
		requests: texts.map(t => ({
			content: { parts: [{ text: String(t ?? "") }] }
		}))
	});
	const vectors = (result.embeddings || []).map(e => e.values);
	return vectors;
}

export async function embedText(text = "") {
	const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
	const res = await model.embedContent({
		content: { parts: [{ text: String(text ?? "") }] }
	});
	return res.embedding?.values || [];
}
