# خطة متكاملة لبناء نظام محاسبي وإدارة مخزون لمحل أدوات الشبكات والإلكترونيات

**الإصدار:** 1.0  
**التاريخ:** 10 أغسطس 2026  
**الحالة:** Master Project Plan  
**نوع المشروع:** Enterprise Accounting & Inventory System  
**المنصات المستهدفة:** Android + Windows + Cloud Backend  
**نمط التشغيل:** Offline-First + Online Synchronization  
**اللغة الأساسية للواجهة:** العربية RTL  
**الهدف:** بناء نظام محاسبي ومخزني احترافي وقابل للتوسع، وليس مجرد تطبيق مبيعات بسيط.

---

# 1. الرؤية العامة

يهدف المشروع إلى بناء نظام متكامل لإدارة محل متخصص في:

- أدوات الشبكات.
- الراوترات والسويتشات.
- MikroTik.
- Access Points.
- الكيابل.
- RJ45.
- كاميرات المراقبة.
- DVR / NVR.
- محولات ومستلزمات الكهرباء.
- قطع الكمبيوتر.
- الإلكترونيات والإكسسوارات.
- وأي أصناف إضافية يمكن إدارتها داخل النظام.

يجب أن يغطي النظام دورة العمل الكاملة:

```text
المشتريات
    ↓
المخزون والمخازن
    ↓
المبيعات
    ↓
المدفوعات والديون
    ↓
المحاسبة
    ↓
التقارير
    ↓
الطباعة والمشاركة
```

ويجب أن يعمل النظام بصورة طبيعية سواء كان الجهاز متصلًا بالإنترنت أو غير متصل.

---

# 2. المنصات

## 2.1 تطبيق Android

يعمل على الهاتف والتابلت، ويدعم:

- المبيعات السريعة.
- إدارة المنتجات.
- المخزون.
- العملاء.
- الموردين.
- المصروفات.
- السندات.
- التقارير.
- الجرد.
- الطباعة.
- WhatsApp.
- Offline Mode.
- Synchronization.

### التقنية المقترحة

- Kotlin 100%.
- Jetpack Compose.
- Material 3.
- Room.
- DataStore.
- Coroutines.
- WorkManager.
- Retrofit.
- Kotlin Serialization أو Moshi.
- Hilt.
- Navigation Compose.

---

## 2.2 تطبيق Windows

تطبيق Desktop احترافي لإدارة المحل.

يدعم:

- Dashboard.
- POS.
- المنتجات.
- المشتريات.
- المخزون.
- العملاء.
- الموردين.
- المحاسبة.
- التقارير.
- الطباعة.
- إدارة المستخدمين.
- إعدادات النظام.
- المزامنة.

### التقنية المقترحة

Kotlin + Compose Multiplatform قدر الإمكان، مع مشاركة الـ Domain Models والمنطق المشترك بين Android وWindows.

---

## 2.3 الخادم المركزي

الخادم مسؤول عن:

- Authentication.
- Users.
- Permissions.
- Companies.
- Branches.
- Devices.
- Synchronization.
- Backup.
- Reports.
- WhatsApp Integration.
- API.
- Audit Logs.
- Multi-Tenant Isolation.

### التقنية المقترحة

- NestJS.
- PostgreSQL.
- Prisma.
- Redis عند الحاجة.
- REST API.
- WebSocket/Realtime لاحقًا عند الحاجة.

---

# 3. المبدأ المعماري الأساسي: Offline-First

هذه قاعدة أساسية في المشروع:

> الإنترنت ليس شرطًا لتنفيذ العمليات اليومية.

عند انقطاع الإنترنت يستطيع المستخدم:

1. فتح النظام.
2. البحث عن المنتجات.
3. إنشاء فاتورة.
4. البيع.
5. الشراء.
6. تسجيل الدفع.
7. تسجيل المصروف.
8. تحديث المخزون.
9. طباعة الفاتورة.
10. حفظ كل العمليات محليًا.

وعند عودة الإنترنت تبدأ المزامنة تلقائيًا.

---

# 4. البنية العامة

```text
                    CLOUD SERVER
                 ┌────────────────┐
                 │    NestJS API  │
                 │  PostgreSQL    │
                 │  Sync Engine   │
                 └───────┬────────┘
                         │
                  Synchronization
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
      Android         Windows        Android
      Local DB        Local DB       Local DB
          │              │              │
          └──────────────┼──────────────┘
                         │
                   Offline Queue
```

---

# 5. بنية المزامنة

لا تتم مزامنة قاعدة البيانات بالكامل في كل مرة.

يجب استخدام **Operation/Event Based Synchronization**.

أمثلة العمليات:

```text
SaleCreated
SaleItemAdded
PaymentCreated
StockMoved
PurchaseCreated
CustomerUpdated
SupplierUpdated
ProductUpdated
ExpenseCreated
ReturnCreated
TransferCreated
```

كل عملية يجب أن تحتوي على معلومات مثل:

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
sync_status
```

---

# 6. دورة المزامنة

```text
Local Transaction
      ↓
Local Database
      ↓
Sync Queue
      ↓
Internet Available
      ↓
Push Operations
      ↓
Server Validation
      ↓
Commit
      ↓
ACK
      ↓
Pull Remote Changes
      ↓
Apply Locally
```

يجب أن تكون العملية Idempotent لمنع تكرار الفواتير أو المدفوعات عند إعادة الإرسال.

---

# 7. معالجة تعارض البيانات

يجب عدم الاعتماد على أسلوب:

```text
Stock = 7
```

عند العمل Offline على أكثر من جهاز.

الأفضل تسجيل الحركات:

```text
Stock + 2
Stock - 1
Stock + 5
```

بحيث يمكن إعادة بناء الرصيد بشكل صحيح.

يجب وجود:

- Conflict Detection.
- Conflict Resolution.
- Sync Retry.
- Failed Operations.
- Sync History.
- Manual Conflict Review عند الحاجة.

---

# 8. حالات المزامنة في الواجهة

يجب إظهار الحالة للمستخدم:

- 🟢 متصل — تمت المزامنة.
- 🟠 غير متصل — توجد عمليات بانتظار المزامنة.
- 🔵 جارٍ المزامنة.
- 🔴 فشل في المزامنة — إعادة المحاولة.

مثال:

```text
غير متصل
12 عملية بانتظار المزامنة
```

---

# 9. إدارة الشركات والفروع

يجب بناء النظام بطريقة تدعم مستقبلًا:

```text
Company
 ├── Branch 1
 │    ├── Warehouse
 │    ├── Users
 │    └── Devices
 │
 └── Branch 2
      ├── Warehouse
      ├── Users
      └── Devices
```

حتى لو كان الاستخدام الحالي لفرع واحد فقط.

---

# 10. Multi-Tenant

كل شركة يجب أن تكون معزولة عن الشركات الأخرى.

يجب أن ترتبط البيانات بمفتاح الشركة/المستأجر:

```text
tenant_id
```

ولا يسمح لأي مستخدم بالوصول إلى بيانات Tenant آخر.

---

# 11. المنتجات

كل منتج يجب أن يحتوي على ملف شامل.

```text
Product
──────────────
ID
SKU
Barcode
Arabic Name
English Name
Category
Brand
Model
Unit
Purchase Price
Sale Price
Wholesale Price
Minimum Price
Tax
Discount
Minimum Stock
Maximum Stock
Supplier
Warehouse
Image
Description
Serial Tracking
Batch Tracking
Expiry Tracking
Active
```

---

# 12. الباركود

يجب دعم:

- قراءة Barcode بكاميرا الهاتف.
- قارئ Barcode USB على Windows.
- البحث بالباركود.
- إنشاء Barcode.
- طباعة Barcode.
- ربط أكثر من Barcode بالصنف عند الحاجة.

تدفق البيع:

```text
Scan Barcode
    ↓
Product
    ↓
Price
    ↓
Quantity
    ↓
Add To Invoice
```

---

# 13. Serial Number

بعض المنتجات الإلكترونية تحتاج إلى تتبع السيريال.

مثال:

```text
Product:
MikroTik Router

Serial:
ABC123456
```

يجب معرفة:

- متى دخل الجهاز.
- من أي مورد.
- متى بيع.
- لمن بيع.
- الفاتورة المرتبطة.
- الضمان.
- حالة الجهاز.
- هل تم إرجاعه.

---

# 14. إدارة المخازن

يدعم النظام عدة مخازن:

```text
المحل الرئيسي
المستودع
المخزن
الفرع الأول
الفرع الثاني
```

ويجب دعم:

- رصيد المخزون.
- حركة المخزون.
- تحويل مخزني.
- استلام تحويل.
- إلغاء تحويل.
- تسوية مخزون.
- جرد.
- حد أدنى وحد أقصى.

---

# 15. التحويلات المخزنية

```text
Warehouse A
      ↓
Transfer
      ↓
Warehouse B
      ↓
Receive
```

يجب تسجيل:

- المنشئ.
- المعتمد.
- المستلم.
- التاريخ.
- الأصناف.
- الكميات.
- حالة التحويل.

---

# 16. الجرد

أنواع الجرد:

- جرد كامل.
- جرد جزئي.
- جرد حسب التصنيف.
- جرد حسب المخزن.
- جرد حسب العلامة التجارية.

مثال:

```text
النظام: 50
الفعلي: 47
الفرق: -3
```

يتم إنشاء Stock Adjustment مع سبب واضح، ولا يتم تعديل الرصيد مباشرة دون تسجيل حركة.

---

# 17. المبيعات

يجب أن تكون شاشة POS من أهم وأسرع الشاشات.

تدعم:

- البحث.
- Barcode.
- إضافة المنتجات.
- تعديل الكمية.
- حذف منتج.
- الخصم.
- اختيار السعر.
- اختيار العميل.
- الدفع.
- البيع الآجل.
- الدفع الجزئي.
- الطباعة.
- المشاركة.

مثال الحساب:

```text
الإجمالي
- الخصم
= الصافي

المدفوع
= المتبقي
```

---

# 18. أنواع المبيعات

## نقدي

```text
Total = 100
Paid = 100
Debt = 0
```

## آجل

```text
Total = 100
Paid = 0
Debt = 100
```

## جزئي

```text
Total = 100
Paid = 60
Debt = 40
```

---

# 19. الخصومات

يجب دعم:

- خصم على الصنف.
- خصم على الفاتورة.
- خصم نسبة.
- خصم مبلغ.
- خصم حسب العميل.
- خصم حسب الكمية.
- سعر تجزئة.
- سعر جملة.
- حد أدنى للسعر.
- صلاحيات اعتماد الخصومات الحساسة.

مثال:

```text
1 قطعة  = 100
10 قطع  = 90
50 قطعة = 80
```

---

# 20. المشتريات

تدفق الشراء:

```text
Purchase Invoice
      ↓
Supplier
      ↓
Items
      ↓
Purchase Cost
      ↓
Discount
      ↓
Paid
      ↓
Supplier Debt
      ↓
Stock Increase
```

---

# 21. مرتجع المبيعات

```text
Sale
 ↓
Return
 ↓
Stock Increase
 ↓
Refund / Customer Credit
```

يجب تسجيل:

- الفاتورة الأصلية.
- المنتج.
- الكمية.
- السبب.
- حالة المنتج.
- المبلغ المرتجع.
- المستخدم.
- التاريخ.

---

# 22. مرتجع المشتريات

```text
Purchase
 ↓
Supplier Return
 ↓
Stock Decrease
 ↓
Supplier Balance Adjustment
```

---

# 23. العملاء

ملف العميل:

```text
Customer
────────────
Name
Phone
Address
Credit Limit
Balance
Total Sales
Total Paid
Last Transaction
```

ويجب توفير كشف حساب كامل.

```text
الرصيد السابق
+ المبيعات
- المدفوعات
- المرتجعات
= الرصيد الحالي
```

---

# 24. الموردون

يدعم:

- ملف المورد.
- فواتير الشراء.
- المدفوعات.
- المرتجعات.
- الخصومات.
- كشف الحساب.
- الرصيد.
- تاريخ التعامل.

---

# 25. السندات

يجب دعم:

## سند قبض

استلام مبلغ من العميل أو أي طرف.

## سند صرف

صرف مبلغ لمورد أو مصروف.

## سند تحويل

تحويل بين الصناديق والحسابات.

## سند تسوية

لتسوية الأرصدة وفق قواعد النظام.

كل سند له رقم مرجعي وتسلسل وتاريخ ومستخدم ومصدر العملية.

---

# 26. الصناديق والحسابات

يدعم:

```text
الصندوق الرئيسي
صندوق الفرع
البنك
المحافظ الإلكترونية
حسابات أخرى
```

العمليات:

- قبض.
- صرف.
- تحويل.
- تسوية.

---

# 27. المصروفات

أمثلة:

- إيجار.
- كهرباء.
- إنترنت.
- رواتب.
- نقل.
- صيانة.
- أدوات مكتبية.
- مصروفات تشغيلية أخرى.

كل مصروف يجب أن يدخل في التقارير المالية.

---

# 28. المحاسبة المزدوجة

النظام يجب أن يكون قابلًا للعمل كمحاسبة حقيقية Double Entry.

مثال بيع نقدي:

```text
مدين:
الصندوق

دائن:
المبيعات
```

بيع آجل:

```text
مدين:
العملاء

دائن:
المبيعات
```

تكلفة البضاعة:

```text
مدين:
تكلفة المبيعات

دائن:
المخزون
```

هذا يتيح مستقبلًا:

- دفتر الأستاذ.
- ميزان المراجعة.
- قائمة الدخل.
- الأرباح والخسائر.
- الميزانية.
- حركة الحسابات.

---

# 29. حساب الأرباح

يجب ألا يحسب الربح بطريقة سطحية.

```text
Revenue
-
Cost of Goods Sold
=
Gross Profit

Gross Profit
-
Operating Expenses
=
Net Profit
```

يجب مراعاة:

- تكلفة الشراء.
- الخصومات.
- المرتجعات.
- المصروفات.
- تكلفة المخزون.
- اختلاف تكلفة الصنف.

ويجب تحديد سياسة تقييم المخزون قبل التنفيذ النهائي، مثل المتوسط المرجح أو FIFO، وفق متطلبات النظام.

---

# 30. عروض الأسعار

إضافة مهمة:

```text
Quotation
 ↓
Customer
 ↓
Products
 ↓
Discount
 ↓
Total
```

ثم:

```text
Quotation
 ↓
Convert
 ↓
Sales Invoice
```

بدون إعادة إدخال البيانات.

---

# 31. أوامر البيع والشراء

النظام قابل للتوسع لدعم:

- Sales Order.
- Purchase Order.

وهذا يسمح ببناء دورة عمل احترافية مستقبلًا.

---

# 32. التقارير

## تقارير المبيعات

- مبيعات اليوم.
- مبيعات الأسبوع.
- مبيعات الشهر.
- مبيعات حسب المستخدم.
- مبيعات حسب العميل.
- مبيعات حسب المنتج.
- مبيعات حسب التصنيف.
- أكثر المنتجات مبيعًا.
- أقل المنتجات مبيعًا.

## تقارير المشتريات

- المشتريات اليومية.
- الشهرية.
- حسب المورد.
- حسب المنتج.
- حسب المستخدم.

## تقارير المخزون

- المخزون الحالي.
- الأصناف الناقصة.
- الأصناف الراكدة.
- حركة صنف.
- قيمة المخزون.
- نتائج الجرد.
- التسويات.
- الأرباح المتوقعة.

## التقارير المالية

- الأرباح والخسائر.
- المصروفات.
- العملاء.
- الموردون.
- الديون.
- الصندوق.
- التدفقات النقدية.
- ميزان المراجعة.
- دفتر الأستاذ.

---

# 33. Dashboard

يجب أن تكون الشاشة الرئيسية احترافية وتعرض:

- مبيعات اليوم.
- صافي الربح.
- إجمالي الديون.
- النقدية.
- عدد الفواتير.
- مخزون منخفض.
- مستحقات العملاء.
- مستحقات الموردين.
- رسم بياني للمبيعات.
- آخر العمليات.
- التنبيهات.
- حالة المزامنة.

---

# 34. تصميم UI/UX

يجب إنشاء Design System قبل بناء جميع الشاشات.

يحدد:

- الألوان.
- Typography.
- Spacing.
- Buttons.
- Inputs.
- Cards.
- Tables.
- Charts.
- Dialogs.
- Bottom Sheets.
- Navigation.
- Icons.
- Empty States.
- Loading States.
- Error States.
- Offline States.

الواجهة يجب أن تكون:

- Modern.
- Enterprise.
- احترافية.
- واضحة.
- سريعة.
- RTL.
- Responsive.
- مناسبة للهاتف.
- مناسبة للتابلت.
- مناسبة لـ Windows.
- Light Mode.
- Dark Mode.

---

# 35. قاعدة مهمة لتصميم الواجهات

لا يتم اختراع واجهة من الذاكرة إذا كان هناك تصميم مرجعي معتمد.

لكل شاشة يجب إنشاء:

```text
Screen Specification
UI Reference
Data Model
States
Actions
Navigation
Permissions
API
Local DB
Sync Behavior
```

ويجب الحفاظ على الهوية البصرية الموحدة للنظام.

---

# 36. قائمة الشاشات الرئيسية

## Authentication

1. Splash.
2. Login.
3. Company Setup.
4. Device Setup.
5. User Selection.

## Dashboard

6. Main Dashboard.

## Sales

7. POS.
8. Sales Invoice.
9. Sales History.
10. Sales Return.

## Purchases

11. Purchase Invoice.
12. Purchase History.
13. Purchase Return.

## Inventory

14. Products.
15. Product Details.
16. Categories.
17. Brands.
18. Units.
19. Warehouses.
20. Stock Transfer.
21. Stock Count.
22. Stock Adjustment.
23. Stock Movement.

## Customers

24. Customers.
25. Customer Details.
26. Customer Statement.
27. Receipt Voucher.

## Suppliers

28. Suppliers.
29. Supplier Details.
30. Supplier Statement.
31. Payment Voucher.

## Finance

32. Cashboxes.
33. Expenses.
34. Income.
35. Transfers.
36. Accounts.
37. Journal Entries.

## Reports

38. Sales Reports.
39. Purchase Reports.
40. Inventory Reports.
41. Customer Reports.
42. Supplier Reports.
43. Profit Reports.
44. Financial Reports.

## Settings

45. Company.
46. Users.
47. Roles.
48. Permissions.
49. Printers.
50. WhatsApp.
51. Backup.
52. Synchronization.
53. System Settings.

يمكن أن يزيد العدد لاحقًا حسب الحاجة.

---

# 37. نظام الصلاحيات

أدوار مقترحة:

## Owner

كل الصلاحيات.

## Manager

الإدارة والعمليات الرئيسية.

## Cashier

المبيعات والتحصيل حسب الصلاحيات.

## Warehouse

المخزون والمشتريات.

## Accountant

المحاسبة والتقارير المالية.

## Viewer

مشاهدة فقط.

الصلاحيات يجب أن تكون Granular مثل:

```text
can_create_sale
can_edit_sale
can_delete_sale
can_return_sale
can_view_profit
can_view_purchase_price
can_edit_purchase_price
can_manage_products
can_manage_users
can_manage_settings
can_approve_discount
can_adjust_stock
```

---

# 38. Audit Log

كل عملية حساسة تسجل:

```text
User
Device
Action
Entity
Entity ID
Before
After
Timestamp
IP/Session عند الحاجة
```

مثال:

```text
User: Ahmed
Device: Windows-PC-01
Action: Deleted Sale
Invoice: INV-2026-00125
Time: 14:32
```

يفضل منع الحذف الحقيقي للعمليات المحاسبية الحساسة، واستبداله بالإلغاء/العكس المحاسبي مع الاحتفاظ بالسجل.

---

# 39. الطباعة

دعم:

- A4.
- A5.
- Thermal 58mm.
- Thermal 80mm.
- PDF.
- Barcode Labels.

أنواع المستندات:

- فاتورة بيع.
- فاتورة شراء.
- سند قبض.
- سند صرف.
- سند تحويل.
- سند مرتجع.
- كشف حساب.
- تقارير.
- ملصقات Barcode.

---

# 40. Print Preview

التدفق:

```text
Document
 ↓
Preview
 ↓
Select Printer / PDF
 ↓
Print / Save / Share
```

---

# 41. WhatsApp

يجب إنشاء طبقة مستقلة:

```text
WhatsApp Integration Layer
```

لدعم:

- فاتورة.
- كشف حساب.
- سند قبض.
- إشعار دفع.
- تذكير بالدين.
- تقرير.
- عرض سعر.

يجب تصميم التكامل بحيث يمكن استخدام WhatsApp Business API أو مزود رسمي مستقبلًا، بدل ربط النظام بطريقة يصعب تغييرها.

---

# 42. قوالب WhatsApp

يجب أن تكون الرسائل قابلة للتخصيص:

```text
اسم الشركة
اسم العميل
رقم الفاتورة
المبلغ
المدفوع
المتبقي
التاريخ
رقم التواصل
```

---

# 43. النسخ الاحتياطي

يجب توفير:

## Local Backup

نسخة محلية.

## Cloud Backup

نسخة على الخادم/التخزين السحابي.

## Automatic Backup

يومي/أسبوعي/شهري.

## Manual Backup

تصدير يدوي.

## Restore

استعادة آمنة مع التحقق من سلامة النسخة.

---

# 44. الأمان

المطلوب:

- HTTPS.
- JWT.
- Refresh Tokens.
- Password Hashing.
- Device Registration.
- Device Sessions.
- RBAC.
- Tenant Isolation.
- Audit Logs.
- Local Data Encryption للبيانات الحساسة.
- Secure Storage.
- حماية مفاتيح API.
- Rate Limiting.
- Validation على الخادم.
- منع التلاعب بالمبالغ والأسعار من العميل.

قاعدة مهمة:

> لا يتم اعتبار بيانات الجهاز المحلي مصدر ثقة مطلقًا عند المزامنة؛ الخادم يعيد التحقق من العمليات الحساسة.

---

# 45. قاعدة البيانات المركزية

الجداول/الكيانات الرئيسية المقترحة:

```text
companies
branches
users
roles
permissions
user_roles
devices

products
categories
brands
units
product_prices
product_barcodes

warehouses
stock
stock_movements
stock_transfers
stock_transfer_items
stock_adjustments
stock_counts

customers
customer_transactions

suppliers
supplier_transactions

sales
sale_items
sale_returns
sale_return_items

purchases
purchase_items
purchase_returns
purchase_return_items

payments
receipts
expenses
income
cashboxes
cash_transactions

accounts
journal_entries
journal_entry_lines

quotations
quotation_items
sales_orders
sales_order_items
purchase_orders
purchase_order_items

sync_operations
sync_conflicts
sync_cursors

audit_logs

notifications
whatsapp_messages
whatsapp_templates

printers
backups
settings
```

يجب مراجعة التصميم النهائي للعلاقات والفهارس والقيود قبل بدء التنفيذ.

---

# 46. قاعدة البيانات المحلية

على Android:

```text
Room
```

ويجب أن تحتوي على كل البيانات الضرورية للتشغيل Offline.

القاعدة المحلية ليست مجرد Cache، بل هي قاعدة تشغيل كاملة للعمليات التي يسمح بها النظام.

يجب الاحتفاظ بـ:

```text
Local Entities
Sync Queue
Sync Metadata
Pending Operations
Failed Operations
Local Settings
```

---

# 47. بنية التطبيق

```text
accounting-system/

├── android/
│
├── windows/
│
├── shared/
│   ├── domain/
│   ├── models/
│   ├── sync/
│   └── utilities/
│
├── backend/
│   ├── auth/
│   ├── products/
│   ├── inventory/
│   ├── sales/
│   ├── purchases/
│   ├── customers/
│   ├── suppliers/
│   ├── accounting/
│   ├── reports/
│   ├── sync/
│   └── whatsapp/
│
├── database/
│
├── design/
│
├── docs/
│
└── tests/
```

---

# 48. أسلوب البرمجة

يجب الالتزام بـ Clean Architecture:

```text
UI
 ↓
ViewModel / Presentation
 ↓
UseCase
 ↓
Repository
 ↓
Engine / Data Source
 ↓
Local DB / API
```

ويجب عدم وضع Business Logic المعقد داخل ViewModels.

يفضل التنظيم Package by Feature:

```text
features/
 ├── sales/
 ├── purchases/
 ├── inventory/
 ├── customers/
 ├── suppliers/
 ├── accounting/
 └── reports/
```

---

# 49. مراحل التنفيذ

## المرحلة 0 — التحليل والتصميم

المخرجات:

- Requirements.
- Business Rules.
- Architecture.
- Database Design.
- Navigation Map.
- Permission Matrix.
- Sync Architecture.
- UI Design System.

لا يبدأ التنفيذ البرمجي الكامل قبل اعتماد هذه المرحلة.

---

## المرحلة 1 — الأساس

- Project Structure.
- Authentication.
- Company.
- Users.
- Roles.
- Permissions.
- Local Database.
- Remote API.
- Security.
- Networking.

### معيار القبول

- تسجيل الدخول يعمل.
- الصلاحيات تعمل.
- قاعدة البيانات تعمل.
- API يعمل.
- التطبيق يعمل Offline في الوظائف الأساسية.

---

## المرحلة 2 — المنتجات والمخزون

- Products.
- Categories.
- Brands.
- Units.
- Warehouses.
- Stock.
- Stock Movement.
- Barcode.
- Serial Numbers.
- Inventory Count.
- Transfers.
- Adjustments.

### معيار القبول

يمكن إدخال منتج، شراؤه، نقله، جرده، معرفة رصيده وحركته، وكل ذلك دون كسر سجل المخزون.

---

## المرحلة 3 — المبيعات

- POS.
- Sales Invoice.
- Payments.
- Discounts.
- Customers.
- Customer Debt.
- Sales Return.
- Receipt Voucher.

### معيار القبول

إنشاء فاتورة نقدية وآجلة وجزئية، تحديث المخزون، تسجيل الحساب، إنشاء السند، وإمكانية الطباعة.

---

## المرحلة 4 — المشتريات

- Purchase Invoice.
- Suppliers.
- Supplier Debt.
- Purchase Return.
- Payment Voucher.

### معيار القبول

شراء منتج يرفع المخزون ويسجل حساب المورد والتكلفة بصورة صحيحة.

---

## المرحلة 5 — المحاسبة

- Cashboxes.
- Expenses.
- Income.
- Accounts.
- Journal Entries.
- Ledger.
- Trial Balance.
- Profit & Loss.

### معيار القبول

كل عملية مالية رئيسية تنتج أثرًا محاسبيًا متسقًا وقابلًا للمراجعة.

---

## المرحلة 6 — التقارير

- Dashboard.
- Sales Reports.
- Purchase Reports.
- Inventory Reports.
- Customer Reports.
- Supplier Reports.
- Profit Reports.
- Financial Reports.

---

## المرحلة 7 — الطباعة

- A4.
- A5.
- 58mm.
- 80mm.
- PDF.
- Barcode Labels.
- Print Preview.

---

## المرحلة 8 — WhatsApp

- Invoice Sharing.
- Customer Statement.
- Supplier Statement.
- Receipt.
- Payment Reminder.
- Reports.
- Templates.

---

## المرحلة 9 — Offline Sync

هذه مرحلة مستقلة ومهمة جدًا.

تشمل:

- Sync Engine.
- Push.
- Pull.
- Queue.
- Retry.
- Conflict Detection.
- Conflict Resolution.
- Sync History.
- Device Registration.
- Network Detection.

---

## المرحلة 10 — Windows

بناء واجهة Desktop كاملة:

- Dashboard.
- POS.
- Products.
- Inventory.
- Customers.
- Suppliers.
- Accounting.
- Reports.
- Printing.
- Settings.

مع تحسين تجربة الماوس والكيبورد والشاشات الكبيرة.

---

## المرحلة 11 — الاختبارات

### Functional Testing

اختبار كل وظيفة.

### Database Testing

سلامة العلاقات والقيود.

### Sync Testing

اختبار المزامنة بين الأجهزة.

### Offline Testing

تشغيل كامل بدون الإنترنت.

### Security Testing

اختبار الصلاحيات والتلاعب.

### Performance Testing

اختبار آلاف المنتجات والفواتير.

### Crash Recovery

اختبار إغلاق التطبيق أو انقطاع الكهرباء أثناء العمليات.

---

# 50. اختبار Offline/Online الأساسي

يجب تنفيذ السيناريو التالي:

```text
10:00
Windows Online

10:05
Android Offline

10:10
Android ينفذ 3 مبيعات

10:12
Windows ينفذ عملية شراء

10:15
Windows Offline

10:20
Android يعود Online

10:25
Windows يعود Online
```

ثم يجب التحقق من:

```text
المخزون صحيح
المبيعات صحيحة
المشتريات صحيحة
الأرباح صحيحة
الديون صحيحة
الصندوق صحيح
لا توجد عمليات مكررة
لا توجد بيانات مفقودة
```

---

# 51. الأداء

الأهداف الأولية:

```text
Dashboard < 1 ثانية بعد توفر البيانات المحلية
POS < 1 ثانية
البحث المحلي سريع جدًا
إضافة منتج للسلة فورية
العمل Offline بالكامل
المزامنة في الخلفية
```

يجب استخدام:

- Indexes.
- Pagination.
- Local Search.
- Background Sync.
- Lazy Loading.
- Caching حيث يلزم.
- عدم تحميل بيانات ضخمة بلا حاجة.

---

# 52. MVP

النسخة الأولى القابلة للاستخدام يجب أن تشمل:

```text
1. تسجيل الدخول
2. Dashboard
3. المنتجات
4. المخزون
5. العملاء
6. الموردون
7. المبيعات
8. المشتريات
9. القبض
10. الصرف
11. المصروفات
12. التقارير الأساسية
13. الطباعة
14. Offline
15. Sync
```

بعد استقرار MVP:

```text
المحاسبة المتقدمة
WhatsApp
الفروع
Serial Tracking المتقدم
الجرد المتقدم
التقارير المتقدمة
SaaS
```

---

# 53. معايير عدم السماح بالانتقال بين المراحل

لا ينتقل المشروع إلى المرحلة التالية إلا بعد:

- Build PASS.
- Runtime PASS.
- Database PASS.
- RTL PASS.
- UI Review PASS.
- Offline Test PASS عند الحاجة.
- Sync Test PASS عند الحاجة.
- No Critical Bugs.
- توثيق المرحلة.
- مراجعة الملفات التي تم تعديلها.
- التأكد من عدم حذف أو تغيير أجزاء غير مرتبطة.

---

# 54. قواعد التعامل مع وكلاء الذكاء الاصطناعي

يجب إعطاء الوكيل مهام صغيرة ومحددة.

لا يستخدم Prompt واحد لبناء النظام كاملًا.

كل مهمة يجب أن تحتوي على:

```text
Objective
Context
Files To Inspect
Files Allowed To Change
Implementation Rules
UI Reference
Business Rules
Acceptance Criteria
Tests
Expected Output
```

والوكيل ممنوع من:

- اختراع Business Logic غير موثق.
- تغيير Architecture بدون موافقة.
- حذف ملفات غير مرتبطة.
- إعادة تصميم واجهة معتمدة من نفسه.
- تغيير أسماء الحقول دون سبب.
- تجاوز الاختبارات.
- الادعاء بنجاح ميزة لم يتم اختبارها.

---

# 55. نظام توثيق المشروع

الملفات الرئيسية:

```text
00_MASTER_PLAN.md
01_PRODUCT_REQUIREMENTS.md
02_ARCHITECTURE.md
03_DATABASE.md
04_ACCOUNTING_ENGINE.md
05_INVENTORY.md
06_SALES.md
07_PURCHASES.md
08_CUSTOMERS_SUPPLIERS.md
09_SYNC_ENGINE.md
10_OFFLINE_MODE.md
11_REPORTS.md
12_PRINTING.md
13_WHATSAPP.md
14_SECURITY.md
15_PERMISSIONS.md
16_UI_DESIGN_SYSTEM.md
17_ANDROID.md
18_WINDOWS.md
19_TESTING.md
20_ROADMAP.md
```

---

# 56. قاعدة مرجعية للواجهة

إذا توفرت صور أو ملفات تصميم أو واجهات TSX مرجعية:

1. يتم اعتبارها مصدر التصميم.
2. يتم تحليلها أولًا.
3. لا يتم اختراع واجهة بديلة دون سبب.
4. يجب الحفاظ على:
   - النصوص.
   - الأيقونات.
   - الترتيب.
   - المسافات.
   - الألوان.
   - الحالات.
   - المكونات.
5. بعد اعتماد التصميم يتم تنفيذه Native.

---

# 57. النتيجة المستهدفة

النظام النهائي يجب أن يسمح للمستخدم بالقيام بدورة العمل اليومية بالكامل:

```text
فتح النظام
    ↓
Dashboard
    ↓
بيع
    ↓
خصم
    ↓
دفع
    ↓
فاتورة
    ↓
طباعة / WhatsApp
    ↓
تحديث المخزون
    ↓
تسجيل المحاسبة
    ↓
تحديث حساب العميل
    ↓
المزامنة
    ↓
كل الأجهزة
```

وفي نهاية اليوم:

```text
Daily Report
    ↓
Sales
Purchases
Expenses
Profit
Cash
Debt
Stock
    ↓
PDF / Print / WhatsApp
```

---

# 58. الرؤية المستقبلية

يجب تصميم النظام ليكون قابلًا للتوسع إلى:

- عدة فروع.
- عدة مخازن.
- عدة أجهزة.
- عدة مستخدمين.
- Multi-Tenant SaaS.
- تطبيق Android.
- تطبيق Windows.
- Tablet.
- Web Admin مستقبلًا.
- WhatsApp Business Integration.
- Barcode Hardware.
- Thermal Printers.
- Cloud Backup.
- Advanced Accounting.
- Advanced Analytics.
- Notifications.
- API Integrations.

---

# 59. المبدأ النهائي للمشروع

> **نبني النظام كمنتج حقيقي قابل للاستخدام والإطلاق، وليس Prototype.**

الأولوية بالترتيب:

```text
1. صحة البيانات
2. صحة المحاسبة
3. صحة المخزون
4. المزامنة
5. الأمان
6. الأداء
7. تجربة المستخدم
8. جمال الواجهة
9. التكاملات
10. التوسع
```

ولا قيمة لواجهة جميلة إذا كانت الأرقام والمخزون والمحاسبة غير صحيحة.

---

# 60. خارطة المشروع النهائية

```text
                     ┌─────────────────────┐
                     │  ACCOUNTING SYSTEM  │
                     └──────────┬──────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
       Android               Windows               Backend
          │                     │                     │
       Compose               Compose              NestJS
          │                     │                     │
        Room                 SQLite              PostgreSQL
          │                     │                     │
          └─────────────────────┼─────────────────────┘
                                │
                         SYNC ENGINE
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
        Sales               Inventory             Accounting
          │                     │                     │
          └─────────────────────┼─────────────────────┘
                                │
                             Reports
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
                 Printing                WhatsApp
```

---

# 61. تعريف النجاح

يعتبر المشروع ناجحًا عندما يستطيع المستخدم:

- إدارة المنتجات.
- إدارة المخازن.
- البيع والشراء.
- إدارة العملاء والموردين.
- تسجيل الديون.
- تسجيل القبض والصرف.
- إدارة المصروفات.
- تنفيذ المرتجعات.
- معرفة المخزون.
- حساب الأرباح.
- استخراج التقارير.
- طباعة المستندات.
- إرسال المستندات.
- العمل بدون إنترنت.
- المزامنة بين Android وWindows.
- العمل على أكثر من جهاز.
- استعادة البيانات بعد الأعطال.
- معرفة كل عملية ومن قام بها.
- الحفاظ على سلامة الحسابات والمخزون.

**هذا المستند هو المرجع الرئيسي Master Plan، وأي تنفيذ لاحق يجب أن يكون تابعًا له، مع تحديثه عند اعتماد قرارات معمارية أو تجارية جديدة.**
