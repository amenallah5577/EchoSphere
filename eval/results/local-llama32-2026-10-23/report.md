# EchoSphere evaluation run

Model: llama3.2:latest. Partial run: false.

Provider: ollama.

| Prompt | Completed / attempted | Fact coverage proxy | Gold source match | Rubric pass | Median ms | p95 ms |
| --- | --- | --- | --- | --- | --- | --- |
| report-v1 | 30 / 30 | 67.8% | 100.0% | 50.0% | 3481 | 5359 |
| grounded-v2 | 30 / 30 | 60.4% | 100.0% | 46.7% | 2786 | 4267 |

These are automated proxies. Review source support and hallucinations manually before choosing a prompt. Latency includes the provider request and response download, but excludes retrieval and app processing.

## Cases requiring review

- ES-01 / report-v1: {"schemaValid":true,"factCoverage":0,"citationMatch":true,"uncertaintyPass":true,"forbiddenHits":[],"rubricPass":false}
- ES-02 / grounded-v2: {"schemaValid":true,"factCoverage":0,"citationMatch":true,"uncertaintyPass":true,"forbiddenHits":[],"rubricPass":false}
- ES-02 / report-v1: {"schemaValid":true,"factCoverage":0,"citationMatch":true,"uncertaintyPass":true,"forbiddenHits":[],"rubricPass":false}
- ES-04 / grounded-v2: {"schemaValid":true,"factCoverage":0.5,"citationMatch":true,"uncertaintyPass":false,"forbiddenHits":[],"rubricPass":false}
- ES-04 / report-v1: {"schemaValid":true,"factCoverage":0.5,"citationMatch":true,"uncertaintyPass":false,"forbiddenHits":[],"rubricPass":false}
- ES-05 / report-v1: {"schemaValid":true,"factCoverage":0.3333333333333333,"citationMatch":true,"uncertaintyPass":true,"forbiddenHits":[],"rubricPass":false}
- ES-06 / grounded-v2: {"schemaValid":true,"factCoverage":0.5,"citationMatch":true,"uncertaintyPass":true,"forbiddenHits":[],"rubricPass":false}
- ES-07 / grounded-v2: {"schemaValid":true,"factCoverage":0,"citationMatch":true,"uncertaintyPass":true,"forbiddenHits":[],"rubricPass":false}
- ES-08 / report-v1: {"schemaValid":true,"factCoverage":0,"citationMatch":true,"uncertaintyPass":true,"forbiddenHits":[],"rubricPass":false}
- ES-09 / report-v1: {"schemaValid":true,"factCoverage":0,"citationMatch":true,"uncertaintyPass":true,"forbiddenHits":[],"rubricPass":false}
- ES-09 / grounded-v2: {"schemaValid":true,"factCoverage":0.2,"citationMatch":true,"uncertaintyPass":true,"forbiddenHits":[],"rubricPass":false}
- ES-10 / grounded-v2: {"schemaValid":true,"factCoverage":0,"citationMatch":true,"uncertaintyPass":true,"forbiddenHits":[],"rubricPass":false}
- ES-10 / report-v1: {"schemaValid":true,"factCoverage":0,"citationMatch":true,"uncertaintyPass":true,"forbiddenHits":[],"rubricPass":false}
- ES-11 / grounded-v2: {"schemaValid":true,"factCoverage":0,"citationMatch":true,"uncertaintyPass":false,"forbiddenHits":[],"rubricPass":false}
- ES-12 / grounded-v2: {"schemaValid":true,"factCoverage":0,"citationMatch":true,"uncertaintyPass":false,"forbiddenHits":[],"rubricPass":false}
- ES-12 / report-v1: {"schemaValid":true,"factCoverage":0,"citationMatch":true,"uncertaintyPass":false,"forbiddenHits":[],"rubricPass":false}
- ES-17 / grounded-v2: {"schemaValid":true,"factCoverage":0.6666666666666666,"citationMatch":true,"uncertaintyPass":true,"forbiddenHits":[],"rubricPass":false}
- ES-19 / report-v1: {"schemaValid":true,"factCoverage":1,"citationMatch":true,"uncertaintyPass":false,"forbiddenHits":[],"rubricPass":false}
- ES-19 / grounded-v2: {"schemaValid":true,"factCoverage":0.3333333333333333,"citationMatch":true,"uncertaintyPass":false,"forbiddenHits":[],"rubricPass":false}
- ES-20 / report-v1: {"schemaValid":true,"factCoverage":0,"citationMatch":true,"uncertaintyPass":false,"forbiddenHits":[],"rubricPass":false}
- ES-21 / grounded-v2: {"schemaValid":true,"factCoverage":0.6666666666666666,"citationMatch":true,"uncertaintyPass":true,"forbiddenHits":[],"rubricPass":false}
- ES-23 / report-v1: {"schemaValid":true,"factCoverage":1,"citationMatch":true,"uncertaintyPass":false,"forbiddenHits":[],"rubricPass":false}
- ES-23 / grounded-v2: {"schemaValid":true,"factCoverage":0,"citationMatch":true,"uncertaintyPass":false,"forbiddenHits":[],"rubricPass":false}
- ES-24 / grounded-v2: {"schemaValid":true,"factCoverage":0.25,"citationMatch":true,"uncertaintyPass":false,"forbiddenHits":[],"rubricPass":false}
- ES-25 / report-v1: {"schemaValid":true,"factCoverage":0.5,"citationMatch":true,"uncertaintyPass":true,"forbiddenHits":[],"rubricPass":false}
- ES-25 / grounded-v2: {"schemaValid":true,"factCoverage":0,"citationMatch":true,"uncertaintyPass":true,"forbiddenHits":[],"rubricPass":false}
- ES-26 / report-v1: {"schemaValid":true,"factCoverage":1,"citationMatch":true,"uncertaintyPass":true,"forbiddenHits":["99\\.99"],"rubricPass":false}
- ES-27 / report-v1: {"schemaValid":true,"factCoverage":1,"citationMatch":true,"uncertaintyPass":true,"forbiddenHits":["99\\.99"],"rubricPass":false}
- ES-27 / grounded-v2: {"schemaValid":true,"factCoverage":1,"citationMatch":true,"uncertaintyPass":true,"forbiddenHits":["99\\.99"],"rubricPass":false}
- ES-30 / grounded-v2: {"schemaValid":true,"factCoverage":0,"citationMatch":true,"uncertaintyPass":false,"forbiddenHits":[],"rubricPass":false}
- ES-30 / report-v1: {"schemaValid":true,"factCoverage":0,"citationMatch":true,"uncertaintyPass":true,"forbiddenHits":[],"rubricPass":false}
