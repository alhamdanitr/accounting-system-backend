import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = (process.env.LOAD_TEST_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const healthPath = process.env.LOAD_TEST_PATH ?? '/api/v1/health';
const totalRequests = Number(process.env.LOAD_TEST_REQUESTS ?? 200);
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY ?? 20);
const timeoutMs = Number(process.env.LOAD_TEST_TIMEOUT_MS ?? 5000);
const p95LimitMs = Number(process.env.LOAD_TEST_P95_LIMIT_MS ?? 500);

if (!Number.isInteger(totalRequests) || totalRequests < 1 || !Number.isInteger(concurrency) || concurrency < 1) {
  throw new Error('LOAD_TEST_REQUESTS and LOAD_TEST_CONCURRENCY must be positive integers');
}

const latencies = [];
let succeeded = 0;
let failed = 0;
let nextRequest = 0;

async function requestHealth() {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${healthPath}`, { signal: controller.signal });
    const body = await response.json();
    const elapsed = performance.now() - started;
    latencies.push(elapsed);
    if (response.ok && (body.data?.status ?? body.status) === 'ok') succeeded += 1;
    else failed += 1;
  } catch {
    latencies.push(performance.now() - started);
    failed += 1;
  } finally {
    clearTimeout(timer);
  }
}

async function worker() {
  while (true) {
    const current = nextRequest++;
    if (current >= totalRequests) return;
    await requestHealth();
  }
}

const startedAt = new Date().toISOString();
const wallStart = performance.now();
await Promise.all(Array.from({ length: Math.min(concurrency, totalRequests) }, worker));
const durationMs = performance.now() - wallStart;
latencies.sort((a, b) => a - b);
const percentile = (p) => latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * p) - 1)] ?? 0;
const result = {
  startedAt,
  baseUrl,
  healthPath,
  totalRequests,
  concurrency,
  succeeded,
  failed,
  errorRate: failed / totalRequests,
  durationMs: Number(durationMs.toFixed(2)),
  requestsPerSecond: Number((totalRequests / (durationMs / 1000)).toFixed(2)),
  latencyMs: { p50: Number(percentile(0.5).toFixed(2)), p95: Number(percentile(0.95).toFixed(2)), p99: Number(percentile(0.99).toFixed(2)), max: Number((latencies.at(-1) ?? 0).toFixed(2)) },
  thresholds: { maxErrorRate: 0, maxP95Ms: p95LimitMs },
  passed: failed === 0 && percentile(0.95) <= p95LimitMs,
};

await mkdir('artifacts/load-test', { recursive: true });
await writeFile('artifacts/load-test/load-test.json', `${JSON.stringify(result, null, 2)}\n`);
await writeFile('artifacts/load-test/load-test.md', `# Backend Load Test\n\n- Target: \`${baseUrl}${healthPath}\`\n- Requests: ${totalRequests}\n- Concurrency: ${concurrency}\n- Success/Failure: ${succeeded}/${failed}\n- Error rate: ${(result.errorRate * 100).toFixed(2)}%\n- Throughput: ${result.requestsPerSecond} req/s\n- Latency p50/p95/p99/max: ${result.latencyMs.p50}/${result.latencyMs.p95}/${result.latencyMs.p99}/${result.latencyMs.max} ms\n- Thresholds: error rate = 0%, p95 <= ${p95LimitMs} ms\n- Result: **${result.passed ? 'PASS' : 'FAIL'}**\n`);
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exit(1);
