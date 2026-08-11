# 07 — Purchases

## الوظائف
- Purchase Invoice.
- Supplier.
- Items.
- Cost.
- Discount.
- Payment.
- Supplier Debt.
- Purchase Return.

## التدفق
```text
Purchase Draft
 ↓
Confirm
 ↓
Stock IN
 ↓
Accounting Entry
 ↓
Payment / Payable
```

## قواعد
- تكلفة المنتج تحفظ حسب سياسة التكلفة.
- المرتجع مرتبط بالفاتورة الأصلية عند الإمكان.
- لا حذف شراء مرحل؛ يستخدم Cancel/Reverse.
- كل شراء قابل للتدقيق.
