const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseArgs } = require('node:util');
const { execFileSync } = require('node:child_process');
const configurations = require('./prompts');
const { score, summarize } = require('./score');

async function main() {
  const { values } = parseArgs({ options: {
    'dry-run': { type: 'boolean', default: false },
    limit: { type: 'string', default: '30' }, repeats: { type: 'string', default: '1' },
    'env-file': { type: 'string' }, model: { type: 'string' },
    provider: { type: 'string', default: 'groq' },
    out: { type: 'string' }
  } });
  const limit = Number(values.limit), repeats = Number(values.repeats);
  if (!['groq', 'ollama'].includes(values.provider)) throw new Error('Use --provider groq or ollama.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 30 || !Number.isInteger(repeats) || repeats < 1 || repeats > 5) {
    throw new Error('Use --limit 1..30 and --repeats 1..5.');
  }
  const datasetBytes = fs.readFileSync(path.join(__dirname, 'dataset.json'));
  const sourceBytes = fs.readFileSync(path.join(__dirname, 'sources.json'));
  const dataset = JSON.parse(datasetBytes).cases;
  const sources = JSON.parse(sourceBytes).sources;
  validateDataset(dataset, sources);
  const cases = dataset.slice(0, limit);
  const digest = value => crypto.createHash('sha256').update(value).digest('hex');
  let commit = null;
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: __dirname, encoding: 'utf8' }).trim(); } catch {}
  const metadata = {
    mode: values['dry-run'] ? 'dry-run' : 'live', startedAt: new Date().toISOString(), commit,
    provider: values.provider, model: values.model || null, temperature: 0.3, maxCompletionTokens: 900, repeats,
    caseCount: cases.length, plannedCalls: cases.length * repeats * configurations.length,
    datasetSha256: digest(datasetBytes), sourcesSha256: digest(sourceBytes),
    configurations: configurations.map(c => ({ ...c, sha256: digest(c.system) })),
    scope: 'Synthetic frozen-context generation; excludes retrieval, PDF parsing, persistence and UI latency.'
  };
  if (values['dry-run']) {
    console.log(JSON.stringify(metadata, null, 2));
    return;
  }
  require('dotenv').config({ path: values['env-file'] || path.join(__dirname, '../.env') });
  if (values.provider === 'groq' && (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key')) throw new Error('GROQ_API_KEY is required. No requests sent and no model results produced. See eval/README.md.');
  if (!values.model?.trim()) throw new Error('--model is required for a live run. Choose an available model with JSON object mode; see eval/README.md.');
  const endpoint = values.provider === 'ollama' ? 'http://127.0.0.1:11434/v1/chat/completions' : 'https://api.groq.com/openai/v1/chat/completions';
  const output = path.resolve(values.out || path.join(__dirname, 'runs', new Date().toISOString().replace(/[:.]/g, '-')));
  fs.mkdirSync(output, { recursive: true });
  const rawPath = path.join(output, 'responses.jsonl');
  // Refuse to overwrite an earlier benchmark.
  fs.writeFileSync(rawPath, '', { flag: 'wx' });
  fs.writeFileSync(path.join(output, 'metadata.json'), JSON.stringify(metadata, null, 2));
  const rows = [];
  let stopped = false;
  outer: for (let repetition = 0; repetition < repeats; repetition++) {
    for (let index = 0; index < cases.length; index++) {
      const testCase = cases[index];
      // Counterbalance order to reduce systematic warm-up/time-of-run effects.
      const order = (index + repetition) % 2 ? [...configurations].reverse() : configurations;
      for (const config of order) {
        const evidence = testCase.source_ids.map(id => sources.find(s => s.id === id));
        const start = performance.now();
        const row = { caseId: testCase.id, category: testCase.category, configuration: config.id, repetition };
        try {
          const response = await fetch(endpoint, {
            method: 'POST', signal: AbortSignal.timeout(60000),
            headers: { 'Content-Type': 'application/json', ...(values.provider === 'groq' ? { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } : {}) },
            body: JSON.stringify({ model: values.model, temperature: metadata.temperature,
              ...(values.provider === 'ollama' ? { max_tokens: 900 } : { max_completion_tokens: 900 }),
              response_format: { type: 'json_object' }, messages: [
                { role: 'system', content: config.system },
                { role: 'user', content: JSON.stringify({ question: testCase.question, sources: evidence }) }
              ] })
          });
          row.latencyMs = Math.round(performance.now() - start);
          row.httpStatus = response.status;
          if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
          const result = await response.json();
          row.latencyMs = Math.round(performance.now() - start);
          row.answer = JSON.parse(result.choices[0].message.content);
          delete row.answer.scratchpad;
          row.providerModel = result.model;
          row.usage = result.usage;
          row.scores = score(testCase, row.answer);
        } catch (error) {
          row.latencyMs = Math.round(performance.now() - start);
          row.error = error.name === 'TimeoutError' ? 'Request timed out after 60 seconds' : error.message;
          if ([400, 401, 403, 404, 429].includes(row.httpStatus)) stopped = true;
        }
        rows.push(row);
        fs.appendFileSync(rawPath, JSON.stringify(row) + '\n');
        console.log(`${row.caseId} ${config.id}: ${row.error || `${row.latencyMs} ms`}`);
        if (stopped) break outer;
      }
    }
  }
  const summary = { completedAt: new Date().toISOString(), partial: rows.length !== metadata.plannedCalls,
    configurations: Object.fromEntries(configurations.map(c => [c.id, summarize(rows.filter(r => r.configuration === c.id))])) };
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2));
  const lines = ['# EchoSphere evaluation run', '', `Model: ${values.model}. Partial run: ${summary.partial}.`, '',
    `Provider: ${values.provider}.`, '', '| Prompt | Completed / attempted | Fact coverage proxy | Gold source match | Rubric pass | Median ms | p95 ms |',
    '| --- | --- | --- | --- | --- | --- | --- |'];
  const percent = n => n === null ? 'N/A' : `${(n * 100).toFixed(1)}%`;
  for (const [id, s] of Object.entries(summary.configurations)) lines.push(`| ${id} | ${s.completed} / ${s.attempted} | ${percent(s.factCoverage)} | ${percent(s.citationMatchRate)} | ${percent(s.rubricPassRate)} | ${s.latencyMedianMs ?? 'N/A'} | ${s.latencyP95Ms ?? 'N/A'} |`);
  lines.push('', 'These are automated proxies. Review source support and hallucinations manually before choosing a prompt. Latency includes the provider request and response download, but excludes retrieval and app processing.', '', '## Cases requiring review', '');
  for (const row of rows.filter(r => r.error || !r.scores.rubricPass)) lines.push(`- ${row.caseId} / ${row.configuration}: ${row.error || JSON.stringify(row.scores)}`);
  fs.writeFileSync(path.join(output, 'report.md'), lines.join('\n') + '\n');
  console.log(`Results saved to ${output}`);
  if (summary.partial || rows.some(r => r.error)) process.exitCode = 1;
}

function validateDataset(cases, sources) {
  if (cases.length !== 30 || new Set(cases.map(c => c.id)).size !== 30) throw new Error('Expected 30 uniquely identified cases.');
  const byId = new Map(sources.map(s => [s.id, s]));
  for (const c of cases) {
    if (!c.question || !c.source_ids.length || !c.expected_fact_groups.length) throw new Error(`Incomplete case ${c.id}`);
    if (c.source_ids.some(id => !byId.has(id))) throw new Error(`Unknown source in ${c.id}`);
    if (!c.gold_citation_urls.length || c.gold_citation_urls.some(url => !c.source_ids.some(id => byId.get(id).url === url))) throw new Error(`Invalid gold citation in ${c.id}`);
    for (const group of c.expected_fact_groups) {
      if (!group.length) throw new Error(`Empty fact group in ${c.id}`);
      group.forEach(pattern => new RegExp(pattern, 'i'));
    }
    c.forbidden_patterns.forEach(pattern => new RegExp(pattern, 'i'));
  }
}

module.exports = { validateDataset };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
