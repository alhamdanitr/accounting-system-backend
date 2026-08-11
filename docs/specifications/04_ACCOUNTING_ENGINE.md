# 04 — Accounting Engine

## الهدف
تحويل العمليات التجارية إلى آثار محاسبية صحيحة.

## القاعدة
كل عملية مالية رئيسية يجب أن تنتج Journal Entry متوازنة:

```text
Total Debit = Total Credit
```

## أمثلة
### بيع نقدي
Debit: Cash
Credit: Sales Revenue

### بيع آجل
Debit: Accounts Receivable
Credit: Sales Revenue

### تكلفة البيع
Debit: Cost of Goods Sold
Credit: Inventory

### شراء نقدي
Debit: Inventory/Purchase
Credit: Cash

### شراء آجل
Debit: Inventory/Purchase
Credit: Accounts Payable

### مصروف
Debit: Expense Account
Credit: Cash/Payable

## قواعد
- منع القيد غير المتوازن.
- منع تعديل القيد المرحل مباشرة.
- دعم Reverse Entry.
- دعم الحسابات المدينة والدائنة.
- ربط القيد بالمصدر source_type/source_id.
- دعم الفترة المالية والإقفال مستقبلًا.
