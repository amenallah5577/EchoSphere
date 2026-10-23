# Reproducible setup and design decision

Use Node.js 22, npm and MongoDB 8. From a clean checkout:

```sh
git clone https://github.com/amenallah5577/EchoSphere.git
cd EchoSphere
npm ci
```

Copy `.env.example` to `.env` using `cp` or PowerShell `Copy-Item`. For a private local MongoDB instance:

```sh
docker run -d --name echosphere-local-mongo -p 127.0.0.1:27028:27017 mongo:8
```

Set `MONGODB_URI=mongodb://127.0.0.1:27028/echosphere`, a random `SESSION_SECRET`, and `PORT=3000`. MongoDB creates the history collection on first write; Mongoose declares its owner index. No SQL migration or fixture seed is required. For research, configure `GROQ_API_KEY`, `TAVILY_API_KEY` and an available JSON-capable `GROQ_MODEL`. See [Groq's current models](https://console.groq.com/docs/models); the previous hard-coded Llama ID is no longer available to ordinary free/developer accounts. Set both Clerk keys only if account login is needed. Admin pages remain unavailable until both admin credentials are set.

```sh
npm test
npm run check
npm run eval:check
npm start
```

Open `http://localhost:3000`. `/api/config` should return account configuration, `/api/profile` should return guest/account mode, and `/api/history` should return an array when MongoDB is connected. The frontend can start without provider keys; research returns 503 with an explicit unavailable message. A disconnected database makes history return 503 instead of waiting for buffered queries. Keep a stable session secret across restarts to preserve guest history access.

To exercise research: ask one question, inspect the answer and source, attach a small text PDF, ask a follow-up, reload history, and verify a second browser session cannot read the first session's history. Use a synthetic PDF. The parser now uses pdf-parse v2 and rejects unreadable documents instead of silently omitting their evidence. Authentication, provider access and hosted persistence still require deployment credentials; an offline test pass does not verify them.

The [evaluation guide](../eval/README.md) describes the 30-case fixed-source benchmark and explicitly separates it from production retrieval and UI measurements.

## Decision: live retrieval with frozen evaluation sources

**Decision:** production retrieves three search results and attempts deeper text extraction for two; evaluation freezes supplied evidence while comparing prompts. **Alternative:** maintain an indexed RAG corpus and evaluate the entire retrieval-plus-generation pipeline. **Benefit:** live discovery avoids maintaining an index, while fixed evidence makes prompt comparisons interpretable. **Cost:** live pages change, sources may be incomplete or hostile, extraction may fail, and provider latency is added to every research request. The frozen benchmark cannot measure search recall, scraping reliability or end-to-end latency. The single `realUrl` field also cannot attribute all claims in multi-source reports. A future production evaluation should add claim-level citations and a retrieval test set before claiming reliable research accuracy.

## Verification, 23 October 2026

Clean dependency installation, 19 automated tests, syntax checks and the 30-case dry run passed. A local MongoDB 8 container connected successfully; config/profile/history returned 200 and empty guest history. Tests cover a real synthetic PDF, invalid PDFs, missing providers, unavailable history and hidden unconfigured admin access. No live Groq benchmark was run because no key was supplied. The hosted site returned 500 for history and displayed an empty report for a research request; it is not advertised as a working demo until its provider/database configuration and deployed fixes are verified.
