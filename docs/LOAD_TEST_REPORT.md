# Backend Load Test Report

## Scope

تم اختبار endpoint الصحة التشغيلي `GET /api/v1/health` بعد تشغيل Backend مبنيًا من commit الفرع الحالي. هذا endpoint يثبت قابلية استقبال الطلبات ومرور Success envelope الموحد، بينما لا يقيس وحده أداء استعلامات الأعمال الثقيلة.

## Workload and acceptance criteria

| Parameter | Value |
|---|---:|
| Requests | 200 |
| Concurrency | 20 |
| Timeout per request | 5000 ms |
| Maximum error rate | 0% |
| Maximum p95 latency | 500 ms |

## Observed result

| Metric | Result |
|---|---:|
| Successful requests | 200/200 |
| Error rate | 0.00% |
| Throughput | 850.67 req/s |
| p50 latency | 14.35 ms |
| p95 latency | 30.19 ms |
| p99 latency | 34.32 ms |
| Maximum latency | 80.33 ms |
| Outcome | **PASS** |

## Reproduction

```bash
pnpm exec nest build
node dist/src/main.js &
LOAD_TEST_REQUESTS=200 LOAD_TEST_CONCURRENCY=20 LOAD_TEST_P95_LIMIT_MS=500 pnpm run load-test
```

يولد الأمر `artifacts/load-test/load-test.json` و`artifacts/load-test/load-test.md`. وتعيد بوابة CI تشغيل الاختبار على بيئة PostgreSQL الخاصة بها وترفع التقرير كـ artifact. هذه النتيجة baseline وليست بديلًا عن اختبار حمل لاحق لمسارات الأعمال المصادق عليها.
