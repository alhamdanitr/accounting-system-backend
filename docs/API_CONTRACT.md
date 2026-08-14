# Accounting System API Contract

هذا الملف هو المرجع التشغيلي لعقد Backend بين الخادم وعملي Android وWindows. جميع المسارات تستخدم البادئة `/api/v1`، وجميع المسارات المحمية تتطلب `Authorization: Bearer <accessToken>`.

## قواعد متعددة الشركات

يُؤخذ `tenantId` الموثوق من JWT داخل الخادم، ويُستخدم للتحقق من أي `tenantId` يرسله العميل. رفض عدم التطابق يعيد `403 Forbidden`. لا يجوز للعميل اختيار شركة مختلفة عن الشركة الموجودة في الجلسة.

## الصلاحيات الأساسية

| الوظيفة             | الصلاحية                             |
| ------------------- | ------------------------------------ |
| المنتجات            | `products.view`, `products.manage`   |
| المخزون والمستودعات | `inventory.view`, `inventory.manage` |
| المبيعات            | `sales.view`, `sales.create`         |
| المشتريات           | `purchases.view`, `purchases.create` |
| التقارير            | `reports.view`                       |
| المزامنة            | `sync.push`, `sync.pull`             |
| WhatsApp            | `whatsapp.send`                      |

## عقد المزامنة

### Push

```text
POST /api/v1/sync/push
```

يحتوي الطلب على `tenantId` و`deviceId` وقائمة `operations`. كل عملية يجب أن تحتوي على `idempotencyKey` و`entityType` و`entityId` و`operationType` و`payload` بصيغة JSON.

الأنواع التي يطبقها Backend مركزيًا هي `PRODUCT` و`CUSTOMER` و`SALE` و`PURCHASE`. لا يضع العميل منطق الحساب أو المخزون أو القيود المحاسبية؛ يرسل البيانات التجارية فقط ويطبق Backend القواعد المركزية.

حالات نتيجة العملية هي:

| الحالة                        | المعنى                                   | سلوك العميل                                     |
| ----------------------------- | ---------------------------------------- | ----------------------------------------------- |
| `SYNCED`                      | طبقت العملية بنجاح                       | إزالة العملية من queue وتسجيل ACK.              |
| `DUPLICATE`                   | وصلت العملية سابقًا بنفس idempotency key | اعتبارها مكتملة دون إعادة التطبيق.              |
| `CONFLICT`                    | تعارض تجاري أو نسخة غير قابلة للدمج      | نقلها إلى سجل التعارضات وعدم retry بلا نهاية.   |
| `FAILED` مع `retryable=true`  | فشل مؤقت                                 | إبقاؤها في queue مع backoff.                    |
| `FAILED` مع `retryable=false` | فشل دائم                                 | حفظ الخطأ للمراجعة وعدم إعادة الإرسال تلقائيًا. |

### Pull

```text
GET /api/v1/sync/pull?tenantId=<tenantId>&deviceId=<deviceId>&cursor=<cursor>&limit=<limit>
```

يعيد العمليات بترتيب `sequence` تصاعدي مع `nextCursor` و`hasMore`. لا يُحرّك العميل cursor إلا بعد حفظ العمليات الواردة في Remote Inbox أو تطبيقها بنجاح.

## تقارير المبيعات اليومية

```text
GET /api/v1/reports/sales/daily/:tenantId?warehouseId=<warehouseId>&date=YYYY-MM-DD
```

يتحقق Backend من أن المستودع نشط وينتمي إلى الشركة، ويستبعد الفواتير الملغاة، ثم يعيد `summary` وقائمة `sales` لليوم المحدد. يجب أن يأخذ Windows وAndroid `tenantId` و`warehouseId` من الجلسة والسياق الموثوق، لا من إدخال يسمح بعبور الشركات.

## توثيق OpenAPI

بعد تشغيل Backend يمكن الوصول إلى واجهة Swagger من:

```text
/docs
```

وإلى ملف JSON من:

```text
/docs/openapi.json
```

يُحدّث هذا العقد عند إضافة مسار أو تغيير payload، ويجب تشغيل اختبارات الوحدة وE2E قبل دفع أي تغيير للعملاء.

## envelope موحد للاستجابات

كل استجابة صادرة من controller تستخدم envelope ثابتًا. لا يعتمد العميل على حقول الأعمال في المستوى الأعلى من JSON؛ يقرأ النتيجة من `data` ويستخدم `meta.requestId` للتتبع.

### نجاح

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-08-14T17:00:00.000Z",
    "path": "/api/v1/example"
  }
}
```

### خطأ متوقع من العميل

```json
{
  "success": false,
  "error": {
    "code": "HTTP_400",
    "message": "Validation failed",
    "details": {}
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-08-14T17:00:00.000Z",
    "path": "/api/v1/example"
  }
}
```

الأخطاء الداخلية ذات الحالة `5xx` لا تكشف تفاصيل الاستثناء أو stack trace للعميل، وتستخدم الرسالة العامة `Internal server error` مع `requestId` للتشخيص الآمن. أما أخطاء `4xx` فتحافظ على رسالة التحقق الآمنة، ويكون `code` مستقرًا وقابلًا للمعالجة من العملاء.
