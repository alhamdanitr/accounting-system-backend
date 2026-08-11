# 19 — Testing

## مستويات الاختبار
1. Unit.
2. Integration.
3. Database.
4. API.
5. UI.
6. Offline.
7. Sync.
8. Security.
9. Performance.
10. Crash Recovery.

## سيناريو Sync
```text
Android Offline → 3 Sales
Windows Offline → Purchase
Both Online → Sync
```

يجب التحقق من:
- عدم التكرار.
- عدم فقد البيانات.
- صحة المخزون.
- صحة الصندوق.
- صحة الديون.
- صحة المحاسبة.

## Acceptance
لا تعتبر الميزة مكتملة بدون اختبار حالات النجاح والفشل والحدود.
