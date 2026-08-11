# 09 — Sync Engine

## الهدف
مزامنة Android وWindows مع الخادم دون فقد أو تكرار.

## Operation
```text
operation_id
tenant_id
device_id
entity_type
entity_id
operation_type
payload
created_at
version
status
```

## التدفق
```text
Local Transaction
 ↓
Sync Queue
 ↓
Push
 ↓
Server Validation
 ↓
Commit
 ↓
ACK
 ↓
Pull Remote Changes
 ↓
Apply Local
```

## المتطلبات
- Idempotency.
- Retry with backoff.
- Cursor-based pull.
- Conflict detection.
- Sync history.
- Failed queue.
- Transactional server commit.

## التعارض
الأرصدة الحساسة لا تعتمد على Last Write Wins بشكل أعمى. تستخدم عمليات/حركات قابلة للجمع أو تعارضًا واضحًا للمراجعة.

## الحالات
Synced / Pending / Syncing / Failed / Conflict.
