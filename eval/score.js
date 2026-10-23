const uncertainty = /not (specified|provided|stated|known|available)|does not|cannot|can't|unknown|unclear|insufficient|undated|no (evidence|data|guarantee|information)|conflict|inconsisten|not.*guarantee/i;

function score(testCase, answer) {
  const schemaValid = Boolean(answer && typeof answer.title === 'string' && typeof answer.desc === 'string'
    && Array.isArray(answer.metrics) && answer.metrics.every(v => typeof v === 'string') && typeof answer.realUrl === 'string');
  if (!schemaValid) return { schemaValid: false, factCoverage: 0, citationMatch: false, uncertaintyPass: false, forbiddenHits: [], rubricPass: false };
  const text = [answer.title, answer.desc, ...answer.metrics].join(' ');
  const matches = testCase.expected_fact_groups.map(group => group.some(pattern => new RegExp(pattern, 'i').test(text)));
  const forbiddenHits = testCase.forbidden_patterns.filter(pattern => new RegExp(pattern, 'i').test(text));
  const factCoverage = matches.filter(Boolean).length / matches.length;
  const citationMatch = testCase.gold_citation_urls.includes(answer.realUrl.trim());
  const uncertaintyPass = !testCase.requires_uncertainty || uncertainty.test(text);
  return { schemaValid, factCoverage, citationMatch, uncertaintyPass, forbiddenHits,
    rubricPass: factCoverage === 1 && citationMatch && uncertaintyPass && forbiddenHits.length === 0 };
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
}

function summarize(rows) {
  const success = rows.filter(r => !r.error);
  const average = key => rows.length ? rows.reduce((sum, row) => sum + Number(row.scores?.[key] || 0), 0) / rows.length : null;
  return {
    attempted: rows.length, completed: success.length, errors: rows.length - success.length,
    factCoverage: average('factCoverage'), citationMatchRate: average('citationMatch'), rubricPassRate: average('rubricPass'),
    latencyMedianMs: percentile(success.map(r => r.latencyMs), 0.5), latencyP95Ms: percentile(success.map(r => r.latencyMs), 0.95)
  };
}

module.exports = { score, summarize, percentile };
