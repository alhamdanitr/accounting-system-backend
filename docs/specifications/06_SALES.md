# 06 — Sales

## POS
يجب أن تكون شاشة البيع الأسرع في النظام.

### الوظائف
- Barcode.
- Search.
- Cart.
- Quantity.
- Unit Price.
- Discount.
- Customer.
- Payment.
- Partial Payment.
- Credit.
- Return.
- Print.
- Share.

## الحساب
```text
Subtotal
- Discount
+ Tax/Charges if enabled
= Total
- Paid
= Due
```

## حالات الفاتورة
Draft → Confirmed → Paid/Partially Paid/Credit → Cancelled

## قواعد
- لا خصم يتجاوز صلاحية المستخدم.
- لا بيع كمية أكبر من المتاح إلا إذا سمح إعداد المخزون.
- الفاتورة المؤكدة لا تعدل بحرية؛ تستخدم تعديلات/مرتجعات موثقة.
- كل بيع يحدث Stock Movement وAccounting Entry.
