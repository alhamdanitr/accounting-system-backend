# Accounting System Backend

الخادم المركزي لنظام محاسبي وإدارة مخزون متعدد الشركات والفروع، مبني وفق خطة المشروع المعتمدة ومبدأ **Offline-First**.

## الإنجازات الحالية (المراحل 1 إلى 10)

تم اكتمال وبناء واختبار الوحدات التالية بنجاح بنسبة 100%:

| الوحدة | المسار الأساسي | الوظيفة الرئيسية |
|---|---|---|
| **Company Module** | `/api/v1/companies` | إنشاء وإدارة الشركات والفروع والمستودعات مع عزل البيانات (`tenantId`) |
| **Users Module** | `/api/v1/users` | تسجيل وإدارة المستخدمين والأدوار وصلاحيات الوصول |
| **Auth Module** | `/api/v1/auth/login` | مصادقة المستخدمين عبر JWT وتشفير كلمات المرور وتسجيل الأجهزة للمزامنة |
| **Products Module** | `/api/v1/products` | إدارة المنتجات، التصنيفات، العلامات التجارية، وحدات القياس، والباركود |
| **Inventory Module** | `/api/v1/inventory` | إدارة المستودعات، حركات المخزون (وارد، صادر، تسوية)، وتتبع الأرصدة |
| **Sales & POS Module** | `/api/v1/sales` | إدارة العملاء، فواتير المبيعات (نقدية/آجلة)، نقاط البيع، الخصومات، والخصم التلقائي للمخزون |
| **Purchases Module** | `/api/v1/purchases` | إدارة الموردين، فواتير الشراء، تتبع ديون الموردين، والزيادة التلقائية للمخزون (`Stock IN`) |
| **Accounting Module** | `/api/v1/accounting` | دليل الحسابات، المحرك المحاسبي لقيود اليومية المزدوجة (مدين/دائن)، إدارة الصناديق، والمصروفات |
| **Reports Module** | `/api/v1/reports` | لوحة التحكم (Dashboard)، تقارير المبيعات، تقارير المخزون (تنبيهات انخفاض المخزون)، والملخصات المالية (الأرباح) |
| **Printing Module** | `/api/v1/printing` | محرك توليد فواتير المبيعات والمستندات بصيغة PDF وجاهزية الطباعة |
| **WhatsApp Module** | `/api/v1/whatsapp` | التكامل مع خدمات الواتساب لإرسال فواتير المبيعات وكشوفات الحساب وتنبيهات الديون |
| **Sync Module** | `/api/v1/sync` | محرك المزامنة المبني على العمليات (Push & Pull) لدعم العمل بلا إنترنت (Offline-First) وضمان Idempotency |
| **Audit Module** | `/api/v1/audit` | سجل التدقيق لتتبع العمليات والأحداث الحساسة في النظام |
| **Settings Module** | `/api/v1/settings` | إدارة إعدادات الشركة والنظام العامة |
| **Health Module** | `/api/v1/health` | فحص صحة الخادم |

## الإعداد والتشغيل المحلي

1. انسخ ملف البيئة:
   ```bash
   cp .env.example .env
   ```
2. تثبيت التبعيات وتوليد Prisma Client:
   ```bash
   pnpm install
   pnpm exec prisma generate
   ```
3. تشغيل الاختبارات الشاملة (Unit & E2E):
   ```bash
   pnpm run build
   DATABASE_URL="file:./test.db" pnpm test:e2e
   pnpm run test
   ```
4. تشغيل الخادم في وضع التطوير:
   ```bash
   pnpm run start:dev
   ```

## المستودع الرسمي
[GitHub Repository](https://github.com/alhamdanitr/accounting-system-backend)
