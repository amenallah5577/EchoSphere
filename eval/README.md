# Reproducible generation evaluation

**Status: prepared; live measurements pending a Groq API key.** No answer-quality, citation-accuracy, latency or prompt-winner claims have been established. Passing the unit tests validates the harness, not the model.

## Scope and dataset

`dataset.json` contains 30 questions and per-question scoring criteria. `sources.json` contains frozen, **fictional** reference documents written for this benchmark. Their `example.test` URLs are identifiers, not live websites. The companies, prices, dates, security policies and performance numbers in these fixtures do not describe EchoSphere or any real organization.

Cases cover fact extraction, arithmetic, comparisons, unsupported requests, conflicting documents, study limitations, source prompt injection and extracted PDF text. PDF cases test comprehension of supplied text, not PDF parsing. The benchmark sends each question and its fixed sources directly to Groq; it does not call the deployed application or write research history.

## Run without credentials

Use Node.js 22 and the committed lockfile, from the repository root:

```sh
npm ci
npm test
npm run eval:check
```

The dry run validates all 30 cases, their source references and regex rubrics, and prints the planned configuration. It makes no provider requests and produces no synthetic model scores.

## Configure and run live

### Local alternative without a cloud key

The same dataset and prompt comparison can run against an installed Ollama model:

```sh
ollama serve
# In another terminal, after installing the model if necessary:
npm run eval:run -- --provider ollama --model llama3.2:latest --limit 1
npm run eval:run -- --provider ollama --model llama3.2:latest
```

The local endpoint is fixed to `127.0.0.1:11434` and receives no Groq credential. Record the Ollama version, model digest, quantization, hardware and warm-up policy alongside a published run. These results evaluate candidate EchoSphere generation prompts on a local model; they do not measure the deployed Groq model or hosted application. Do not compare local latency with cloud latency as if only the prompt changed. A cold model can take longer to load than the 60-second request timeout; use a separate smoke run to warm it, and report that policy.

### Groq

1. Create a key in the [Groq console](https://console.groq.com/keys), following the [official quickstart](https://console.groq.com/docs/quickstart).
2. Create a local `.env` at the repository root with `GROQ_API_KEY=...`. This file is ignored by Git. Do not paste the key into a chat, README or commit. The evaluation needs no MongoDB, Tavily or Clerk credentials.
3. Choose a model that is enabled for your account and supports JSON object mode from [Groq's model catalog](https://console.groq.com/docs/models). Supply its exact ID with `--model`. There is intentionally no implicit model fallback. Groq's [deprecation notice](https://console.groq.com/docs/deprecations) lists the application's hard-coded `llama-3.3-70b-versatile` as retired for free/developer usage on 16 August 2026; enterprise availability differs. This harness does not change the deployed application.
4. Run a two-request smoke check, then the complete comparison. Replace `AVAILABLE_MODEL_ID` below with the selected ID:

```sh
npm run eval:run -- --model AVAILABLE_MODEL_ID --limit 1
npm run eval:run -- --model AVAILABLE_MODEL_ID
# Optional: 3 repetitions = 180 total requests (90 per prompt)
npm run eval:run -- --model AVAILABLE_MODEL_ID --repeats 3
# Or use an existing environment file outside this checkout:
npm run eval:run -- --model AVAILABLE_MODEL_ID --env-file "C:/path/to/local/.env"
```

The default full run makes 60 sequential requests, with a 900-token maximum completion budget per request. Provider usage and charges depend on the selected model/account. Both candidates use the same model, temperature (0.3), token budget, questions and sources. Only the system prompt varies: `report-v1` asks for a report; `grounded-v2` adds explicit grounding and uncertainty instructions. These are candidate prompts, not an exact production baseline. Per-case request order alternates to reduce order bias. No production prompt is replaced automatically.

There are no automatic retries. Each request has a 60-second timeout. HTTP 400/401/403/404/429 stops the run and preserves partial output, preventing repeated invalid or rate-limited requests. Other errors are recorded. A partial run or any request error returns a failing exit code. Resolve the cause and start a new run; do not combine incomplete runs selectively to claim a winner.

## Outputs and metrics

Each live run creates an ignored `eval/runs/<timestamp>/` directory:

- `metadata.json`: start time, Git commit, model, parameters, prompt text and dataset/source/prompt hashes.
- `responses.jsonl`: one answer or error per attempted case/configuration/repetition, scores, provider model, usage and elapsed time. Private scratchpad content is excluded.
- `summary.json`: aggregate metrics and whether the run is partial.
- `report.md`: comparison table and cases requiring review.

Run from a committed, clean checkout when publishing results. Preserve these four files together; select a reviewed run for publication under `eval/results/` rather than force-adding all local runs.

| Measurement | Definition | Limitation |
| --- | --- | --- |
| Fact coverage proxy | Fraction of expected regex fact groups found in title, description and metrics; average across attempted requests | Matching words/numbers does not establish semantic correctness or correct attribution |
| Gold source match | Fraction of attempted requests whose single `realUrl` exactly matches an allowed reference identifier | A correct URL can accompany unsupported claims; this is not citation entailment accuracy |
| Rubric pass | Valid schema, every fact group found, allowed source URL, required uncertainty wording, and no forbidden output | Lexical checks can miss paraphrases or accept misleading statements |
| Median/p95 latency | Nearest-rank percentiles of completed provider request times, including response download; excludes errors | Excludes search, scraping, PDF parsing, database and UI; p95 from 30 answers is noisy |
| Error count | Attempted requests without a parsed response | Errors remain in quality/source-match denominators as zero credit; unattempted cases do not |

## Manual quality and citation review

Review every answer against its supplied documents, preferably with prompt identity hidden. Record case ID, repetition, quality score, supported/total factual claims, cited-and-supported/total cited factual claims, unsupported claims, and short evidence notes. Use a second reviewer where possible and record disagreements.

- **2 — correct:** answers the question, preserves units and scope, includes relevant limitations, and adds no unsupported factual claims.
- **1 — partially correct:** useful but missing a required fact or qualification; no material contradiction.
- **0 — incorrect:** contradicts sources, fabricates material facts, follows injected instructions, or answers an unsupported request with invented specifics. Request errors receive 0.

Report normalized quality as `sum(scores) / (2 * attempted requests)`. For citation accuracy, annotate which factual claims the provided link supports, and report supported cited claims divided by all cited claims, together with the raw counts. Report citation coverage separately (cited supported claims / all factual claims). Use N/A if the denominator is zero. An unsupported-request answer may correctly cite the source whose information is insufficient; the explanation must accurately state its limits.

The application's one-URL response schema cannot attribute every claim in a multi-source synthesis. Explicitly review ES-17 through ES-20 for this limitation. No automated URL match should be described as measured citation accuracy.

## Publish findings only after a real run

Include the run date, commit and hashes, exact model/parameters, dataset scope, completed/attempted counts, automated proxies, manually reviewed quality and citation metrics, latency sample sizes, and representative failures from actual responses. Do not convert the synthetic source documents' latency figures into application measurements.

Report both prompts even if neither performs well. Keep the dataset fixed while comparing them; record any subsequent rubric corrections and rescore both candidates equally. This small English synthetic benchmark is a development set, not a held-out generalization test. It does not validate real-web reliability, multilingual behavior, PDF ingestion, search recall, production security or end-to-end performance. With stochastic generation and a small sample, a small difference does not establish a reliable winner.
