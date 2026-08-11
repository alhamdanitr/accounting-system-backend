# 05 — Inventory

## الوظائف
- Products.
- Warehouses.
- Stock Balance.
- Stock Movement.
- Transfers.
- Counts.
- Adjustments.
- Barcode.
- Serial Numbers.
- Batch/Expiry عند الحاجة.

## القاعدة الأساسية
لا يتم تغيير الرصيد مباشرة دون حركة مخزون.

```text
Purchase → Stock IN
Sale → Stock OUT
Sales Return → Stock IN
Purchase Return → Stock OUT
Transfer → OUT + IN
Adjustment → ADJUSTMENT
```

## الجرد
يقارن النظام بين:
System Quantity
و
Counted Quantity

ويولد Adjustment موثقًا بسبب التغيير.

## التقييم
يجب اعتماد سياسة تكلفة واضحة قبل الإنتاج، مثل Weighted Average أو FIFO، وعدم خلط السياسات.
