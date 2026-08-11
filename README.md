# Accounting System Backend

الخادم المركزي لنظام محاسبي وإدارة مخزون متعدد الشركات والفروع، مبني وفق خطة المشروع المعتمدة ومبدأ **Offline-First**. هذا المستودع هو نقطة البداية للـ API المركزي الذي ستتصل به تطبيقات Android وWindows.

## النطاق الحالي

تتضمن هذه النسخة التأسيسية ما يلي:

| المجال | الحالة | التفاصيل |
|---|---|---|
| NestJS API | جاهز | TypeScript، بادئة API هي `/api/v1`، وتحقق DTO عالمي |
| PostgreSQL | جاهز محلياً | تشغيل اختياري عبر Docker Compose |
| Prisma | جاهز | مخطط أولي متعدد المستأجرين مع توليد Prisma Client |
| الشركات والفروع | مخطط أولي | عزل البيانات باستخدام `tenantId` |
| المستخدمون والأدوار | مخطط أولي | RBAC مع صلاحيات دقيقة قابلة للتوسع |
| الأجهزة والجلسات | مخطط أولي | تسجيل الأجهزة وإبطال Refresh Tokens |
| المزامنة | مخطط أولي | عمليات Idempotent، حالات المزامنة، التعارضات، والمؤشرات |
| التدقيق | مخطط أولي | Audit Logs للعمليات الحساسة |
| فحص الصحة | جاهز | `GET /api/v1/health` |

## المتطلبات

- Node.js 20 أو أحدث.
- pnpm.
- Docker وDocker Compose لتشغيل PostgreSQL محلياً.

## الإعداد المحلي

انسخ ملف البيئة النموذجي، ثم شغّل قاعدة البيانات:

```bash
cp .env.example .env
docker compose up -d postgres
pnpm install
pnpm exec prisma generate
pnpm exec prisma migrate dev --name init
```

بعد ذلك شغّل الخادم:

```bash
pnpm run start:dev
```

ويصبح فحص الصحة متاحاً على:

```text
GET http://localhost:3000/api/v1/health
```

## أوامر التحقق

```bash
pnpm exec prisma format
DATABASE_URL="postgresql://accounting:accounting_dev_password@localhost:5432/accounting_system?schema=public" pnpm exec prisma validate
pnpm exec prisma generate
pnpm run build
pnpm test --runInBand
```

## قواعد معمارية ملزمة

يجب أن تلتزم التغييرات القادمة بالقواعد التالية:

1. كل البيانات التجارية مرتبطة بـ `tenantId` ولا يجوز تسريب بيانات شركة إلى شركة أخرى.
2. لا يتم تعديل أرصدة المخزون مباشرة؛ كل تغيير يمر عبر حركة مخزون قابلة للتدقيق.
3. العمليات الحساسة لا تُحذف فعلياً؛ تستخدم الإلغاء أو العكس المحاسبي.
4. الخادم يعيد التحقق من الصلاحيات والأسعار والمبالغ ولا يثق في بيانات العميل.
5. المزامنة تعتمد على العمليات والأحداث، مع Idempotency وRetry وConflict Review.
6. لا تنتقل أي مرحلة إلى التالية قبل نجاح البناء والتشغيل والاختبارات وتحديث التوثيق.

## البنية الحالية

```text
src/
├── health/       # فحص صحة API
└── prisma/       # اتصال Prisma المشترك
prisma/
└── schema.prisma # مخطط الشركات والمستخدمين والصلاحيات والمزامنة
```

## المرجع الوظيفي

تمت مواءمة هذا المستودع مع خطة النظام المحاسبي والمواصفات الموجودة في ملفات المشروع، ولا سيما مبادئ Offline-First وMulti-Tenant وOperation-Based Synchronization.

## الترخيص

المشروع خاص ومملوك لصاحب المستودع.
