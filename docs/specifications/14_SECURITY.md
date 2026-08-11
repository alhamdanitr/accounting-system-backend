# 14 — Security

## الأساس
- HTTPS.
- JWT + Refresh Tokens.
- Secure Password Hashing.
- Device Registration.
- RBAC.
- Tenant Isolation.
- Validation.
- Rate Limiting.
- Audit Logs.
- Secure Local Storage.
- Encryption للبيانات الحساسة.

## قواعد
- الخادم يعيد التحقق من الأسعار والمبالغ والصلاحيات.
- لا تثق في client payload.
- مفاتيح API لا تخزن داخل المصدر.
- كل عملية حساسة قابلة للتدقيق.
- جلسات الأجهزة قابلة للإلغاء.

## Audit
```text
user
device
action
entity
entity_id
before
after
timestamp
```
