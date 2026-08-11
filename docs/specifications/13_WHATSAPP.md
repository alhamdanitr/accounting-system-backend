# 13 — WhatsApp Integration

## الاستخدامات
- إرسال فاتورة.
- كشف حساب.
- سند قبض.
- سند صرف.
- تذكير دين.
- عرض سعر.
- تقرير.

## Layer
```text
Application
 ↓
WhatsApp Service
 ↓
Provider/API
```

## القاعدة
لا يتم بناء التكامل على طريقة غير رسمية يصعب صيانتها. يجب عزل Provider حتى يمكن تبديله.

## Templates
تدعم:
- Company Name.
- Customer/Supplier Name.
- Invoice Number.
- Total.
- Paid.
- Due.
- Date.
- Contact.

## سجل الرسائل
يحفظ status ووقت الإرسال والخطأ عند الفشل.
