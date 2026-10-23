const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function runFixture(t, status, provider = 'groq') {
  const temporaryRoot = fs.realpathSync(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(temporaryRoot, 'echosphere-eval-test-'));
  t.after(() => {
    const resolved = fs.realpathSync(directory);
    assert.equal(path.dirname(resolved), temporaryRoot);
    assert.ok(path.basename(resolved).startsWith('echosphere-eval-test-'));
    fs.rmSync(resolved, { recursive: true });
  });
  const output = path.join(directory, 'run');
  const preload = path.join(directory, 'fake-provider.cjs');
  // The subprocess cannot reach a provider: replace fetch before loading the runner.
  fs.writeFileSync(preload, `
    process.env.GROQ_API_KEY = 'fixture-key-not-a-credential';
    global.fetch = async (url, options) => {
      if ('${provider}' === 'ollama' && options.headers.Authorization) throw new Error('Credential leaked to local provider');
      return ({
      ok: ${status === 200}, status: ${status},
      json: async () => ({ model: 'fixture-only', usage: { total_tokens: 1 },
        choices: [{ message: { content: JSON.stringify({ title: 'Pilot',
          desc: '48 enrolled; 36 completed.', metrics: [],
          realUrl: 'https://example.test/echosphere/pilot' }) } }] })
    }); };
  `);
  const result = spawnSync(process.execPath, ['--require', preload, path.resolve(__dirname, '../eval/run.js'),
    '--provider', provider, '--model', 'fixture-only', '--limit', '1', '--out', output], { encoding: 'utf8' });
  assert.equal(result.error, undefined);
  const raw = fs.readFileSync(path.join(output, 'responses.jsonl'), 'utf8');
  assert.ok(!raw.includes('fixture-key-not-a-credential'));
  return { result, rows: raw.trim().split('\n').map(line => JSON.parse(line)),
    summary: JSON.parse(fs.readFileSync(path.join(output, 'summary.json'), 'utf8')) };
}

test('runner records both prompt responses and a complete summary using a fake provider', t => {
  const { result, rows, summary } = runFixture(t, 200);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(row => row.configuration), ['report-v1', 'grounded-v2']);
  assert.equal(summary.partial, false);
  assert.equal(summary.configurations['report-v1'].rubricPassRate, 1);
});

test('runner stops at rate limiting and preserves an explicitly partial run', t => {
  const { result, rows, summary } = runFixture(t, 429);
  assert.equal(result.status, 1);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].httpStatus, 429);
  assert.equal(summary.partial, true);
  assert.equal(summary.configurations['report-v1'].errors, 1);
  assert.equal(summary.configurations['grounded-v2'].attempted, 0);
  assert.equal(summary.configurations['grounded-v2'].factCoverage, null);
});

test('runner stops at rejected credentials without evaluating the second prompt', t => {
  const { result, rows, summary } = runFixture(t, 401);
  assert.equal(result.status, 1);
  assert.equal(rows.length, 1);
  assert.equal(summary.partial, true);
  assert.equal(summary.configurations['report-v1'].latencyMedianMs, null);
});

test('local-provider comparison never forwards the Groq credential', t => {
  const { result, rows } = runFixture(t, 200, 'ollama');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(rows.length, 2);
});
