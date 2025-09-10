// backend/scripts/check-pinecone.js
import dotenv from 'dotenv';
dotenv.config();

async function main() {
	try {
		const { PINECONE_API_KEY, PINECONE_INDEX, PINECONE_HOST, VECTOR_DB_NAMESPACE } = process.env;
		if (!PINECONE_API_KEY) throw new Error('PINECONE_API_KEY is missing');
		if (!PINECONE_INDEX) throw new Error('PINECONE_INDEX is missing');

		const { Pinecone } = await import('@pinecone-database/pinecone');
		const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
		const index = pc.index(PINECONE_INDEX, PINECONE_HOST || undefined);

		console.log(`[check] Connecting to index: ${PINECONE_INDEX}`);
		if (PINECONE_HOST) console.log(`[check] Host: ${PINECONE_HOST}`);
		if (index.describeIndexStats) {
			const stats = await index.describeIndexStats();
			console.log('[check] Index stats:', JSON.stringify(stats, null, 2));
		}

		// minimal query to assert readiness (vector length arbitrary here; server may ignore length)
		try {
			await index.query({ vector: [0,0,0], topK: 1, namespace: VECTOR_DB_NAMESPACE || 'books' });
			console.log('[check] Query capability OK');
		} catch (qe) {
			console.warn('[check] Query attempt raised (often harmless if dims mismatch):', qe?.message || qe);
		}

		console.log('\n✅ Pinecone connection OK');
		process.exit(0);
	} catch (e) {
		console.error('\n❌ Pinecone connection failed');
		console.error('Reason:', e?.message || e);
		console.error('\nTroubleshooting:');
		console.error('1) Ensure PINECONE_HOST is a full host (e.g., https://YOUR-INDEX-YOUR-PROJECT.svc.YOUR-ENV.pinecone.io)');
		console.error('2) Remove spaces or quotes; host must be a plain string');
		console.error('3) Verify API key/index/region in Pinecone console');
		process.exit(1);
	}
}

main();
