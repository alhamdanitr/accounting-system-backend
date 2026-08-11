# Accounting System Backend

الخادم المركزي لنظام محاسبي وإدارة مخزون متعدد الشركات والفروع، مبني وفق خطة المشروع المعتمدة ومبدأ **Offline-First**.

## الإنجازات الحالية (المرحلة الأولى والثانية)

تم اكتمال وبناء واختبار الوحدات التالية بنجاح بنسبة 100%:

| الوحدة | المسار الأساسي | الوظيفة الرئيسية |
|---|---|---|
| **Company Module** | `/api/v1/companies` | إنشاء وإدارة الشركات والفروع والمستودعات مع عزل البيانات (`tenantId`) |
| **Users Module** | `/api/v1/users` | تسجيل وإدارة المستخدمين والأدوار وصلاحيات الوصول |
| **Auth Module** | `/api/v1/auth/login` | مصادقة المستخدمين عبر JWT وتشفير كلمات المرور وتسجيل الأجهزة للمزامنة |
| **Products Module** | `/api/v1/products` | إدارة المنتجات، التصنيفات، العلامات التجارية، وحدات القياس، والباركود |
| **Inventory Module** | `/api/v1/inventory` | إدارة المستودعات، حركات المخزون (وارد، صادر، تسوية)، وتتبع الأرصدة |
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
