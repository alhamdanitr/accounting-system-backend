# Database Migration Policy

يستخدم Backend الآن `prisma migrate deploy` في الإنتاج، ولا يجوز استخدام `prisma db push` في بيئة الإنتاج لأنه لا ينشئ سجلاً قابلاً للتدقيق لتاريخ تغييرات المخطط.

## قاعدة جديدة

بعد ضبط `DATABASE_URL`:

```bash
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
```

## قاعدة موجودة مسبقاً

يجب أخذ نسخة احتياطية والتحقق من المخطط أولاً. إذا كانت القاعدة مطابقة فعلياً للمخطط الحالي ولم يكن جدول `_prisma_migrations` موجوداً أو كانت البيئة تعتمد سابقاً على `db push`، فلا يجوز تشغيل migration baseline عشوائياً. يجب اعتماد baseline بعد مراجعة DBA عبر:

```bash
pnpm exec prisma migrate resolve --applied 20260814031500_initial_baseline
```

ثم تطبيق migrations اللاحقة. إذا كانت القاعدة غير مطابقة، يجب إنشاء migration انتقالية مخصصة بعد مقارنة `prisma migrate diff`، واختبارها على نسخة استعادة قبل الإنتاج.

## معيار القبول

لا يُعتمد نشر قاعدة البيانات قبل نجاح النسخ الاحتياطي، وتطبيق migration على قاعدة اختبار نظيفة، واختبار rollback التشغيلي عبر الاستعادة من النسخة الاحتياطية. لا تُحذف القيود أو البيانات المحاسبية الحساسة لإخفاء فشل migration.
