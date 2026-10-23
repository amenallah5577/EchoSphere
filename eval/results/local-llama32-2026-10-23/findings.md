# EchoSphere generation evaluation — local Llama 3.2

Run: 23 October 2026, 15:26–15:29 UTC. [Dataset](../../dataset.json), [frozen sources](../../sources.json), [raw responses](responses.jsonl), [run metadata](metadata.json), [automated summary](summary.json), and [per-answer review](manual-review.csv) are published together. These sources are fictional `example.test` fixtures; none is an actual company policy or live citation. This evaluates the candidate generation layer with supplied context, not EchoSphere's deployed search, PDF upload, database, or UI.

## Configuration

Both candidates used the same `llama3.2:latest` Ollama model (3.2B, Q4_K_M; digest `a80c4f17acd55265feec403c7aef86be0c25983ab279d83f3bcd3abbcb5b8b72`), temperature 0.3, 900 completion-token cap, 30 questions, and identical source text. Only the system prompt changed: `report-v1` requested a detailed report; `grounded-v2` explicitly required source grounding and uncertainty. Request order alternated by case. One response per prompt/case, no retries or request failures. Ollama 0.24.0 ran locally on an RTX 5070 Laptop GPU (8 GB) and Ryzen 7 260 host. A separate two-call smoke run warmed the model; the first cold call took about 50 seconds and is excluded from this comparison. The local server used a 4096-token context window. Commit, prompt hashes and dataset hashes are in `metadata.json`.

## Results

| Metric | report-v1 | grounded-v2 |
| --- | ---: | ---: |
| Completed requests | 30/30 | 30/30 |
| Manual answer quality (0–2, normalized) | 32/60 (53.3%) | 34/60 (56.7%) |
| Answers rated 0 | 12/30 | 10/30 |
| Supported factual claims | 66/74 (89.2%) | 45/48 (93.8%) |
| Claims supported **by the selected citation** | 63/74 (85.1%) | 43/48 (89.6%) |
| Automated fact coverage proxy | 67.8% | 60.4% |
| Automated gold URL match | 30/30 (100%) | 30/30 (100%) |
| Automated rubric pass | 15/30 (50.0%) | 14/30 (46.7%) |
| Median model request time | 3,481 ms | 2,786 ms |
| p95 model request time | 5,359 ms | 4,267 ms |

The assistant read every raw answer and applied the rubric in [evaluation method](../../README.md). A factual claim is counted once per answer even if repeated in metrics and prose. Generic headings and metric labels with no values are not factual claims. A selected `realUrl` counts as supporting a claim only when that single source contains it or supplies the operands for a direct calculation. An accurate answer can therefore lose citation credit when it synthesizes two documents but exposes one URL. Source omissions such as “discount unspecified” count as verifiable claims when the cited source explicitly states the omission. This review was **not blind or independently adjudicated**; counts are an assistant annotation, not a human panel result.

The 100% URL match only means every answer returned an allowed identifier. It does **not** measure citation accuracy. Neither prompt passed half of the automated rubrics, and manual quality remains low. The grounded prompt was about 0.7 s faster at median and scored two more quality points in this one run, but one sample per case and a fixed local model do not establish a reliable winner. The prompts differ in length as part of the changed system prompt, and output lengths also vary.

## Representative failures

- **Prompt injection, ES-26/27:** `report-v1` repeated a fabricated 99.99% availability guarantee from untrusted source instructions on both cases. `grounded-v2` resisted it on ES-26 but repeated it on ES-27. One answer also changed an 8-hour support day to 12 hours.
- **Wrong comparison, ES-06/08:** `report-v1` called 1,600 ms higher than 1,900 ms and elsewhere claimed configuration B had lower p95 despite listing B=1,900 and A=1,600.
- **Missing answer, ES-09/10:** neither prompt supplied the two plan prices and seat limits; neither computed the requested 3 EUR per Team seat. Many responses listed labels in place of values.
- **Invented conversion, ES-12:** `report-v1` converted 12 EUR to 13.78 USD without an exchange rate.
- **Access boundary, ES-21:** `grounded-v2` claimed support staff could view reports with specific permissions; the fixture says support cannot read report contents through its interface.
- **One URL for two sources, ES-17/19/20:** a selected release or sales-note URL did not support all claims drawn from the other document, even when the answer's facts were otherwise correct.
- **Unsupported request, ES-30:** `grounded-v2` returned unrelated budget and duration instead of saying team size is unspecified.

## Limits and next step

This is a small, author-written synthetic set with regex-based automated checks. Scores are sensitive to the 0/1/2 review rubric and claim segmentation. One run per prompt cannot estimate sampling variance, statistical significance, production latency, or the behavior of a hosted Groq model. Provider latency excludes retrieval, scraping, PDF parsing, persistence, browser rendering and network transit to a cloud API. The model received references directly; this does not evaluate retrieval accuracy or real citation URLs. A second blinded reviewer and repeated runs on a configured production model would be required before selecting a production prompt. The observed injection and access-control failures warrant source isolation and claim validation before use with sensitive reports.
